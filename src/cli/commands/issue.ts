import type { AnkhCommandHandler } from '@ankhorage/ankh';

import { createDockerCertbotRuntime } from '../../features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.js';
import { checkIssueReadinessAsync } from '../../features/certificates/application/use-cases/checkIssueReadinessAsync.js';
import { issueCertificatesAsync } from '../../features/certificates/application/use-cases/issueCertificatesAsync.js';
import { CERTBOT_STORAGE_VOLUME } from '../../features/certificates/constants/certbot.js';
import type { TlsPreflightCheck } from '../../types/preflight.js';

/*** Run readiness checks and issue certificates only when every prerequisite passes. */
export const issue: AnkhCommandHandler = async (request) => {
  try {
    const parsed = parseIssueArguments(request.argv);
    const runtime = createDockerCertbotRuntime({
      storageVolumeName: parsed.storageVolumeName,
    });
    const checks = await checkIssueReadinessAsync(runtime, parsed.domains);
    request.context.writeStdout(renderChecks(checks));

    if (checks.some(({ status }) => status === 'fail')) {
      request.context.writeStderr(
        'TLS issue aborted: fix the failed prerequisite(s) above and retry.\n',
      );
      return { exitCode: 1 };
    }

    await issueCertificatesAsync(runtime, parsed);
    request.context.writeStdout(
      `Issued ${parsed.domains.length} certificate(s): ${parsed.domains.join(', ')}\n`,
    );
    return { exitCode: 0 };
  } catch (error) {
    request.context.writeStderr(`TLS issue failed: ${getErrorMessage(error)}\n`);
    return { exitCode: 1 };
  }
};

interface ParsedIssueArguments {
  readonly domains: readonly string[];
  readonly email: string;
  readonly forceRenewal: boolean;
  readonly staging: boolean;
  readonly storageVolumeName: string;
}

interface IssueParseState {
  readonly domains: readonly string[];
  readonly email?: string;
  readonly forceRenewal: boolean;
  readonly staging: boolean;
  readonly storageVolumeName: string;
}

/*** Parse issue arguments while preserving domain order. */
function parseIssueArguments(argv: readonly string[]): ParsedIssueArguments {
  const parsed = parseTokens(argv, {
    domains: [],
    forceRenewal: false,
    staging: false,
    storageVolumeName: CERTBOT_STORAGE_VOLUME,
  });

  if (parsed.email === undefined) {
    throw new Error(
      'Usage: ankh tls issue <domain...> --email <email> [--storage-volume <name>] [--staging] [--force-renewal]',
    );
  }

  return { ...parsed, email: parsed.email };
}

/*** Recursively consume issue tokens without mutable parser state. */
function parseTokens(argv: readonly string[], parsed: IssueParseState): IssueParseState {
  const [token, value, ...rest] = argv;
  if (token === undefined) return parsed;

  if (token === '--staging') {
    return parseTokens(argv.slice(1), { ...parsed, staging: true });
  }

  if (token === '--force-renewal') {
    return parseTokens(argv.slice(1), { ...parsed, forceRenewal: true });
  }

  if (token === '--email' || token === '--storage-volume') {
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${token} requires a value.`);
    }
    return parseTokens(
      rest,
      token === '--email'
        ? { ...parsed, email: value }
        : { ...parsed, storageVolumeName: value },
    );
  }

  if (token.startsWith('--')) throw new Error(`Unknown option: ${token}`);
  return parseTokens(argv.slice(1), {
    ...parsed,
    domains: [...parsed.domains, token],
  });
}

/*** Render the issue prerequisite checklist with actionable failure tips. */
function renderChecks(checks: readonly TlsPreflightCheck[]): string {
  const lines = ['TLS issue preflight:', ''];
  for (const item of checks) {
    lines.push(`${item.status === 'pass' ? '✓' : '✗'} ${item.label} — ${item.message}`);
    if (item.status === 'fail' && item.tip !== undefined) {
      lines.push(`  Tip: ${item.tip}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

/*** Convert an unknown failure to stable CLI text. */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
