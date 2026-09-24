import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { createDockerCertbotRuntime } from '../../features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.js';
import { renewCertificatesAsync } from '../../features/certificates/application/use-cases/renewCertificatesAsync.js';
import { CERTBOT_STORAGE_VOLUME } from '../../features/certificates/constants/certbot.js';

/*** Renew all due certificates from persistent Certbot state. */
export const renew: AnkhCommandHandler = async (request) => {
  try {
    const parsed = parseArguments(request.argv);
    const runtime = createDockerCertbotRuntime({
      storageVolumeName: parsed.storageVolumeName,
    });
    await renewCertificatesAsync(runtime, { dryRun: parsed.dryRun });
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
  readonly storageVolumeName: string;
}

/*** Parse renewal flags without mutable parser state. */
function parseArguments(argv: readonly string[]): RenewArguments {
  return parseTokens(argv, {
    dryRun: false,
    storageVolumeName: CERTBOT_STORAGE_VOLUME,
  });
}

/*** Recursively consume renewal tokens. */
function parseTokens(argv: readonly string[], parsed: RenewArguments): RenewArguments {
  const [token, value, ...rest] = argv;
  if (token === undefined) return parsed;

  if (token === '--dry-run') {
    return parseTokens(argv.slice(1), { ...parsed, dryRun: true });
  }

  if (token === '--storage-volume') {
    if (value === undefined || value.startsWith('--')) {
      throw new Error('--storage-volume requires a value.');
    }
    return parseTokens(rest, { ...parsed, storageVolumeName: value });
  }

  throw new Error(`Unknown argument: ${token}`);
}
