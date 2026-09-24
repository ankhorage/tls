import { describe, expect, test } from 'bun:test';

import { renderSystemdRenewalUnits } from './renderSystemdRenewalUnits.js';

describe('renderSystemdRenewalUnits', () => {
  test('renders persistent daily renewal with a randomized delay', () => {
    const units = renderSystemdRenewalUnits({
      ankhCommand: ['/opt/bun/bin/bun', '/opt/ankh/dist/bin.js'],
      storageVolumeName: 'tls-state',
    });

    expect(units.service).toContain(
      'ExecStart="/opt/bun/bin/bun" "/opt/ankh/dist/bin.js" "tls" "renew" "--storage-volume" "tls-state"',
    );
    expect(units.timer).toContain('OnCalendar=daily');
    expect(units.timer).toContain('RandomizedDelaySec=6h');
    expect(units.timer).toContain('Persistent=true');
  });

  test('rejects unsafe storage-volume syntax', () => {
    expect(() =>
      renderSystemdRenewalUnits({
        ankhCommand: ['/usr/bin/bun', '/opt/ankh.js'],
        storageVolumeName: 'bad volume',
      }),
    ).toThrow();
  });
});
