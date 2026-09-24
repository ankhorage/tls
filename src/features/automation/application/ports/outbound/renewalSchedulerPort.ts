export interface RenewalAutomationStatus {
  readonly active: boolean;
  readonly detail: string;
  readonly enabled: boolean;
}

export interface RenewalSchedulerPort {
  disableAsync(): Promise<void>;
  enableAsync(input: { readonly storageVolumeName: string }): Promise<void>;
  statusAsync(): Promise<RenewalAutomationStatus>;
}
