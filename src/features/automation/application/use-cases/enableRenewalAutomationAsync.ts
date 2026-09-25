import type { CertificateRuntimePreference } from '../../../../types/certificates.js';
import type { RenewalSchedulerPort } from '../ports/outbound/renewalSchedulerPort.js';

/*** Enable idempotent periodic TLS renewal checks through the configured scheduler. */
export async function enableRenewalAutomationAsync(
  scheduler: RenewalSchedulerPort,
  input: {
    readonly deployCommand?: string;
    readonly runtimePreference: CertificateRuntimePreference;
    readonly storageDirectory: string;
  },
): Promise<void> {
  if (input.storageDirectory.trim() === '') {
    throw new Error('Certificate storage directory must not be empty.');
  }

  await scheduler.enableAsync(input);
}
