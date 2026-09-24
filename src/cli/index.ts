import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AnkhRuntimeCommandProvider } from '@ankhorage/ankh';
import type { AnkhCapabilityId } from '@ankhorage/contracts/cli';

import { issue } from './commands/issue.js';
import { renew } from './commands/renew.js';
import { status } from './commands/status.js';

const ISSUE_CAPABILITY = 'tls.issue' satisfies AnkhCapabilityId;
const RENEW_CAPABILITY = 'tls.renew' satisfies AnkhCapabilityId;
const STATUS_CAPABILITY = 'tls.status' satisfies AnkhCapabilityId;

const provider = {
  id: '@ankhorage/tls',
  category: 'tls',
  version: readPackageVersion(),
  capabilities: [ISSUE_CAPABILITY, RENEW_CAPABILITY, STATUS_CAPABILITY],
  commands: [
    {
      path: ['issue'],
      capability: ISSUE_CAPABILITY,
      summary: 'Preflight HTTP-01 prerequisites and issue one certificate per domain.',
      examples: ['ankh tls issue flector.ankhorage.com --email admin@ankhorage.com'],
    },
    {
      path: ['renew'],
      capability: RENEW_CAPABILITY,
      summary: 'Renew certificates that are due according to persisted ACME state.',
      examples: ['ankh tls renew --dry-run'],
    },
    {
      path: ['status'],
      capability: STATUS_CAPABILITY,
      summary: 'Show the certificates known to the TLS runtime.',
    },
  ],
  handlers: [
    { path: ['issue'], handler: issue },
    { path: ['renew'], handler: renew },
    { path: ['status'], handler: status },
  ],
} satisfies AnkhRuntimeCommandProvider;

export default provider;

/*** Read the installed TLS package version for the Ankh provider manifest. */
function readPackageVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf8'),
  ) as { readonly version?: unknown };
  if (typeof packageJson.version !== 'string' || packageJson.version.trim() === '') {
    throw new Error('@ankhorage/tls package.json must define a non-empty version.');
  }
  return packageJson.version;
}
