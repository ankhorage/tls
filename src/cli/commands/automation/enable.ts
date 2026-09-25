import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { enableRenewalAutomationAsync } from '../../../features/automation/application/use-cases/enableRenewalAutomationAsync.js';
import { createRenewalScheduler } from '../../../features/automation/composition/createRenewalScheduler.js';
import { parseTlsDeploymentOptions } from '../../utils/parseTlsDeploymentOptions.js';
import { parseTlsRuntimeOptions } from '../../utils/parseTlsRuntimeOptions.js';

/*** Enable daily persistent TLS renewal checks through the scheduler composition boundary. */
export const enable: AnkhCommandHandler = async (request) => {
  try {
    const runtimeOptions = parseTlsRuntimeOptions(request.argv);
    const deploymentOptions = parseTlsDeploymentOptions(runtimeOptions.remaining);
    if (deploymentOptions.remaining.length !== 0) {
      throw new Error(
        'Usage: ankh tls automation enable [--storage <path>] [--runtime auto|native|docker] [--deploy-command <command>]',
      );
    }
    const [, entrypoint] = process.argv;
    if (entrypoint === undefined) {
      throw new Error('Could not resolve the running Ankh CLI entrypoint.');
    }

    const scheduler = createRenewalScheduler({
      ankhCommand: [process.execPath, entrypoint],
    });
    await enableRenewalAutomationAsync(scheduler, {
      deployCommand: deploymentOptions.deployCommand,
      runtimePreference: runtimeOptions.runtimePreference,
      storageDirectory: runtimeOptions.storageDirectory,
    });
    request.context.writeStdout(
      `TLS renewal automation enabled for "${runtimeOptions.storageDirectory}" using runtime "${runtimeOptions.runtimePreference}".\n`,
    );
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(
      `TLS automation enable failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1 };
  }
};
