import type {
  RenewalAutomationStatus,
  RenewalSchedulerPort,
} from '../ports/outbound/renewalSchedulerPort.js';

/*** Read scheduler state without mutating renewal automation. */
export async function readRenewalAutomationStatusAsync(
  scheduler: RenewalSchedulerPort,
): Promise<RenewalAutomationStatus> {
  return scheduler.statusAsync();
}
