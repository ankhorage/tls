import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { createDockerCertbotRuntime } from '../../features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.js';
import { readCertificateStatusAsync } from '../../features/certificates/application/use-cases/readCertificateStatusAsync.js';
import { CERTBOT_STORAGE_VOLUME } from '../../features/certificates/constants/certbot.js';

/*** Show certificates known to the persistent certificate runtime. */
export const status: AnkhCommandHandler = async (request) => {
  try {
    const storageVolumeName = parseStorageVolume(request.argv);
    const runtime = createDockerCertbotRuntime({ storageVolumeName });
    request.context.writeStdout(await readCertificateStatusAsync(runtime));
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(
      `TLS status failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1 };
  }
};

/*** Parse the optional Docker-backed storage override. */
function parseStorageVolume(argv: readonly string[]): string {
  if (argv.length === 0) return CERTBOT_STORAGE_VOLUME;
  if (argv.length === 2 && argv[0] === '--storage-volume' && argv[1] !== undefined) {
    return argv[1];
  }
  throw new Error('Usage: ankh tls status [--storage-volume <docker-volume>]');
}
