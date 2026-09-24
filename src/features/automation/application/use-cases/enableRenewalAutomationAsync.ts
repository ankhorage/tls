import type { RenewalSchedulerPort } from '../ports/outbound/renewalSchedulerPort.js';

/*** Enable idempotent periodic TLS renewal checks through the configured scheduler. */
export async function enableRenewalAutomationAsync(
  scheduler: RenewalSchedulerPort,
  storageVolumeName: string,
): Promise<void> {
  if (storageVolumeName.trim() === '') {
    throw new Error('Certificate storage volume name must not be empty.');
  }

  await scheduler.enableAsync({ storageVolumeName });
}
