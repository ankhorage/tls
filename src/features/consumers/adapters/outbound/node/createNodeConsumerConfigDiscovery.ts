import { access } from 'node:fs/promises';

import type { ConsumerConfigDiscoveryPort } from '../../../application/ports/outbound/consumerConfigDiscoveryPort.js';

/*** Create the Node filesystem adapter used to discover optional consumer configuration. */
export function createNodeConsumerConfigDiscovery(): ConsumerConfigDiscoveryPort {
  return {
    async findFirstExistingAsync(paths) {
      for (const candidate of paths) {
        if (await pathExistsAsync(candidate)) return candidate;
      }
      return null;
    },
    pathExistsAsync,
  };
}

/*** Check whether one candidate consumer configuration path exists. */
async function pathExistsAsync(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}
