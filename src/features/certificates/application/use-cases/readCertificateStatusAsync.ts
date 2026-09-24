import type { CertificateRuntimePort } from '../ports/outbound/certificateRuntimePort.js';

/*** Read the certificate inventory without changing persisted state. */
export async function readCertificateStatusAsync(runtime: CertificateRuntimePort): Promise<string> {
  return runtime.statusAsync();
}
