import type { CertificateRenewalResult } from '../../../../types/certificates.js';
import type { CertificateRuntimePort } from '../ports/outbound/certificateRuntimePort.js';

/*** Renew all due certificates using the runtime's persisted renewal configuration. */
export async function renewCertificatesAsync(
  runtime: CertificateRuntimePort,
  input: { readonly dryRun?: boolean } = {},
): Promise<CertificateRenewalResult> {
  return runtime.renewAsync({ dryRun: input.dryRun ?? false });
}
