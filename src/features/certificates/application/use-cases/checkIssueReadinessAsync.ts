import type { TlsPreflightCheck } from '../../../../types/preflight.js';
import type { CertificateRuntimePort } from '../ports/outbound/certificateRuntimePort.js';

/*** Validate requested hostnames and inspect HTTP-01 runtime readiness before certificate issuance. */
export async function checkIssueReadinessAsync(
  runtime: CertificateRuntimePort,
  domains: readonly string[],
): Promise<readonly TlsPreflightCheck[]> {
  if (domains.length === 0) {
    return [
      {
        id: 'domains',
        label: 'Certificate domains supplied',
        message: 'No domains were supplied.',
        status: 'fail',
        tip: 'Pass at least one hostname, for example: ankh tls issue app.example.com --email you@example.com',
      },
    ];
  }

  const syntaxChecks = domains.map(createDomainSyntaxCheck);
  const validDomains = domains.filter((domain) => isDomain(domain));
  if (validDomains.length === 0) return syntaxChecks;

  return [...syntaxChecks, ...(await runtime.preflightAsync({ domains: validDomains }))];
}

/*** Build a deterministic hostname-syntax result before any network or Docker work. */
function createDomainSyntaxCheck(domain: string): TlsPreflightCheck {
  const valid = isDomain(domain);
  return {
    id: `domain:${domain}`,
    label: `Hostname ${domain}`,
    message: valid ? 'Hostname syntax is valid.' : 'Hostname syntax is invalid.',
    status: valid ? 'pass' : 'fail',
    ...(valid
      ? {}
      : {
          tip: 'Use a DNS hostname only; omit https://, paths, ports, wildcards, and trailing dots.',
        }),
  };
}

/*** Accept ordinary DNS hostnames suitable for HTTP-01 validation. */
function isDomain(domain: string): boolean {
  const labels = domain.split('.');
  return (
    domain.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/iu.test(label),
    )
  );
}
