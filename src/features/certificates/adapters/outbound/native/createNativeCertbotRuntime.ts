import type { CertificateStoragePaths } from '../../../../../types/certificates.js';
import type { ProcessRunOptions, RunProcessAsync } from '../../../../../types/process.js';
import type { TlsPreflightCheck } from '../../../../../types/preflight.js';
import { runCheckedProcessAsync } from '../../../../../utils/runCheckedProcessAsync.js';
import { runProcessAsync as defaultRunProcessAsync } from '../../../../../utils/runProcessAsync.js';
import type { CertificateRuntimePort } from '../../../application/ports/outbound/certificateRuntimePort.js';
import { prepareCertificateStorageAsync } from '../../../utils/prepareCertificateStorageAsync.js';
import { runHttp01PreflightAsync } from '../../../utils/runHttp01PreflightAsync.js';

interface CreateNativeCertbotRuntimeOptions {
  readonly certbotExecutable?: string;
  readonly output?: ProcessRunOptions;
  readonly runProcessAsync?: RunProcessAsync;
  readonly storage: CertificateStoragePaths;
}

/*** Create a native Certbot adapter over host-owned certificate storage. */
export function createNativeCertbotRuntime(
  options: CreateNativeCertbotRuntimeOptions,
): CertificateRuntimePort {
  const runtime: NativeRuntime = {
    certbotExecutable: options.certbotExecutable ?? 'certbot',
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

interface NativeRuntime {
  readonly certbotExecutable: string;
  readonly output: ProcessRunOptions;
  readonly runProcessAsync: RunProcessAsync;
  readonly storage: CertificateStoragePaths;
}

/*** Issue one HTTP-01 certificate with native Certbot. */
async function issueAsync(
  runtime: NativeRuntime,
  input: Parameters<CertificateRuntimePort['issueAsync']>[0],
): Promise<void> {
  await prepareCertificateStorageAsync(runtime.storage);
  await runCheckedProcessAsync(
    runtime.certbotExecutable,
    [
      'certonly',
      '--webroot',
      '--webroot-path',
      runtime.storage.webrootDirectory,
      ...stateDirectoryArguments(runtime.storage),
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

/*** Renew due certificates with native Certbot. */
async function renewAsync(runtime: NativeRuntime, dryRun: boolean): Promise<void> {
  await prepareCertificateStorageAsync(runtime.storage);
  await runCheckedProcessAsync(
    runtime.certbotExecutable,
    [
      'renew',
      ...stateDirectoryArguments(runtime.storage),
      ...(dryRun ? ['--dry-run'] : []),
    ],
    runtime.runProcessAsync,
    runtime.output,
  );
}

/*** Read the native Certbot certificate inventory. */
async function statusAsync(runtime: NativeRuntime): Promise<string> {
  await prepareCertificateStorageAsync(runtime.storage);
  return (
    await runCheckedProcessAsync(
      runtime.certbotExecutable,
      ['certificates', ...stateDirectoryArguments(runtime.storage)],
      runtime.runProcessAsync,
    )
  ).stdout;
}

/*** Verify native Certbot availability plus the shared HTTP-01 contract. */
async function preflightAsync(
  runtime: NativeRuntime,
  domains: readonly string[],
): Promise<readonly TlsPreflightCheck[]> {
  return runHttp01PreflightAsync({
    domains,
    runtimeChecks: [await probeNativeCertbotAsync(runtime)],
    storage: runtime.storage,
  });
}

/*** Probe whether native Certbot is executable on the current host. */
async function probeNativeCertbotAsync(runtime: NativeRuntime): Promise<TlsPreflightCheck> {
  try {
    const result = await runtime.runProcessAsync(runtime.certbotExecutable, ['--version']);
    return {
      id: 'runtime:native',
      label: 'Native Certbot runtime',
      message:
        result.exitCode === 0
          ? result.stdout.trim() || 'Native Certbot is available.'
          : result.stderr.trim() || `Certbot exited with ${result.exitCode}.`,
      status: result.exitCode === 0 ? 'pass' : 'fail',
      ...(result.exitCode === 0
        ? {}
        : { tip: 'Install Certbot or use --runtime docker.' }),
    };
  } catch (error) {
    return {
      id: 'runtime:native',
      label: 'Native Certbot runtime',
      message: error instanceof Error ? error.message : String(error),
      status: 'fail',
      tip: 'Install Certbot or use --runtime docker.',
    };
  }
}

/*** Build native Certbot state-directory arguments. */
function stateDirectoryArguments(storage: CertificateStoragePaths): readonly string[] {
  return [
    '--config-dir',
    storage.configDirectory,
    '--work-dir',
    storage.workDirectory,
    '--logs-dir',
    storage.logsDirectory,
  ];
}
