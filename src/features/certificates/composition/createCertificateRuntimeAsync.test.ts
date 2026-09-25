import { expect, test } from 'bun:test';

import type { RunProcessAsync } from '../../../types/process.js';
import { createCertificateRuntimeAsync } from './createCertificateRuntimeAsync.js';

test('auto runtime prefers native Certbot without probing Docker', async () => {
  const probes: string[] = [];
  const runProcessAsync = createProbe((executable) => {
    probes.push(executable);
    return executable === 'certbot' ? 0 : 1;
  });

  const resolved = await createCertificateRuntimeAsync({
    runProcessAsync,
    storageDirectory: '/tmp/tls-native',
  });

  expect(resolved.kind).toBe('native');
  expect(probes).toEqual(['certbot']);
});

test('auto runtime falls back to Docker only when native Certbot is unavailable', async () => {
  const probes: string[] = [];
  const runProcessAsync = createProbe((executable) => {
    probes.push(executable);
    return executable === 'docker' ? 0 : 1;
  });

  const resolved = await createCertificateRuntimeAsync({
    runProcessAsync,
    storageDirectory: '/tmp/tls-docker',
  });

  expect(resolved.kind).toBe('docker');
  expect(probes).toEqual(['certbot', 'docker']);
});

test('auto runtime reports an actionable failure when neither runtime exists', () => {
  const runProcessAsync = createProbe(() => 1);

  return expect(
    createCertificateRuntimeAsync({
      runProcessAsync,
      storageDirectory: '/tmp/tls-missing',
    }),
  ).rejects.toThrow('Install native Certbot or Docker');
});

/*** Create a deterministic executable probe for runtime-composition tests. */
function createProbe(exitCode: (executable: string) => number): RunProcessAsync {
  return (executable) =>
    Promise.resolve({
      exitCode: exitCode(executable),
      stderr: '',
      stdout: executable === 'certbot' ? 'certbot 5.8.0\n' : '27.0.0\n',
    });
}
