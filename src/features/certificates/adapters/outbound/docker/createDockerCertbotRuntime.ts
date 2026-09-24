import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';

import type { TlsPreflightCheck } from '../../../../../types/preflight.js';
import type { CertificateRuntimePort } from '../../../application/ports/outbound/certificateRuntimePort.js';

interface ProcessResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface CreateDockerCertbotRuntimeOptions {
  readonly dockerExecutable?: string;
  readonly image?: string;
  readonly runProcessAsync?: (executable: string, args: readonly string[]) => Promise<ProcessResult>;
  readonly volumeName?: string;
}

const DEFAULT_IMAGE = 'certbot/certbot:v5.8.0';
const DEFAULT_VOLUME = 'caddy-data';
const DATA_ROOT = '/data/certbot';
const WEBROOT = `${DATA_ROOT}/webroot`;
const CONFIG_DIR = `${DATA_ROOT}/config`;
const WORK_DIR = `${DATA_ROOT}/work`;
const LOGS_DIR = `${DATA_ROOT}/logs`;

/*** Create the Docker-backed Certbot adapter for certificate lifecycle and HTTP-01 preflight. */
export function createDockerCertbotRuntime(
  options: CreateDockerCertbotRuntimeOptions = {},
): CertificateRuntimePort {
  const dockerExecutable = options.dockerExecutable ?? 'docker';
  const image = options.image ?? DEFAULT_IMAGE;
  const volumeName = options.volumeName ?? DEFAULT_VOLUME;
  const runProcessAsync = options.runProcessAsync ?? runProcess;

  return {
    async issueAsync(input) {
      await ensureVolumeLayoutAsync({ dockerExecutable, image, runProcessAsync, volumeName });
      await runCheckedAsync(
        dockerExecutable,
        [
          ...createDockerPrefix(volumeName, image),
          'certonly',
          '--webroot',
          '--webroot-path',
          WEBROOT,
          '--config-dir',
          CONFIG_DIR,
          '--work-dir',
          WORK_DIR,
          '--logs-dir',
          LOGS_DIR,
          '--non-interactive',
          '--agree-tos',
          '--email',
          input.email,
          '--cert-name',
          input.domain,
          '-d',
          input.domain,
          ...(input.staging ? ['--test-cert'] : []),
          ...(input.forceRenewal ? ['--force-renewal'] : []),
        ],
        runProcessAsync,
      );
    },
    preflightAsync: ({ domains }) =>
      runPreflightAsync({ dockerExecutable, domains, image, runProcessAsync, volumeName }),
    async renewAsync(input) {
      await ensureVolumeLayoutAsync({ dockerExecutable, image, runProcessAsync, volumeName });
      await runCheckedAsync(
        dockerExecutable,
        [
          ...createDockerPrefix(volumeName, image),
          'renew',
          '--config-dir',
          CONFIG_DIR,
          '--work-dir',
          WORK_DIR,
          '--logs-dir',
          LOGS_DIR,
          ...(input.dryRun ? ['--dry-run'] : []),
        ],
        runProcessAsync,
      );
    },
    async statusAsync() {
      await ensureVolumeLayoutAsync({ dockerExecutable, image, runProcessAsync, volumeName });
      return (
        await runCheckedAsync(
          dockerExecutable,
          [
            ...createDockerPrefix(volumeName, image),
            'certificates',
            '--config-dir',
            CONFIG_DIR,
            '--work-dir',
            WORK_DIR,
            '--logs-dir',
            LOGS_DIR,
          ],
          runProcessAsync,
        )
      ).stdout;
    },
  };
}

