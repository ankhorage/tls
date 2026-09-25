import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/*** Read the latest modification timestamp within persisted certificate state. */
export async function readCertificateStateStampAsync(rootPath: string): Promise<number> {
  try {
    return await readDirectoryStampAsync(rootPath);
  } catch (error) {
    if (isMissingPathError(error)) return 0;
    throw error;
  }
}

/*** Recursively compute the newest file or directory modification timestamp. */
async function readDirectoryStampAsync(directoryPath: string): Promise<number> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const childStamps = await Promise.all(
    entries.map(async (entry) => {
      const childPath = join(directoryPath, entry.name);
      return entry.isDirectory()
        ? readDirectoryStampAsync(childPath)
        : (await stat(childPath)).mtimeMs;
    }),
  );
  const ownStamp = (await stat(directoryPath)).mtimeMs;
  return Math.max(ownStamp, ...childStamps);
}

/*** Check whether an unknown filesystem failure means a path is absent. */
function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
