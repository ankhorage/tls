import type { TlsPreflightCheck } from '../../../../types/preflight.js';
import { isHttp01Domain } from '../../domain/isHttp01Domain.js';
import type { CertificateRuntimePort } from '../ports/outbound/certificateRuntimePort.js';

/*** Validate requested hostnames and inspect HTTP-01 runtime readiness before certificate issuance. */
export async function checkIssueReadinessAsync(
  runtime: CertificateRuntimePort,
  domains: readonly string[],
): Promise<readonly TlsPreflightCheck[]> {
  if (domains.length === 0) return [missingDomainsCheck()];

  const syntaxChecks = domains.map(createDomainSyntaxCheck);
  const validDomains = domains.filter(isHttp01Domain);
  if (validDomains.length === 0) return syntaxChecks;

  return [...syntaxChecks, ...(await runtime.preflightAsync({ domains: validDomains }))];
}

/*** Build the actionable result used when no certificate hostname was supplied. */
function missingDomainsCheck(): TlsPreflightCheck {
  return {
    id: 'domains',
    label: 'Certificate domains supplied',
    message: 'No domains were supplied.',
    status: 'fail',
    tip: 'Pass at least one hostname, for example: ankh tls issue app.example.com --email you@example.com',
  };
}

/*** Build a deterministic hostname-syntax result before network or Docker work. */
function createDomainSyntaxCheck(domain: string): TlsPreflightCheck {
  const valid = isHttp01Domain(domain);
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
