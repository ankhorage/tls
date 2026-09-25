export type CertificateRuntimeKind = 'docker' | 'native';
export type CertificateRuntimePreference = 'auto' | CertificateRuntimeKind;

export interface CertificateStoragePaths {
  readonly configDirectory: string;
  readonly logsDirectory: string;
  readonly rootDirectory: string;
  readonly webrootDirectory: string;
  readonly workDirectory: string;
}

export interface ResolvedCertificateRuntime {
  readonly kind: CertificateRuntimeKind;
  readonly runtime: import('../features/certificates/application/ports/outbound/certificateRuntimePort.js').CertificateRuntimePort;
  readonly storage: CertificateStoragePaths;
}
