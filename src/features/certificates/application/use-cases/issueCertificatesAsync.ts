import type { CertificateRuntimePort } from '../ports/outbound/certificateRuntimePort.js';

/*** Issue one independently renewable certificate for every requested domain. */
export async function issueCertificatesAsync(
  runtime: CertificateRuntimePort,
  input: {
    readonly domains: readonly string[];
    readonly email: string;
    readonly forceRenewal?: boolean;
    readonly staging?: boolean;
  },
): Promise<void> {
  if (input.domains.length === 0) throw new Error('At least one domain is required.');
  if (input.email.trim() === '') throw new Error('A non-empty ACME account email is required.');

  for (const domain of [...new Set(input.domains)]) {
    await runtime.issueAsync({
      domain,
      email: input.email,
      forceRenewal: input.forceRenewal ?? false,
      staging: input.staging ?? false,
    });
  }
}
