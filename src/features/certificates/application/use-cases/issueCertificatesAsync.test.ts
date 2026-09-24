import { describe, expect, test } from 'bun:test';

import type { CertificateRuntimePort } from '../ports/outbound/certificateRuntimePort.js';
import { issueCertificatesAsync } from './issueCertificatesAsync.js';

describe('issueCertificatesAsync', () => {
  test('issues each unique domain independently', async () => {
    const issued: string[] = [];
    const runtime = createRuntime(async ({ domain }) => {\n      issued.push(domain);\n    });
    await issueCertificatesAsync(runtime, {
      domains: ['a.example.com', 'a.example.com', 'b.example.com'],
      email: 'admin@example.com',
    });
    expect(issued).toEqual(['a.example.com', 'b.example.com']);
  });
});

/*** Create a deterministic fake runtime for issue orchestration tests. */
function createRuntime(
  issueAsync: CertificateRuntimePort['issueAsync'],
): CertificateRuntimePort {
  return {
    issueAsync,
    preflightAsync: async () => [],
    renewAsync: async () => undefined,
    statusAsync: async () => '',
  };
}
