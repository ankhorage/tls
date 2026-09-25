import { resolve } from 'node:path';

import type { CertificateStoragePaths } from '../../../types/certificates.js';

/*** Resolve the host-owned certificate storage tree from an explicit root directory. */
export function resolveCertificateStorage(rootDirectory: string): CertificateStoragePaths {
  const root = resolve(rootDirectory);
  return {
    configDirectory: resolve(root, 'config'),
    logsDirectory: resolve(root, 'logs'),
    rootDirectory: root,
    webrootDirectory: resolve(root, 'webroot'),
    workDirectory: resolve(root, 'work'),
  };
}
