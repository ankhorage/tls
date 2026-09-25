import type { CertificateStoragePaths } from '../../../../../types/certificates.js';
import type { TlsPreflightCheck } from '../../../../../types/preflight.js';
import type { ProcessRunOptions, RunProcessAsync } from '../../../../../types/process.js';
import { runCheckedProcessAsync } from '../../../../../utils/runCheckedProcessAsync.js';
import { runProcessAsync as defaultRunProcessAsync } from '../../../../../utils/runProcessAsync.js';
import type { CertificateRuntimePort } from '../../../application/ports/outbound/certificateRuntimePort.js';
import {
  CERTBOT_CONTAINER_CONFIG_DIR,
  CERTBOT_CONTAINER_LOGS_DIR,
  CERTBOT_CONTAINER_ROOT,
  CERTBOT_CONTAINER_WEBROOT,
  CERTBOT_CONTAINER_WORK_DIR,
  CERTBOT_IMAGE,
} from '../../../constants/certbot.js';
import { prepareCertificateStorageAsync } from '../../../utils/prepareCertificateStorageAsync.js';
import { readCertificateStateStampAsync } from '../../../utils/readCertificateStateStampAsync.js';
import { runHttp01PreflightAsync } from '../../../utils/runHttp01PreflightAsync.js';

interface CreateDockerCertbotRuntimeOptions {
  readonly dockerExecutable?: string;
  readonly image?: string;
  readonly output?: ProcessRunOptions;
  readonly runProcessAsync?: RunProcessAsync;
  readonly storage: CertificateStoragePaths;
}

/*** Create a Docker-backed Certbot adapter over host-owned certificate storage. */
export function createDockerCertbotRuntime(
  options: CreateDockerCertbotRuntimeOptions,
): CertificateRuntimePort {
  const runtime: DockerRuntime = {
    dockerExecutable: options.dockerExecutable ?? 'docker',
    image: options.image ?? CERTBOT_IMAGE,
    output: options.output ?? {},
    runProcessAsync: options.runProcessAsync ?? defaultRunProcessAsync,
    storage: options.storage,
  };

  return {
    issueAsync: (input) => issueAsync(runtime, input),
    preflightAsync: ({ domains }) => preflightAsync(runtime, domains),
    renewAsync: (input) => renewAsync(runtime, input.dryRun),
    statusAsync: () => statusAsync(runtime),
  };
}

interface DockerRuntime {
  readonly dockerExecutable: string;
  readonly image: string;
  readonly output: ProcessRunOptions;
  readonly runProcessAsync: RunProcessAsync;
  readonly storage: CertificateStoragePaths;
}

/*** Issue one HTTP-01 certificate with persistent host-owned Certbot state. */
async function issueAsync(
  runtime: DockerRuntime,
  input: Parameters<CertificateRuntimePort['issueAsync']>[0],
): Promise<void> {
  await prepareCertificateStorageAsync(runtime.storage);
  await runCheckedProcessAsync(
    runtime.dockerExecutable,
    [
      ...dockerPrefix(runtime),
      'certonly',
      '--webroot',
      '--webroot-path',
      CERTBOT_CONTAINER_WEBROOT,
      ...stateDirectoryArguments(),
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
    runtime.runProcessAsync,
    runtime.output,
  );
}

/*** Ask Docker Certbot to renew certificates according to persisted ACME state. */
async function renewAsync(
  runtime: DockerRuntime,
  dryRun: boolean,
): Promise<{ readonly renewed: boolean }> {
  await prepareCertificateStorageAsync(runtime.storage);
  const before = await readCertificateStateStampAsync(runtime.storage.configDirectory);
  await runCheckedProcessAsync(
    runtime.dockerExecutable,
    [
      ...dockerPrefix(runtime),
      'renew',
      ...stateDirectoryArguments(),
      ...(dryRun ? ['--dry-run'] : []),
    ],
    runtime.runProcessAsync,
    runtime.output,
  );
  const after = await readCertificateStateStampAsync(runtime.storage.configDirectory);
  return { renewed: !dryRun && after > before };
}

/*** Read Docker Certbot's persisted certificate inventory. */
async function statusAsync(runtime: DockerRuntime): Promise<string> {
  await prepareCertificateStorageAsync(runtime.storage);
  return (
    await runCheckedProcessAsync(
      runtime.dockerExecutable,
      [...dockerPrefix(runtime), 'certificates', ...stateDirectoryArguments()],
      runtime.runProcessAsync,
    )
  ).stdout;
}

/*** Verify Docker runtime availability plus the shared host HTTP-01 contract. */
async function preflightAsync(
  runtime: DockerRuntime,
  domains: readonly string[],
): Promise<readonly TlsPreflightCheck[]> {
  const runtimeChecks = [await probeDockerAsync(runtime)];
  return runHttp01PreflightAsync({
    domains,
    runtimeChecks,
    storage: runtime.storage,
  });
}

/*** Probe Docker daemon access without coupling certificate storage to a Docker volume. */
async function probeDockerAsync(runtime: DockerRuntime): Promise<TlsPreflightCheck> {
  try {
    const result = await runtime.runProcessAsync(runtime.dockerExecutable, [
      'version',
      '--format',
      '{{.Server.Version}}',
    ]);
    return {
      id: 'runtime:docker',
      label: 'Docker Certbot runtime',
      message:
        result.exitCode === 0
          ? `Docker daemon is reachable; Certbot image: ${runtime.image}.`
          : result.stderr.trim() || `Docker exited with ${result.exitCode}.`,
      status: result.exitCode === 0 ? 'pass' : 'fail',
      ...(result.exitCode === 0
        ? {}
        : { tip: 'Start Docker or install native Certbot and use --runtime native.' }),
    };
  } catch (error) {
    return {
      id: 'runtime:docker',
      label: 'Docker Certbot runtime',
      message: error instanceof Error ? error.message : String(error),
      status: 'fail',
      tip: 'Start Docker or install native Certbot and use --runtime native.',
    };
  }
}

/*** Build the Docker invocation prefix using a bind mount to host-owned TLS storage. */
function dockerPrefix(runtime: DockerRuntime): readonly string[] {
  return [
    'run',
    '--rm',
    '--pull=missing',
    '-v',
    `${runtime.storage.rootDirectory}:${CERTBOT_CONTAINER_ROOT}`,
    runtime.image,
  ];
}

/*** Build Certbot's container-local persistent state-directory arguments. */
function stateDirectoryArguments(): readonly string[] {
  return [
    '--config-dir',
    CERTBOT_CONTAINER_CONFIG_DIR,
    '--work-dir',
    CERTBOT_CONTAINER_WORK_DIR,
    '--logs-dir',
    CERTBOT_CONTAINER_LOGS_DIR,
  ];
}
