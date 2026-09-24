import { describe, expect, test } from 'bun:test';

import type { CertificateRuntimePort } from '../ports/outbound/certificateRuntimePort.js';
import { checkIssueReadinessAsync } from './checkIssueReadinessAsync.js';

describe('checkIssueReadinessAsync', () => {
  test('keeps syntax checks before runtime checks', async () => {
    const runtime = createRuntime();
    const checks = await checkIssueReadinessAsync(runtime, ['app.example.com']);
    expect(checks.map(({ id }) => id)).toEqual(['domain:app.example.com', 'docker']);
  });

  test('does not invoke runtime preflight when every hostname is invalid', async () => {
    let invoked = false;
    const runtime = createRuntime(() => {
      invoked = true;
    });
    const checks = await checkIssueReadinessAsync(runtime, ['https://bad']);
    expect(checks[0]?.status).toBe('fail');
    expect(invoked).toBe(false);
  });
});

/*** Create a deterministic fake certificate runtime for readiness tests. */
function createRuntime(onPreflight: () => void = () => undefined): CertificateRuntimePort {
  return {
    issueAsync: () => Promise.resolve(),
    preflightAsync: () => {
      onPreflight();
      return Promise.resolve([
        { id: 'docker', label: 'Docker daemon', message: 'ok', status: 'pass' },
      ]);
    },
    renewAsync: () => Promise.resolve(),
    statusAsync: () => Promise.resolve(''),
  };
}
