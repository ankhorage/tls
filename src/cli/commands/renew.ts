import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { createDockerCertbotRuntime } from '../../features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.js';
import { renewCertificatesAsync } from '../../features/certificates/application/use-cases/renewCertificatesAsync.js';

/*** Renew all due certificates from persistent Certbot state. */
export const renew: AnkhCommandHandler = async (request) => {
  try {
    const parsed = parseArguments(request.argv);
    const runtime = createDockerCertbotRuntime({ volumeName: parsed.volumeName });
    await renewCertificatesAsync(runtime, { dryRun: parsed.dryRun });
    request.context.writeStdout(parsed.dryRun ? 'TLS renewal dry-run passed.\n' : 'TLS renewal check completed.\n');
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(`TLS renew failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return { exitCode: 1 };
  }
};

interface RenewArguments {
  readonly dryRun: boolean;
  readonly volumeName: string;
}

/*** Parse renewal flags without mutable parser state. */
function parseArguments(argv: readonly string[]): RenewArguments {
  const [token, value, ...rest] = argv;
  if (token === undefined) return { dryRun: false, volumeName: 'caddy-data' };
  if (token === '--dry-run') {
    const parsed = parseArguments(argv.slice(1));
    return { ...parsed, dryRun: true };
  }
  if (token === '--volume' && value !== undefined) {
    const parsed = parseArguments(rest);
    return { ...parsed, volumeName: value };
  }
  throw new Error(`Unknown argument: ${token}`);
}