/*** Run the Docker, volume, DNS, and live HTTP-01 roundtrip checks required before issuance. */
async function runPreflightAsync(input: {
  readonly dockerExecutable: string;
  readonly domains: readonly string[];
  readonly image: string;
  readonly runProcessAsync: NonNullable<CreateDockerCertbotRuntimeOptions['runProcessAsync']>;
  readonly volumeName: string;
}): Promise<readonly TlsPreflightCheck[]> {
  const docker = await probeCommandAsync(
    input.dockerExecutable,
    ['version', '--format', '{{.Server.Version}}'],
    input.runProcessAsync,
  );
  const volume = docker.ok
    ? await probeCommandAsync(
        input.dockerExecutable,
        ['volume', 'inspect', input.volumeName],
        input.runProcessAsync,
      )
    : { ok: false, detail: 'Docker daemon is unavailable.' };

  const baseChecks: TlsPreflightCheck[] = [
    check('docker', 'Docker daemon', docker, 'Start Docker and ensure the current user may access its socket.'),
    check(
      'volume',
      `Docker volume ${input.volumeName}`,
      volume,
      `Create it with: docker volume create ${input.volumeName}`,
    ),
  ];

  const dnsChecks = await Promise.all(input.domains.map(probeDnsAsync));
  if (!docker.ok || !volume.ok) return [...baseChecks, ...dnsChecks];

  const token = `ankh-tls-${randomUUID().replaceAll('-', '')}`;
  const prepared = await writeChallengeAsync(input, token);
  const imageCheck = check(
    'webroot',
    'Certbot image and HTTP-01 webroot',
    prepared,
    `Ensure ${input.volumeName} is writable and Docker can pull ${input.image}.`,
  );
  if (!prepared.ok) return [...baseChecks, imageCheck, ...dnsChecks];

  const httpChecks = await Promise.all(input.domains.map((domain) => probeHttpAsync(domain, token)));
  await removeChallengeAsync(input, token);
  return [...baseChecks, imageCheck, ...dnsChecks, ...httpChecks];
}

/*** Resolve one hostname to prove public DNS exists before attempting ACME validation. */
async function probeDnsAsync(domain: string): Promise<TlsPreflightCheck> {
  try {
    const addresses = await lookup(domain, { all: true });
    return {
      id: `dns:${domain}`,
      label: `DNS ${domain}`,
      message: `Resolves to ${addresses.map(({ address }) => address).join(', ')}.`,
      status: 'pass',
    };
  } catch (error) {
    return {
      id: `dns:${domain}`,
      label: `DNS ${domain}`,
      message: getErrorMessage(error),
      status: 'fail',
      tip: 'Create an A/AAAA record that resolves this hostname to the public TLS server.',
    };
  }
}

