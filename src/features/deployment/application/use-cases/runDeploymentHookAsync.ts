import type { DeploymentHookPort } from '../ports/outbound/deploymentHookPort.js';

/*** Run one explicit host deployment command after certificate files actually change. */
export async function runDeploymentHookAsync(
  hook: DeploymentHookPort,
  command: string,
): Promise<void> {
  if (command.trim() === '') {
    throw new Error('Deployment command must not be empty.');
  }
  await hook.runAsync(command);
}
