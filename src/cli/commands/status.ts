import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { readCertificateStatusAsync } from '../../features/certificates/application/use-cases/readCertificateStatusAsync.js';
import { createCertificateRuntimeAsync } from '../../features/certificates/composition/createCertificateRuntimeAsync.js';
import { parseTlsRuntimeOptions } from '../utils/parseTlsRuntimeOptions.js';

/*** Show certificates known to the selected persistent certificate runtime. */
export const status: AnkhCommandHandler = async (request) => {
  try {
    const parsed = parseTlsRuntimeOptions(request.argv);
    if (parsed.remaining.length !== 0) {
      throw new Error(
        'Usage: ankh tls status [--storage <path>] [--runtime auto|native|docker]',
      );
    }
    const resolved = await createCertificateRuntimeAsync({
      preference: parsed.runtimePreference,
      storageDirectory: parsed.storageDirectory,
    });
    request.context.writeStdout(
      `TLS runtime: ${resolved.kind}\nstorage: ${resolved.storage.rootDirectory}\n\n`,
    );
    request.context.writeStdout(await readCertificateStatusAsync(resolved.runtime));
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(
      `TLS status failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1 };
  }
};
