import { resolve } from 'node:path';

import { CERTBOT_DEFAULT_STORAGE_DIRECTORY } from '../../features/certificates/constants/certbot.js';
import type { CertificateRuntimePreference } from '../../types/certificates.js';

interface ParsedTlsRuntimeOptions {
  readonly remaining: readonly string[];
  readonly runtimePreference: CertificateRuntimePreference;
  readonly storageDirectory: string;
}

/*** Parse shared TLS runtime flags while preserving command-specific arguments. */
export function parseTlsRuntimeOptions(argv: readonly string[]): ParsedTlsRuntimeOptions {
  return parseTokens(argv, {
    remaining: [],
    runtimePreference: 'auto',
    storageDirectory: resolve(process.cwd(), CERTBOT_DEFAULT_STORAGE_DIRECTORY),
  });
}

/*** Consume shared TLS runtime flags recursively without mutable parser state. */
function parseTokens(
  argv: readonly string[],
  parsed: ParsedTlsRuntimeOptions,
): ParsedTlsRuntimeOptions {
  const [token, value, ...rest] = argv;
  if (token === undefined) return parsed;

  if (token === '--storage' || token === '--runtime') {
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${token} requires a value.`);
    }
    if (token === '--runtime' && !isRuntimePreference(value)) {
      throw new Error('--runtime must be one of: auto, native, docker.');
    }
    return parseTokens(rest, {
      ...parsed,
      ...(token === '--storage'
        ? { storageDirectory: resolve(value) }
        : { runtimePreference: value as CertificateRuntimePreference }),
    });
  }

  return parseTokens(argv.slice(1), {
    ...parsed,
    remaining: [...parsed.remaining, token],
  });
}

/*** Narrow one CLI value to a supported certificate runtime preference. */
function isRuntimePreference(value: string): value is CertificateRuntimePreference {
  return value === 'auto' || value === 'native' || value === 'docker';
}