/*** Fetch the exact challenge token over plain HTTP to verify DNS, port 80, routing, and webroot. */
async function probeHttpAsync(domain: string, token: string): Promise<TlsPreflightCheck> {
  try {
    const response = await fetch(`http://${domain}/.well-known/acme-challenge/${token}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    const body = await response.text();
    const ok = response.status === 200 && body.trim() === token;
    return {
      id: `http01:${domain}`,
      label: `HTTP-01 ${domain}:80`,
      message: ok
        ? 'Challenge roundtrip succeeded.'
        : `Expected token over HTTP but received status ${response.status}.`,
      status: ok ? 'pass' : 'fail',
      ...(ok
        ? {}
        : {
            tip: 'Expose /.well-known/acme-challenge/* on port 80 without an HTTPS redirect and serve the configured Certbot webroot.',
          }),
    };
  } catch (error) {
    return {
      id: `http01:${domain}`,
      label: `HTTP-01 ${domain}:80`,
      message: getErrorMessage(error),
      status: 'fail',
      tip: 'Verify DNS points here, TCP/80 is open, and the web server serves the Certbot challenge webroot.',
    };
  }
}

/*** Write one deterministic challenge file through the shared Docker volume. */
async function writeChallengeAsync(
  input: Parameters<typeof runPreflightAsync>[0],
  token: string,
): Promise<{ readonly ok: boolean; readonly detail: string }> {
  return probeCommandAsync(
    input.dockerExecutable,
    [
      'run',
      '--rm',
      '--pull=missing',
      '--entrypoint',
      'sh',
      '-v',
      `${input.volumeName}:/data`,
      input.image,
      '-c',
      `mkdir -p ${WEBROOT}/.well-known/acme-challenge && printf '%s' '${token}' > ${WEBROOT}/.well-known/acme-challenge/${token}`,
    ],
    input.runProcessAsync,
  );
}

/*** Remove a temporary HTTP-01 preflight token from the shared volume. */
async function removeChallengeAsync(
  input: Parameters<typeof runPreflightAsync>[0],
  token: string,
): Promise<void> {
  await input.runProcessAsync(input.dockerExecutable, [
    'run',
    '--rm',
    '--entrypoint',
    'sh',
    '-v',
    `${input.volumeName}:/data`,
    input.image,
    '-c',
    `rm -f ${WEBROOT}/.well-known/acme-challenge/${token}`,
  ]);
}

/*** Build a pass/fail checklist item from a process probe. */
function check(
  id: string,
  label: string,
  probe: { readonly ok: boolean; readonly detail: string },
  tip: string,
): TlsPreflightCheck {
  return {
    id,
    label,
    message: probe.detail,
    status: probe.ok ? 'pass' : 'fail',
    ...(probe.ok ? {} : { tip }),
  };
}

/*** Probe a process command without throwing so every readiness failure can be rendered. */
async function probeCommandAsync(
  executable: string,
  args: readonly string[],
  runProcessAsync: NonNullable<CreateDockerCertbotRuntimeOptions['runProcessAsync']>,
): Promise<{ readonly ok: boolean; readonly detail: string }> {
  try {
    const result = await runProcessAsync(executable, args);
    const detail = (result.stdout || result.stderr).trim();
    return { ok: result.exitCode === 0, detail: detail || `exit ${result.exitCode}` };
  } catch (error) {
    return { ok: false, detail: getErrorMessage(error) };
  }
}

/*** Build the shared Docker run prefix that persists Certbot state in one named volume. */
function createDockerPrefix(volumeName: string, image: string): readonly string[] {
  return ['run', '--rm', '--pull=missing', '-v', `${volumeName}:/data`, image];
}

/*** Ensure the persistent Certbot state and HTTP-01 directories exist. */
async function ensureVolumeLayoutAsync(input: {
  readonly dockerExecutable: string;
  readonly image: string;
  readonly runProcessAsync: NonNullable<CreateDockerCertbotRuntimeOptions['runProcessAsync']>;
  readonly volumeName: string;
}): Promise<void> {
  await runCheckedAsync(
    input.dockerExecutable,
    [
      'run',
      '--rm',
      '--pull=missing',
      '--entrypoint',
      'sh',
      '-v',
      `${input.volumeName}:/data`,
      input.image,
      '-c',
      `mkdir -p ${WEBROOT} ${CONFIG_DIR} ${WORK_DIR} ${LOGS_DIR}`,
    ],
    input.runProcessAsync,
  );
}

/*** Run one process and throw captured diagnostics on failure. */
async function runCheckedAsync(
  executable: string,
  args: readonly string[],
  runProcessAsync: NonNullable<CreateDockerCertbotRuntimeOptions['runProcessAsync']>,
): Promise<ProcessResult> {
  const result = await runProcessAsync(executable, args);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `Command failed with exit code ${result.exitCode}.`);
  }
  return result;
}

/*** Execute a process while capturing deterministic stdout and stderr. */
function runProcess(executable: string, args: readonly string[]): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.once('error', reject);
    child.once('close', (code) =>
      resolve({
        exitCode: code ?? 1,
        stderr: Buffer.concat(stderr).toString('utf8'),
        stdout: Buffer.concat(stdout).toString('utf8'),
      }),
    );
  });
}

/*** Convert an unknown failure into a stable human-readable message. */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
