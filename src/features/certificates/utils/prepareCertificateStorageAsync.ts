import { access, mkdir } from 'node:fs/promises';

import type { CertificateStoragePaths } from '../../../types/certificates.js';

/*** Create certificate state directories and verify that the webroot is writable. */
export async function prepareCertificateStorageAsync(
  storage: CertificateStoragePaths,
): Promise<void> {
  await Promise.all([
    mkdir(storage.configDirectory, { recursive: true }),
    mkdir(storage.logsDirectory, { recursive: true }),
    mkdir(storage.webrootDirectory, { recursive: true }),
    mkdir(storage.workDirectory, { recursive: true }),
  ]);
  await access(storage.webrootDirectory);
}
