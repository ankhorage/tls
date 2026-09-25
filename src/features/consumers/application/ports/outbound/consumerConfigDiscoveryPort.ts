export interface ConsumerConfigDiscoveryPort {
  findFirstExistingAsync(paths: readonly string[]): Promise<string | null>;
  pathExistsAsync(path: string): Promise<boolean>;
}
