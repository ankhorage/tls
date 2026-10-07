import type { AnkhRuntimeCommandProvider } from '@ankhorage/ankh';
import type { Capability } from '@ankhorage/contracts/capabilities';

import packageJson from '../../package.json' with { type: 'json' };
import { CAPABILITIES } from '../capabilities/index.js';
import { disable } from './commands/automation/disable.js';
import { enable } from './commands/automation/enable.js';
import { status as automationStatus } from './commands/automation/status.js';
import { issue } from './commands/issue.js';
import { renew } from './commands/renew.js';
import { status } from './commands/status.js';

const commands = [
  {
    path: ['issue'],
    capability: 'tls.issue' satisfies Capability['id'],
    summary: 'Preflight HTTP-01 prerequisites and issue one certificate per domain.',
    examples: [
      'ankh tls issue app.example.com --email admin@example.com',
      'ankh tls issue app.example.com --email admin@example.com --consumer nginx',
    ],
  },
  {
    path: ['renew'],
    capability: 'tls.renew' satisfies Capability['id'],
    summary: 'Renew certificates that are due according to persisted ACME state.',
    examples: ['ankh tls renew --dry-run', 'ankh tls renew --deploy-command "nginx -s reload"'],
  },
  {
    path: ['status'],
    capability: 'tls.status' satisfies Capability['id'],
    summary: 'Show the certificates known to the TLS runtime.',
  },
  {
    path: ['automation', 'enable'],
    capability: 'tls.automation.enable' satisfies Capability['id'],
    summary: 'Enable persistent daily TLS renewal checks.',
  },
  {
    path: ['automation', 'status'],
    capability: 'tls.automation.status' satisfies Capability['id'],
    summary: 'Show TLS renewal scheduler state.',
  },
  {
    path: ['automation', 'disable'],
    capability: 'tls.automation.disable' satisfies Capability['id'],
    summary: 'Disable TLS renewal scheduling.',
  },
] as const;

const provider = {
  id: packageJson.name,
  category: 'tls',
  version: packageJson.version,
  capabilities: CAPABILITIES,
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
