import type { Capability } from '@ankhorage/contracts/capabilities';

export const CAPABILITIES = [
  {
    id: 'tls.issue',
    owner: '@ankhorage/tls',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Issue certificate',
    description: 'Preflight HTTP-01 prerequisites and issue one certificate per domain.',
  },
  {
    id: 'tls.renew',
    owner: '@ankhorage/tls',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Renew certificates',
    description: 'Renew certificates that are due according to persisted ACME state.',
  },
  {
    id: 'tls.status',
    owner: '@ankhorage/tls',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Inspect TLS status',
    description: 'Show the certificates known to the TLS runtime.',
  },
  {
    id: 'tls.automation.enable',
    owner: '@ankhorage/tls',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Enable TLS automation',
    description: 'Enable persistent daily TLS renewal checks.',
  },
  {
    id: 'tls.automation.status',
    owner: '@ankhorage/tls',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Inspect TLS automation',
    description: 'Show TLS renewal scheduler state.',
  },
  {
    id: 'tls.automation.disable',
    owner: '@ankhorage/tls',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Disable TLS automation',
    description: 'Disable TLS renewal scheduling.',
  },
] as const satisfies readonly Capability[];
