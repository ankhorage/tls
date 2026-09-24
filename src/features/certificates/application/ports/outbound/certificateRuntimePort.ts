import type { TlsPreflightCheck } from '../../../../../types/preflight.js';

export interface CertificateRuntimePort {
  issueAsync(input: {
    readonly domain: string;
    readonly email: string;
    readonly forceRenewal: boolean;
    readonly staging: boolean;
  }): Promise<void>;
  preflightAsync(input: { readonly domains: readonly string[] }): Promise<readonly TlsPreflightCheck[]>;
  renewAsync(input: { readonly dryRun: boolean }): Promise<void>;
  statusAsync(): Promise<string>;
}
