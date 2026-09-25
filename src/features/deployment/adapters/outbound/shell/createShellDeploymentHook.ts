import type { ProcessRunOptions, RunProcessAsync } from '../../../../../types/process.js';
import { runCheckedProcessAsync } from '../../../../../utils/runCheckedProcessAsync.js';
import { runProcessAsync as defaultRunProcessAsync } from '../../../../../utils/runProcessAsync.js';
import type { DeploymentHookPort } from '../../../application/ports/outbound/deploymentHookPort.js';

interface CreateShellDeploymentHookOptions {
  readonly output?: ProcessRunOptions;
  readonly runProcessAsync?: RunProcessAsync;
  readonly shellExecutable?: string;
}

/*** Create a host shell adapter for an explicitly supplied deployment command. */
export function createShellDeploymentHook(
  options: CreateShellDeploymentHookOptions = {},
): DeploymentHookPort {
  const runProcessAsync = options.runProcessAsync ?? defaultRunProcessAsync;
  const shellExecutable = options.shellExecutable ?? 'sh';

  return {
    async runAsync(command) {
      await runCheckedProcessAsync(
        shellExecutable,
        ['-c', command],
        runProcessAsync,
        options.output,
      );
    },
  };
}
