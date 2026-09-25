import type { RunProcessAsync } from '../../../types/process.js';
import { createSystemdRenewalScheduler } from '../adapters/outbound/systemd/createSystemdRenewalScheduler.js';
import type { RenewalSchedulerPort } from '../application/ports/outbound/renewalSchedulerPort.js';

interface CreateRenewalSchedulerOptions {
  readonly ankhCommand: readonly [string, string];
  readonly runProcessAsync?: RunProcessAsync;
  readonly systemctlExecutable?: string;
  readonly unitDirectory?: string;
}

/*** Compose the host renewal scheduler without exposing its concrete adapter to CLI commands. */
export function createRenewalScheduler(
  options: CreateRenewalSchedulerOptions,
): RenewalSchedulerPort {
  return createSystemdRenewalScheduler(options);
}
