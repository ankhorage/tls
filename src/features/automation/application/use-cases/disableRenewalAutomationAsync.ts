import type { RenewalSchedulerPort } from '../ports/outbound/renewalSchedulerPort.js';

/*** Disable periodic TLS renewal checks and remove scheduler-owned state. */
export async function disableRenewalAutomationAsync(
  scheduler: RenewalSchedulerPort,
): Promise<void> {
  await scheduler.disableAsync();
}
