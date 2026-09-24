import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { createDockerCertbotRuntime } from '../../features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.js';
import { readCertificateStatusAsync } from '../../features/certificates/application/use-cases/readCertificateStatusAsync.js';

/*** Show certificates known to the persistent Certbot runtime. */
export const status: AnkhCommandHandler = async (request) => {
  try {
    const volumeName = parseVolume(request.argv);
    const runtime = createDockerCertbotRuntime({ volumeName });
    request.context.writeStdout(await readCertificateStatusAsync(runtime));
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(`TLS status failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return { exitCode: 1 };
  }
};

/*** Parse the optional Docker volume override. */
function parseVolume(argv: readonly string[]): string {
  if (argv.length === 0) return 'caddy-data';
  if (argv.length === 2 && argv[0] === '--volume' && argv[1] !== undefined) return argv[1];
  throw new Error('Usage: ankh tls status [--volume <docker-volume>]');
}
