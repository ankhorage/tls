import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';

import {
  CERTBOT_IMAGE,
  CERTBOT_STORAGE_VOLUME,
  CERTBOT_WEBROOT,
} from '../../../constants/certbot.js';
import type { TlsPreflightCheck } from '../../../../../types/preflight.js';
import type { RunProcessAsync } from '../../../../../types/process.js';

interface DockerTlsPreflightOptions {
  readonly dockerExecutable?: string;
  readonly domains: readonly string[];
  readonly image?: string;
  readonly runProcessAsync: RunProcessAsync;
  readonly storageVolumeName?: string;
}

/*** Probe Docker, configured storage, DNS, port 80 routing, and the live HTTP-01 webroot. */
export async function runDockerTlsPreflightAsync(
  options: DockerTlsPreflightOptions,
): Promise<readonly TlsPreflightCheck[]> {
  const runtime = {
    dockerExecutable: options.dockerExecutable ?? 'docker',
    image: options.image ?? CERTBOT_IMAGE,
    runProcessAsync: options.runProcessAsync,
    storageVolumeName: options.storageVolumeName ?? CERTBOT_STORAGE_VOLUME,
  };
  const docker = await probeCommandAsync(
    runtime.dockerExecutable,
    ['version', '--format', '{{.Server.Version}}'],
    runtime.runProcessAsync,
  );
  const storage = docker.ok
    ? await probeCommandAsync(
        runtime.dockerExecutable,
        ['volume', 'inspect', runtime.storageVolumeName],
        runtime.runProcessAsync,
      )
    : failedProbe('Docker daemon is unavailable.');
  const base = createBaseChecks(docker, storage, runtime.storageVolumeName);
  const dns = await Promise.all(options.domains.map(probeDnsAsync));
  if (!docker.ok || !storage.ok) return [...base, ...dns];

  return finishHttp01PreflightAsync({
    ...runtime,
    base,
    dns,
    domains: options.domains,
  });
}

/*** Finish the storage/webroot and HTTP roundtrip probes once Docker is available. */
async function finishHttp01PreflightAsync(input: {
  readonly base: readonly TlsPreflightCheck[];
  readonly dns: readonly TlsPreflightCheck[];
  readonly dockerExecutable: string;
  readonly domains: readonly string[];
  readonly image: string;
  readonly runProcessAsync: RunProcessAsync;
  readonly storageVolumeName: string;
}): Promise<readonly TlsPreflightCheck[]> {
  const token = `ankh-tls-${randomUUID().replaceAll('-', '')}`;
  const prepared = await writeChallengeAsync(input, token);
  const webroot = createCheck(
    'storage',
    'Certificate storage and HTTP-01 webroot',
    prepared,
    'Certificate storage is writable and the challenge webroot is ready.',
    `Ensure Docker volume ${input.storageVolumeName} is writable and Docker can pull ${input.image}.`,
  );
  if (!prepared.ok) return [...input.base, webroot, ...input.dns];

  const http = await Promise.all(
    input.domains.map((domain) => probeHttpAsync(domain, token)),
  );
  await removeChallengeAsync(input, token);
  return [...input.base, webroot, ...input.dns, ...http];
}

/*** Build concise Docker and configured-storage checklist entries. */
function createBaseChecks(
  docker: ProbeResult,
  storage: ProbeResult,
  storageVolumeName: string,
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
      'storage-volume',
      `Docker storage volume ${storageVolumeName}`,
      storage,
      'Configured certificate storage volume exists.',
      `Create it with: docker volume create ${storageVolumeName}`,
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
      message: ok
        ? 'Challenge roundtrip succeeded.'
        : `Received HTTP ${response.status} instead of the challenge token.`,
      status: ok ? 'pass' : 'fail',
      ...(ok
        ? {}
        : {
            tip: 'Serve /.well-known/acme-challenge/* from the configured webroot on port 80 without redirecting that path.',
          }),
    };
  } catch (error) {
    return {
      id: `http01:${domain}`,
      label: `HTTP-01 ${domain}:80`,
      message: getErrorMessage(error),
      status: 'fail',
      tip: 'Verify DNS points to the target server, TCP/80 is open, and the HTTP server exposes the configured challenge webroot.',
    };
  }
}

/*** Write one temporary HTTP-01 token through the configured Docker storage volume. */
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
      `${input.storageVolumeName}:/data`,
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
    `${input.storageVolumeName}:/data`,
    input.image,
    '-c',
    `rm -f ${CERTBOT_WEBROOT}/.well-known/acme-challenge/${token}`,
  ]);
}

interface DockerCommandInput {
  readonly dockerExecutable: string;
  readonly image: string;
  readonly runProcessAsync: RunProcessAsync;
  readonly storageVolumeName: string;
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
