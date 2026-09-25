import type {
  CertificateRuntimePreference,
  ResolvedCertificateRuntime,
} from '../../../types/certificates.js';
import type { ProcessRunOptions, RunProcessAsync } from '../../../types/process.js';
import { runProcessAsync as defaultRunProcessAsync } from '../../../utils/runProcessAsync.js';
import { createDockerCertbotRuntime } from '../adapters/outbound/docker/createDockerCertbotRuntime.js';
import { createNativeCertbotRuntime } from '../adapters/outbound/native/createNativeCertbotRuntime.js';
import { resolveCertificateStorage } from './resolveCertificateStorage.js';

interface CreateCertificateRuntimeOptions {
  readonly certbotExecutable?: string;
  readonly dockerExecutable?: string;
  readonly image?: string;
  readonly output?: ProcessRunOptions;
  readonly preference?: CertificateRuntimePreference;
  readonly runProcessAsync?: RunProcessAsync;
  readonly storageDirectory: string;
}

/*** Select a usable certificate runtime without making Docker a package prerequisite. */
export async function createCertificateRuntimeAsync(
  options: CreateCertificateRuntimeOptions,
): Promise<ResolvedCertificateRuntime> {
  const runProcessAsync = options.runProcessAsync ?? defaultRunProcessAsync;
  const preference = options.preference ?? 'auto';
  const storage = resolveCertificateStorage(options.storageDirectory);

  if (preference === 'native') {
    await assertCommandAsync(options.certbotExecutable ?? 'certbot', ['--version'], runProcessAsync);
    return {
      kind: 'native',
      runtime: createNativeCertbotRuntime({
        certbotExecutable: options.certbotExecutable,
        output: options.output,
        runProcessAsync,
        storage,
      }),
      storage,
    };
  }

  if (preference === 'docker') {
    await assertCommandAsync(
      options.dockerExecutable ?? 'docker',
      ['version', '--format', '{{.Server.Version}}'],
      runProcessAsync,
    );
    return {
      kind: 'docker',
      runtime: createDockerCertbotRuntime({
        dockerExecutable: options.dockerExecutable,
        image: options.image,
        output: options.output,
        runProcessAsync,
        storage,
      }),
      storage,
    };
  }

  if (await commandSucceedsAsync(options.certbotExecutable ?? 'certbot', ['--version'], runProcessAsync)) {
    return {
      kind: 'native',
      runtime: createNativeCertbotRuntime({
        certbotExecutable: options.certbotExecutable,
        output: options.output,
        runProcessAsync,
        storage,
      }),
      storage,
    };
  }

  if (
    await commandSucceedsAsync(
      options.dockerExecutable ?? 'docker',
      ['version', '--format', '{{.Server.Version}}'],
      runProcessAsync,
    )
  ) {
    return {
      kind: 'docker',
      runtime: createDockerCertbotRuntime({
        dockerExecutable: options.dockerExecutable,
        image: options.image,
        output: options.output,
        runProcessAsync,
        storage,
      }),
      storage,
    };
  }

  throw new Error(
    'No usable Certbot runtime found. Install native Certbot or Docker, or choose one explicitly with --runtime.',
  );
}

/*** Check one executable probe without throwing during automatic runtime selection. */
async function commandSucceedsAsync(
  executable: string,
  args: readonly string[],
  runProcessAsync: RunProcessAsync,
): Promise<boolean> {
  try {
    return (await runProcessAsync(executable, args)).exitCode === 0;
  } catch {
    return false;
  }
}

/*** Require one explicit runtime executable to be available. */
async function assertCommandAsync(
  executable: string,
  args: readonly string[],
  runProcessAsync: RunProcessAsync,
): Promise<void> {
  if (!(await commandSucceedsAsync(executable, args, runProcessAsync))) {
    throw new Error(`Required runtime executable is unavailable: ${executable}`);
  }
}
