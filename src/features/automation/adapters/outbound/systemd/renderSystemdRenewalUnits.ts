import type { CertificateRuntimePreference } from '../../../../../types/certificates.js';

interface RenderSystemdRenewalUnitsInput {
  readonly ankhCommand: readonly [string, string];
  readonly deployCommand?: string;
  readonly runtimePreference: CertificateRuntimePreference;
  readonly storageDirectory: string;
}

/*** Render deterministic systemd service and timer units for daily TLS renewal checks. */
export function renderSystemdRenewalUnits(input: RenderSystemdRenewalUnitsInput): {
  readonly service: string;
  readonly timer: string;
} {
  if (input.storageDirectory.trim() === '') {
    throw new Error('Certificate storage directory must not be empty.');
  }

  const command = [
    ...input.ankhCommand,
    'tls',
    'renew',
    '--storage',
    input.storageDirectory,
    '--runtime',
    input.runtimePreference,
    ...(input.deployCommand === undefined ? [] : ['--deploy-command', input.deployCommand]),
  ]
    .map(escapeExecArgument)
    .join(' ');

  return {
    service: [
      '[Unit]',
      'Description=TLS certificate renewal check',
      'After=network-online.target',
      'Wants=network-online.target',
      '',
      '[Service]',
      'Type=oneshot',
      `ExecStart=${command}`,
      '',
    ].join('\n'),
    timer: [
      '[Unit]',
      'Description=Daily TLS certificate renewal check',
      '',
      '[Timer]',
      'OnCalendar=daily',
      'RandomizedDelaySec=6h',
      'Persistent=true',
      'Unit=ankh-tls-renew.service',
      '',
      '[Install]',
      'WantedBy=timers.target',
      '',
    ].join('\n'),
  };
}

/*** Escape one systemd ExecStart argument while neutralizing specifier expansion. */
function escapeExecArgument(value: string): string {
  const escaped = value.replaceAll('%', '%%').replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `"${escaped}"`;
}
