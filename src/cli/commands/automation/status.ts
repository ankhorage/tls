import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { createSystemdRenewalScheduler } from '../../../features/automation/adapters/outbound/systemd/createSystemdRenewalScheduler.js';
import { readRenewalAutomationStatusAsync } from '../../../features/automation/application/use-cases/readRenewalAutomationStatusAsync.js';

/*** Show whether the configured TLS renewal scheduler is installed and active. */
export const status: AnkhCommandHandler = async (request) => {
  try {
    if (request.argv.length !== 0) {
      throw new Error('Usage: ankh tls automation status');
    }
    const entrypoint = process.argv[1];
    if (entrypoint === undefined) throw new Error('Could not resolve the running Ankh CLI entrypoint.');

    const scheduler = createSystemdRenewalScheduler({
      ankhCommand: [process.execPath, entrypoint],
    });
    const result = await readRenewalAutomationStatusAsync(scheduler);
    request.context.writeStdout(
      [
        `enabled: ${result.enabled ? 'yes' : 'no'}`,
        `active: ${result.active ? 'yes' : 'no'}`,
        `systemd: ${result.detail}`,
        '',
      ].join('\n'),
    );
    return { exitCode: result.enabled && result.active ? 0 : 1 };
  } catch (error) {
    request.context.writeStderr(
      `TLS automation status failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1 };
  }
};
