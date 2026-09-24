import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RenewalSchedulerPort } from '../../../application/ports/outbound/renewalSchedulerPort.js';
import type { RunProcessAsync } from '../../../../../types/process.js';
import { runCheckedProcessAsync } from '../../../../certificates/utils/runCheckedProcessAsync.js';
import { runProcessAsync as defaultRunProcessAsync } from '../../../../certificates/utils/runProcessAsync.js';
import { renderSystemdRenewalUnits } from './renderSystemdRenewalUnits.js';

interface CreateSystemdRenewalSchedulerOptions {
  readonly ankhCommand: readonly [string, string];
  readonly runProcessAsync?: RunProcessAsync;
  readonly systemctlExecutable?: string;
  readonly unitDirectory?: string;
}

const SERVICE_NAME = 'ankh-tls-renew.service';
const TIMER_NAME = 'ankh-tls-renew.timer';

/*** Create the systemd adapter that owns TLS renewal service and timer units. */
export function createSystemdRenewalScheduler(
  options: CreateSystemdRenewalSchedulerOptions,
): RenewalSchedulerPort {
  const runProcessAsync = options.runProcessAsync ?? defaultRunProcessAsync;
  const systemctlExecutable = options.systemctlExecutable ?? 'systemctl';
  const unitDirectory = options.unitDirectory ?? '/etc/systemd/system';

  return {
    async enableAsync(input) {
      assertSystemdPlatform();
      const units = renderSystemdRenewalUnits({
        ankhCommand: options.ankhCommand,
        storageVolumeName: input.storageVolumeName,
      });
      await mkdir(unitDirectory, { recursive: true });
      await Promise.all([
        writeFile(join(unitDirectory, SERVICE_NAME), units.service, 'utf8'),
        writeFile(join(unitDirectory, TIMER_NAME), units.timer, 'utf8'),
      ]);
      await runCheckedProcessAsync(systemctlExecutable, ['daemon-reload'], runProcessAsync);
      await runCheckedProcessAsync(
        systemctlExecutable,
        ['enable', '--now', TIMER_NAME],
        runProcessAsync,
      );
    },
    async disableAsync() {
      assertSystemdPlatform();
      await runProcessAsync(systemctlExecutable, ['disable', '--now', TIMER_NAME]);
      await Promise.all([
        rm(join(unitDirectory, SERVICE_NAME), { force: true }),
        rm(join(unitDirectory, TIMER_NAME), { force: true }),
      ]);
      await runCheckedProcessAsync(systemctlExecutable, ['daemon-reload'], runProcessAsync);
    },
    async statusAsync() {
      assertSystemdPlatform();
      const [enabled, active] = await Promise.all([
        runProcessAsync(systemctlExecutable, ['is-enabled', TIMER_NAME]),
        runProcessAsync(systemctlExecutable, ['is-active', TIMER_NAME]),
      ]);
      return {
        active: active.exitCode === 0,
        detail: `${enabled.stdout.trim() || enabled.stderr.trim() || 'unknown'} / ${active.stdout.trim() || active.stderr.trim() || 'unknown'}`,
        enabled: enabled.exitCode === 0,
      };
    },
  };
}

/*** Reject systemd scheduling on non-Linux hosts with an actionable error. */
function assertSystemdPlatform(): void {
  if (process.platform !== 'linux') {
    throw new Error('The built-in renewal scheduler currently requires Linux with systemd.');
  }
}
