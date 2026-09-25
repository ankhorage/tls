import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { renewCertificatesAsync } from '../../features/certificates/application/use-cases/renewCertificatesAsync.js';
import { createCertificateRuntimeAsync } from '../../features/certificates/composition/createCertificateRuntimeAsync.js';
import { executeDeploymentHookAsync } from '../../features/deployment/composition/executeDeploymentHookAsync.js';
import { parseTlsDeploymentOptions } from '../utils/parseTlsDeploymentOptions.js';
import { parseTlsRuntimeOptions } from '../utils/parseTlsRuntimeOptions.js';

/*** Renew due certificates and run an explicit host deploy command only when files changed. */
export const renew: AnkhCommandHandler = async (request) => {
  try {
    const runtimeOptions = parseTlsRuntimeOptions(request.argv);
    const deploymentOptions = parseTlsDeploymentOptions(runtimeOptions.remaining);
    const parsed = parseArguments(deploymentOptions.remaining);
    const resolved = await createCertificateRuntimeAsync({
      preference: runtimeOptions.runtimePreference,
      storageDirectory: runtimeOptions.storageDirectory,
      output: {
        onStderr: (chunk) => request.context.writeStderr(chunk),
        onStdout: (chunk) => request.context.writeStdout(chunk),
      },
    });
    request.context.writeStdout(
      `TLS renewal runtime: ${resolved.kind}\nstorage: ${resolved.storage.rootDirectory}\n\n`,
    );

    const result = await renewCertificatesAsync(resolved.runtime, { dryRun: parsed.dryRun });
    await runDeployHookIfNeededAsync(request, deploymentOptions.deployCommand, result.renewed);
    request.context.writeStdout(renderRenewalResult(parsed.dryRun, result.renewed));
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(
      `TLS renew failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1 };
  }
};

interface RenewArguments {
  readonly dryRun: boolean;
}

/*** Run one explicit deployment hook only when persisted certificate state changed. */
async function runDeployHookIfNeededAsync(
  request: Parameters<AnkhCommandHandler>[0],
  command: string | undefined,
  renewed: boolean,
): Promise<void> {
  if (!renewed || command === undefined) return;

  request.context.writeStdout(`Running TLS deploy command: ${command}\n`);
  await executeDeploymentHookAsync({
    command,
    output: {
      onStderr: (chunk) => request.context.writeStderr(chunk),
      onStdout: (chunk) => request.context.writeStdout(chunk),
    },
  });
}

/*** Render a concise renewal result after Certbot and any deployment hook complete. */
function renderRenewalResult(dryRun: boolean, renewed: boolean): string {
  if (dryRun) return 'TLS renewal dry-run passed.\n';
  return renewed
    ? 'TLS renewal completed; certificate files changed.\n'
    : 'TLS renewal check completed; no certificate files changed.\n';
}

/*** Parse renewal-specific flags after shared runtime and deployment options are removed. */
function parseArguments(argv: readonly string[]): RenewArguments {
  if (argv.length === 0) return { dryRun: false };
  if (argv.length === 1 && argv[0] === '--dry-run') return { dryRun: true };
  throw new Error(
    'Usage: ankh tls renew [--dry-run] [--storage <path>] [--runtime auto|native|docker] [--deploy-command <command>]',
  );
}
