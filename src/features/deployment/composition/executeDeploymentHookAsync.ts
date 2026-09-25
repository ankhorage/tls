import type { ProcessRunOptions, RunProcessAsync } from '../../../types/process.js';
import { createShellDeploymentHook } from '../adapters/outbound/shell/createShellDeploymentHook.js';
import { runDeploymentHookAsync } from '../application/use-cases/runDeploymentHookAsync.js';

interface ExecuteDeploymentHookInput {
  readonly command: string;
  readonly output?: ProcessRunOptions;
  readonly runProcessAsync?: RunProcessAsync;
  readonly shellExecutable?: string;
}

/*** Execute one explicit post-renewal host command through the deployment composition boundary. */
export async function executeDeploymentHookAsync(input: ExecuteDeploymentHookInput): Promise<void> {
  const hook = createShellDeploymentHook({
    output: input.output,
    runProcessAsync: input.runProcessAsync,
    shellExecutable: input.shellExecutable,
  });
  await runDeploymentHookAsync(hook, input.command);
}
