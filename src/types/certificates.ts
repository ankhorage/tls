import type { CertificateRuntimePort } from '../features/certificates/application/ports/outbound/certificateRuntimePort.js';

export type CertificateRuntimeKind = 'docker' | 'native';
export type CertificateRuntimePreference = 'auto' | CertificateRuntimeKind;

export interface CertificateRenewalResult {
  readonly renewed: boolean;
}

export interface CertificateStoragePaths {
  readonly configDirectory: string;
  readonly logsDirectory: string;
  readonly rootDirectory: string;
  readonly webrootDirectory: string;
  readonly workDirectory: string;
}

export interface ResolvedCertificateRuntime {
  readonly kind: CertificateRuntimeKind;
  readonly runtime: CertificateRuntimePort;
  readonly storage: CertificateStoragePaths;
}
