import type { CertificateRuntimePreference } from '../../../../../types/certificates.js';

export interface RenewalAutomationStatus {
  readonly active: boolean;
  readonly detail: string;
  readonly enabled: boolean;
}

export interface RenewalSchedulerPort {
  disableAsync(): Promise<void>;
  enableAsync(input: {
    readonly deployCommand?: string;
    readonly runtimePreference: CertificateRuntimePreference;
    readonly storageDirectory: string;
  }): Promise<void>;
  statusAsync(): Promise<RenewalAutomationStatus>;
}
