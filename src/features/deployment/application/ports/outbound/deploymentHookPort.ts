export interface DeploymentHookPort {
  runAsync(command: string): Promise<void>;
}
