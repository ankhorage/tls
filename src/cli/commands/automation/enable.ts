import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { createSystemdRenewalScheduler } from '../../../features/automation/adapters/outbound/systemd/createSystemdRenewalScheduler.js';
import { enableRenewalAutomationAsync } from '../../../features/automation/application/use-cases/enableRenewalAutomationAsync.js';
import { CERTBOT_STORAGE_VOLUME } from '../../../features/certificates/constants/certbot.js';

/*** Enable daily persistent TLS renewal checks with the systemd scheduler adapter. */
export const enable: AnkhCommandHandler = async (request) => {
  try {
    const storageVolumeName = parseStorageVolume(request.argv);
    const entrypoint = process.argv[1];
    if (entrypoint === undefined) throw new Error('Could not resolve the running Ankh CLI entrypoint.');

    const scheduler = createSystemdRenewalScheduler({
      ankhCommand: [process.execPath, entrypoint],
    });
    await enableRenewalAutomationAsync(scheduler, storageVolumeName);
    request.context.writeStdout(
      `TLS renewal automation enabled for storage volume "${storageVolumeName}".\n`,
    );
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(
      `TLS automation enable failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1 };
  }
};

/*** Parse the optional certificate-storage override. */
function parseStorageVolume(argv: readonly string[]): string {
  if (argv.length === 0) return CERTBOT_STORAGE_VOLUME;
  if (argv.length === 2 && argv[0] === '--storage-volume' && argv[1] !== undefined) {
    return argv[1];
  }
  throw new Error('Usage: ankh tls automation enable [--storage-volume <docker-volume>]');
}
