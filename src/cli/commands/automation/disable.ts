import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { createSystemdRenewalScheduler } from '../../../features/automation/adapters/outbound/systemd/createSystemdRenewalScheduler.js';
import { disableRenewalAutomationAsync } from '../../../features/automation/application/use-cases/disableRenewalAutomationAsync.js';

/*** Disable TLS renewal scheduling and remove systemd-owned unit files. */
export const disable: AnkhCommandHandler = async (request) => {
  try {
    if (request.argv.length !== 0) {
      throw new Error('Usage: ankh tls automation disable');
    }
    const [, entrypoint] = process.argv;
    if (entrypoint === undefined)
      throw new Error('Could not resolve the running Ankh CLI entrypoint.');

    const scheduler = createSystemdRenewalScheduler({
      ankhCommand: [process.execPath, entrypoint],
    });
    await disableRenewalAutomationAsync(scheduler);
    request.context.writeStdout('TLS renewal automation disabled.\n');
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(
      `TLS automation disable failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1 };
  }
};
