import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { renewCertificatesAsync } from '../../features/certificates/application/use-cases/renewCertificatesAsync.js';
import { createCertificateRuntimeAsync } from '../../features/certificates/composition/createCertificateRuntimeAsync.js';
import { parseTlsRuntimeOptions } from '../utils/parseTlsRuntimeOptions.js';

/*** Renew all due certificates from persistent host-owned state. */
export const renew: AnkhCommandHandler = async (request) => {
  try {
    const runtimeOptions = parseTlsRuntimeOptions(request.argv);
    const parsed = parseArguments(runtimeOptions.remaining);
    const resolved = await createCertificateRuntimeAsync({
      preference: runtimeOptions.runtimePreference,
      storageDirectory: runtimeOptions.storageDirectory,
      output: {
        onStdout: request.context.writeStdout,
        onStderr: request.context.writeStderr,
      },
    });
    request.context.writeStdout(
      `TLS renewal runtime: ${resolved.kind}\nstorage: ${resolved.storage.rootDirectory}\n\n`,
    );
    await renewCertificatesAsync(resolved.runtime, { dryRun: parsed.dryRun });
    request.context.writeStdout(
      parsed.dryRun ? 'TLS renewal dry-run passed.\n' : 'TLS renewal check completed.\n',
    );
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

/*** Parse renewal-specific flags after shared runtime options are removed. */
function parseArguments(argv: readonly string[]): RenewArguments {
  if (argv.length === 0) return { dryRun: false };
  if (argv.length === 1 && argv[0] === '--dry-run') return { dryRun: true };
  throw new Error(
    'Usage: ankh tls renew [--dry-run] [--storage <path>] [--runtime auto|native|docker]',
  );
}
