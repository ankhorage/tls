import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AnkhRuntimeCommandProvider } from '@ankhorage/ankh';
import type { AnkhCapabilityId } from '@ankhorage/contracts/cli';

import { disable } from './commands/automation/disable.js';
import { enable } from './commands/automation/enable.js';
import { status as automationStatus } from './commands/automation/status.js';
import { issue } from './commands/issue.js';
import { renew } from './commands/renew.js';
import { status } from './commands/status.js';

const CAPABILITIES = {
  issue: 'tls.issue',
  renew: 'tls.renew',
  status: 'tls.status',
  automationEnable: 'tls.automation.enable',
  automationStatus: 'tls.automation.status',
  automationDisable: 'tls.automation.disable',
} as const satisfies Record<string, AnkhCapabilityId>;

const commands = [
  {
    path: ['issue'],
    capability: CAPABILITIES.issue,
    summary: 'Preflight HTTP-01 prerequisites and issue one certificate per domain.',
    examples: [
      'ankh tls issue app.example.com --email admin@example.com',
      'ankh tls issue app.example.com --email admin@example.com --consumer nginx',
    ],
  },
  {
    path: ['renew'],
    capability: CAPABILITIES.renew,
    summary: 'Renew certificates that are due according to persisted ACME state.',
    examples: ['ankh tls renew --dry-run', 'ankh tls renew --deploy-command "nginx -s reload"'],
  },
  {
    path: ['status'],
    capability: CAPABILITIES.status,
    summary: 'Show the certificates known to the TLS runtime.',
  },
  {
    path: ['automation', 'enable'],
    capability: CAPABILITIES.automationEnable,
    summary: 'Enable persistent daily TLS renewal checks.',
  },
  {
    path: ['automation', 'status'],
    capability: CAPABILITIES.automationStatus,
    summary: 'Show TLS renewal scheduler state.',
  },
  {
    path: ['automation', 'disable'],
    capability: CAPABILITIES.automationDisable,
    summary: 'Disable TLS renewal scheduling.',
  },
] as const;

const provider = {
  id: '@ankhorage/tls',
  category: 'tls',
  version: readPackageVersion(),
  capabilities: Object.values(CAPABILITIES),
  commands,
  handlers: [
    { path: ['issue'], handler: issue },
    { path: ['renew'], handler: renew },
    { path: ['status'], handler: status },
    { path: ['automation', 'enable'], handler: enable },
    { path: ['automation', 'status'], handler: automationStatus },
    { path: ['automation', 'disable'], handler: disable },
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
