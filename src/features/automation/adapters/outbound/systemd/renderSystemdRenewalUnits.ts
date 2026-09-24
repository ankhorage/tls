interface RenderSystemdRenewalUnitsInput {
  readonly ankhCommand: readonly [string, string];
  readonly storageVolumeName: string;
}

/*** Render deterministic systemd service and timer units for daily TLS renewal checks. */
export function renderSystemdRenewalUnits(input: RenderSystemdRenewalUnitsInput): {
  readonly service: string;
  readonly timer: string;
} {
  validateStorageVolumeName(input.storageVolumeName);

  const command = [
    ...input.ankhCommand,
    'tls',
    'renew',
    '--storage-volume',
    input.storageVolumeName,
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

/*** Reject storage names that cannot safely cross CLI, Docker, and systemd boundaries. */
function validateStorageVolumeName(value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/u.test(value)) {
    throw new Error(
      'Certificate storage volume must contain only letters, digits, underscore, period, and hyphen.',
    );
  }
}

/*** Escape one systemd ExecStart argument while neutralizing specifier expansion. */
function escapeExecArgument(value: string): string {
  const escaped = value.replaceAll('%', '%%').replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `"${escaped}"`;
}
