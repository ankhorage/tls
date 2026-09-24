import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';

import {
  CERTBOT_IMAGE,
  CERTBOT_WEBROOT,
  CERTBOT_VOLUME,
} from '../../../constants/certbot.js';
import type { TlsPreflightCheck } from '../../../../../types/preflight.js';
import type { RunProcessAsync } from '../../../../../types/process.js';

interface DockerTlsPreflightOptions {
  readonly dockerExecutable?: string;
  readonly domains: readonly string[];
  readonly image?: string;
  readonly runProcessAsync: RunProcessAsync;
  readonly volumeName?: string;
}

/*** Probe Docker, shared storage, DNS, port 80 routing, and the live HTTP-01 webroot. */
export async function runDockerTlsPreflightAsync(
  options: DockerTlsPreflightOptions,
): Promise<readonly TlsPreflightCheck[]> {
  const dockerExecutable = options.dockerExecutable ?? 'docker';
  const image = options.image ?? CERTBOT_IMAGE;
  const volumeName = options.volumeName ?? CERTBOT_VOLUME;
  const docker = await probeCommandAsync(
    dockerExecutable,
    ['version', '--format', '{{.Server.Version}}'],
    options.runProcessAsync,
  );
  const volume = docker.ok
    ? await probeCommandAsync(
        dockerExecutable,
        ['volume', 'inspect', volumeName],
        options.runProcessAsync,
      )
    : failedProbe('Docker daemon is unavailable.');
  const base = createBaseChecks(docker, volume, volumeName);
  const dns = await Promise.all(options.domains.map(probeDnsAsync));
  if (!docker.ok || !volume.ok) return [...base, ...dns];

  return finishHttp01PreflightAsync({
    ...options,
    dockerExecutable,
    image,
    volumeName,
    base,
    dns,
  });
}

/*** Finish the image/webroot and HTTP roundtrip probes once Docker storage is available. */
async function finishHttp01PreflightAsync(input: {
  readonly base: readonly TlsPreflightCheck[];
  readonly dns: readonly TlsPreflightCheck[];
  readonly dockerExecutable: string;
  readonly domains: readonly string[];
  readonly image: string;
  readonly runProcessAsync: RunProcessAsync;
  readonly volumeName: string;
}): Promise<readonly TlsPreflightCheck[]> {
  const token = `ankh-tls-${randomUUID().replaceAll('-', '')}`;
  const prepared = await writeChallengeAsync(input, token);
  const webroot = createCheck(
    'webroot',
    'Certbot image and HTTP-01 webroot',
    prepared,
    'Certbot image is runnable and the shared challenge webroot is writable.',
    `Ensure ${input.volumeName} is writable and Docker can pull ${input.image}.`,
  );
  if (!prepared.ok) return [...input.base, webroot, ...input.dns];

  const http = await Promise.all(input.domains.map((domain) => probeHttpAsync(domain, token)));
  await removeChallengeAsync(input, token);
  return [...input.base, webroot, ...input.dns, ...http];
}

/*** Build concise Docker and volume checklist entries. */
function createBaseChecks(
  docker: ProbeResult,
  volume: ProbeResult,
  volumeName: string,
): readonly TlsPreflightCheck[] {
  return [
    createCheck(
      'docker',
      'Docker daemon',
      docker,
      'Docker daemon is reachable.',
      'Start Docker and ensure the current user may access its socket.',
    ),
    createCheck(
      'volume',
      `Docker volume ${volumeName}`,
      volume,
      'Shared certificate volume exists.',
      `Create it with: docker volume create ${volumeName}`,
    ),
  ];
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

/*** Fetch the exact token over HTTP to verify DNS, TCP/80, routing, and webroot ownership. */
async function probeHttpAsync(domain: string, token: string): Promise<TlsPreflightCheck> {
  try {
    const response = await fetch(`http://${domain}/.well-known/acme-challenge/${token}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    const ok = response.status === 200 && (await response.text()).trim() === token;
    return {
      id: `http01:${domain}`,
      label: `HTTP-01 ${domain}:80`,
      message: ok ? 'Challenge roundtrip succeeded.' : `Received HTTP ${response.status} instead of the challenge token.`,
      status: ok ? 'pass' : 'fail',
      ...(ok
        ? {}
        : {
            tip: 'Serve /.well-known/acme-challenge/* from the Certbot webroot on port 80 without redirecting that path.',
          }),
    };
  } catch (error) {
    return {
      id: `http01:${domain}`,
      label: `HTTP-01 ${domain}:80`,
      message: getErrorMessage(error),
      status: 'fail',
      tip: 'Verify DNS points here, TCP/80 is open, and the web server exposes the challenge webroot.',
    };
  }
}

/*** Write one temporary HTTP-01 token through the persistent Docker volume. */
async function writeChallengeAsync(
  input: DockerCommandInput,
  token: string,
): Promise<ProbeResult> {
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
      `mkdir -p ${CERTBOT_WEBROOT}/.well-known/acme-challenge && printf '%s' '${token}' > ${CERTBOT_WEBROOT}/.well-known/acme-challenge/${token}`,
    ],
    input.runProcessAsync,
  );
}

/*** Remove the temporary readiness token after the HTTP roundtrip. */
async function removeChallengeAsync(
  input: DockerCommandInput,
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
    `rm -f ${CERTBOT_WEBROOT}/.well-known/acme-challenge/${token}`,
  ]);
}

interface DockerCommandInput {
  readonly dockerExecutable: string;
  readonly image: string;
  readonly runProcessAsync: RunProcessAsync;
  readonly volumeName: string;
}

interface ProbeResult {
  readonly detail: string;
  readonly ok: boolean;
}

/*** Probe a process command without throwing so readiness can report every actionable failure. */
async function probeCommandAsync(
  executable: string,
  args: readonly string[],
  runProcessAsync: RunProcessAsync,
): Promise<ProbeResult> {
  try {
    const result = await runProcessAsync(executable, args);
    return {
      detail: (result.stdout || result.stderr).trim() || `exit ${result.exitCode}`,
      ok: result.exitCode === 0,
    };
  } catch (error) {
    return failedProbe(getErrorMessage(error));
  }
}

/*** Build a failed probe value. */
function failedProbe(detail: string): ProbeResult {
  return { detail, ok: false };
}

/*** Convert one probe into a concise checklist entry. */
function createCheck(
  id: string,
  label: string,
  probe: ProbeResult,
  successMessage: string,
  tip: string,
): TlsPreflightCheck {
  return {
    id,
    label,
    message: probe.ok ? successMessage : probe.detail,
    status: probe.ok ? 'pass' : 'fail',
    ...(probe.ok ? {} : { tip }),
  };
}

/*** Convert an unknown error to a stable readiness message. */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
