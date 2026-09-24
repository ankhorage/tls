import {
  CERTBOT_CONFIG_DIR,
  CERTBOT_DATA_ROOT,
  CERTBOT_IMAGE,
  CERTBOT_LOGS_DIR,
  CERTBOT_VOLUME,
  CERTBOT_WEBROOT,
  CERTBOT_WORK_DIR,
} from '../../../constants/certbot.js';
import type { CertificateRuntimePort } from '../../../application/ports/outbound/certificateRuntimePort.js';
import type { RunProcessAsync } from '../../../../../types/process.js';
import { runCheckedProcessAsync } from '../../../utils/runCheckedProcessAsync.js';
import { runProcessAsync as defaultRunProcessAsync } from '../../../utils/runProcessAsync.js';
import { runDockerTlsPreflightAsync } from './runDockerTlsPreflightAsync.js';

interface CreateDockerCertbotRuntimeOptions {
  readonly dockerExecutable?: string;
  readonly image?: string;
  readonly runProcessAsync?: RunProcessAsync;
  readonly volumeName?: string;
}

/*** Compose the Docker-backed Certbot adapter for certificate lifecycle and HTTP-01 readiness. */
export function createDockerCertbotRuntime(
  options: CreateDockerCertbotRuntimeOptions = {},
): CertificateRuntimePort {
  const dockerExecutable = options.dockerExecutable ?? 'docker';
  const image = options.image ?? CERTBOT_IMAGE;
  const runProcessAsync = options.runProcessAsync ?? defaultRunProcessAsync;
  const volumeName = options.volumeName ?? CERTBOT_VOLUME;
  const runtime = { dockerExecutable, image, runProcessAsync, volumeName };

  return {
    issueAsync: (input) => issueAsync(runtime, input),
    preflightAsync: ({ domains }) => runDockerTlsPreflightAsync({ ...runtime, domains }),
    renewAsync: (input) => renewAsync(runtime, input.dryRun),
    statusAsync: () => statusAsync(runtime),
  };
}

interface DockerRuntime {
  readonly dockerExecutable: string;
  readonly image: string;
  readonly runProcessAsync: RunProcessAsync;
  readonly volumeName: string;
}

/*** Issue one HTTP-01 certificate with persistent Certbot state. */
async function issueAsync(
  runtime: DockerRuntime,
  input: Parameters<CertificateRuntimePort['issueAsync']>[0],
): Promise<void> {
  await ensureVolumeLayoutAsync(runtime);
  await runCheckedProcessAsync(
    runtime.dockerExecutable,
    [
      ...dockerPrefix(runtime),
      'certonly',
      '--webroot',
      '--webroot-path',
      CERTBOT_WEBROOT,
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
  );
}

/*** Ask Certbot to renew only certificates whose persisted policy says they are due. */
async function renewAsync(runtime: DockerRuntime, dryRun: boolean): Promise<void> {
  await ensureVolumeLayoutAsync(runtime);
  await runCheckedProcessAsync(
    runtime.dockerExecutable,
    [
      ...dockerPrefix(runtime),
      'renew',
      ...stateDirectoryArguments(),
      ...(dryRun ? ['--dry-run'] : []),
    ],
    runtime.runProcessAsync,
  );
}

/*** Read Certbot's persisted certificate inventory. */
async function statusAsync(runtime: DockerRuntime): Promise<string> {
  await ensureVolumeLayoutAsync(runtime);
  return (
    await runCheckedProcessAsync(
      runtime.dockerExecutable,
      [...dockerPrefix(runtime), 'certificates', ...stateDirectoryArguments()],
      runtime.runProcessAsync,
    )
  ).stdout;
}

/*** Ensure all persistent Certbot directories exist in the shared volume. */
async function ensureVolumeLayoutAsync(runtime: DockerRuntime): Promise<void> {
  await runCheckedProcessAsync(
    runtime.dockerExecutable,
    [
      'run',
      '--rm',
      '--pull=missing',
      '--entrypoint',
      'sh',
      '-v',
      `${runtime.volumeName}:/data`,
      runtime.image,
      '-c',
      `mkdir -p ${CERTBOT_WEBROOT} ${CERTBOT_CONFIG_DIR} ${CERTBOT_WORK_DIR} ${CERTBOT_LOGS_DIR}`,
    ],
    runtime.runProcessAsync,
  );
}

/*** Build the Docker run prefix shared by Certbot lifecycle commands. */
function dockerPrefix(runtime: DockerRuntime): readonly string[] {
  return ['run', '--rm', '--pull=missing', '-v', `${runtime.volumeName}:/data`, runtime.image];
}

/*** Build Certbot's persistent state-directory arguments. */
function stateDirectoryArguments(): readonly string[] {
  return [
    '--config-dir',
    CERTBOT_CONFIG_DIR,
    '--work-dir',
    CERTBOT_WORK_DIR,
    '--logs-dir',
    CERTBOT_LOGS_DIR,
  ];
}

// Keep this import-owned constant referenced so path ownership remains explicit in generated docs.
void CERTBOT_DATA_ROOT;
