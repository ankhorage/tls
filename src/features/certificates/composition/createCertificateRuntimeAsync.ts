import type {
  CertificateRuntimeKind,
  CertificateRuntimePreference,
  CertificateStoragePaths,
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

interface RuntimeCompositionContext extends CreateCertificateRuntimeOptions {
  readonly preference: CertificateRuntimePreference;
  readonly runProcessAsync: RunProcessAsync;
  readonly storage: CertificateStoragePaths;
}

/*** Select a usable certificate runtime without making Docker a package prerequisite. */
export async function createCertificateRuntimeAsync(
  options: CreateCertificateRuntimeOptions,
): Promise<ResolvedCertificateRuntime> {
  const context = createRuntimeContext(options);
  const kind = await resolveRuntimeKindAsync(context);
  return createResolvedRuntime(context, kind);
}

/*** Normalize optional composition inputs once before runtime selection. */
function createRuntimeContext(
  options: CreateCertificateRuntimeOptions,
): RuntimeCompositionContext {
  return {
    ...options,
    preference: options.preference ?? 'auto',
    runProcessAsync: options.runProcessAsync ?? defaultRunProcessAsync,
    storage: resolveCertificateStorage(options.storageDirectory),
  };
}

/*** Resolve an explicit or automatically available Certbot runtime kind. */
async function resolveRuntimeKindAsync(
  context: RuntimeCompositionContext,
): Promise<CertificateRuntimeKind> {
  if (context.preference !== 'auto') {
    await assertRuntimeAvailableAsync(context, context.preference);
    return context.preference;
  }

  if (await runtimeAvailableAsync(context, 'native')) return 'native';
  if (await runtimeAvailableAsync(context, 'docker')) return 'docker';

  throw new Error(
    'No usable Certbot runtime found. Install native Certbot or Docker, or choose one explicitly with --runtime.',
  );
}

/*** Compose the selected concrete runtime behind the certificate port. */
function createResolvedRuntime(
  context: RuntimeCompositionContext,
  kind: CertificateRuntimeKind,
): ResolvedCertificateRuntime {
  const common = {
    output: context.output,
    runProcessAsync: context.runProcessAsync,
    storage: context.storage,
  };
  return {
    kind,
    runtime:
      kind === 'native'
        ? createNativeCertbotRuntime({
            ...common,
            certbotExecutable: context.certbotExecutable,
          })
        : createDockerCertbotRuntime({
            ...common,
            dockerExecutable: context.dockerExecutable,
            image: context.image,
          }),
    storage: context.storage,
  };
}

/*** Check whether one runtime's executable boundary is currently usable. */
async function runtimeAvailableAsync(
  context: RuntimeCompositionContext,
  kind: CertificateRuntimeKind,
): Promise<boolean> {
  const [executable, args] = runtimeProbe(context, kind);
  try {
    return (await context.runProcessAsync(executable, args)).exitCode === 0;
  } catch {
    return false;
  }
}

/*** Require an explicitly selected runtime to be available. */
async function assertRuntimeAvailableAsync(
  context: RuntimeCompositionContext,
  kind: CertificateRuntimeKind,
): Promise<void> {
  if (!(await runtimeAvailableAsync(context, kind))) {
    throw new Error(`Required ${kind} Certbot runtime is unavailable.`);
  }
}

/*** Resolve the executable probe used for one supported runtime kind. */
function runtimeProbe(
  context: RuntimeCompositionContext,
  kind: CertificateRuntimeKind,
): readonly [string, readonly string[]] {
  return kind === 'native'
    ? [context.certbotExecutable ?? 'certbot', ['--version']]
    : [
        context.dockerExecutable ?? 'docker',
        ['version', '--format', '{{.Server.Version}}'],
      ];
}
