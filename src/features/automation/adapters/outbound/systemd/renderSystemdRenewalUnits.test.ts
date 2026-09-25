import { describe, expect, test } from 'bun:test';

import { renderSystemdRenewalUnits } from './renderSystemdRenewalUnits.js';

describe('renderSystemdRenewalUnits', () => {
  test('renders persistent daily renewal with a randomized delay', () => {
    const units = renderSystemdRenewalUnits({
      ankhCommand: ['/opt/bun/bin/bun', '/opt/ankh/dist/bin.js'],
      deployCommand: 'docker exec caddy caddy reload --config /etc/caddy/Caddyfile',
      runtimePreference: 'auto',
      storageDirectory: '/var/lib/ankh tls',
    });

    expect(units.service).toContain(
      'ExecStart="/opt/bun/bin/bun" "/opt/ankh/dist/bin.js" "tls" "renew" "--storage" "/var/lib/ankh tls" "--runtime" "auto" "--deploy-command" "docker exec caddy caddy reload --config /etc/caddy/Caddyfile"',
    );
    expect(units.timer).toContain('OnCalendar=daily');
    expect(units.timer).toContain('RandomizedDelaySec=6h');
    expect(units.timer).toContain('Persistent=true');
  });

  test('rejects empty storage paths', () => {
    expect(() =>
      renderSystemdRenewalUnits({
        ankhCommand: ['/usr/bin/bun', '/opt/ankh.js'],
        runtimePreference: 'native',
        storageDirectory: '   ',
      }),
    ).toThrow();
  });
});
