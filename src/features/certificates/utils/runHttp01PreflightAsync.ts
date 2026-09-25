import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CertificateStoragePaths } from '../../../types/certificates.js';
import type { TlsPreflightCheck } from '../../../types/preflight.js';
import { prepareCertificateStorageAsync } from './prepareCertificateStorageAsync.js';

interface RunHttp01PreflightInput {
  readonly domains: readonly string[];
  readonly runtimeChecks: readonly TlsPreflightCheck[];
  readonly storage: CertificateStoragePaths;
}

/*** Verify runtime readiness, host storage, DNS, and the externally served HTTP-01 webroot. */
export async function runHttp01PreflightAsync(
  input: RunHttp01PreflightInput,
): Promise<readonly TlsPreflightCheck[]> {
  const storageCheck = await probeStorageAsync(input.storage);
  const dnsChecks = await Promise.all(input.domains.map(probeDnsAsync));
  if (storageCheck.status === 'fail') {
    return [...input.runtimeChecks, storageCheck, ...dnsChecks];
  }

  const token = `ankh-tls-${randomUUID().replaceAll('-', '')}`;
  await writeChallengeAsync(input.storage, token);
  const httpChecks = await Promise.all(
    input.domains.map((domain) => probeHttpAsync(domain, token)),
  );
  await removeChallengeAsync(input.storage, token);
  return [...input.runtimeChecks, storageCheck, ...dnsChecks, ...httpChecks];
}

/*** Verify that the host-owned certificate storage is writable. */
async function probeStorageAsync(storage: CertificateStoragePaths): Promise<TlsPreflightCheck> {
  try {
    await prepareCertificateStorageAsync(storage);
    return {
      id: 'storage',
      label: `Certificate storage ${storage.rootDirectory}`,
      message: 'Certificate storage is writable and the HTTP-01 webroot is ready.',
      status: 'pass',
    };
  } catch (error) {
    return {
      id: 'storage',
      label: `Certificate storage ${storage.rootDirectory}`,
      message: getErrorMessage(error),
      status: 'fail',
      tip: 'Choose a writable directory with --storage <path>.',
    };
  }
}

/*** Resolve one hostname before attempting ACME validation. */
async function probeDnsAsync(domain: string): Promise<TlsPreflightCheck> {
  try {
    const addresses = await lookup(domain, { all: true });
    return {
      id: `dns:${domain}`,
      label: `DNS ${domain}`,
      message: `Resolves to ${addresses.map(({ address }) => address).join(', ')}.`,
      status: 'pass',
    };
  } catch (error) {
    return {
      id: `dns:${domain}`,
      label: `DNS ${domain}`,
      message: getErrorMessage(error),
      status: 'fail',
      tip: 'Create an A/AAAA record that resolves this hostname to the public TLS server.',
    };
  }
}

/*** Fetch the exact token over HTTP to verify DNS, TCP/80, routing, and webroot mapping. */
async function probeHttpAsync(domain: string, token: string): Promise<TlsPreflightCheck> {
  try {
    const response = await fetch(`http://${domain}/.well-known/acme-challenge/${token}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    const ok = response.status === 200 && (await response.text()).trim() === token;
    return {
      id: `http01:${domain}`,
      label: `HTTP-01 ${domain}:80`,
      message: ok
        ? 'Challenge roundtrip succeeded.'
        : `Received HTTP ${response.status} instead of the challenge token.`,
      status: ok ? 'pass' : 'fail',
      ...(ok
        ? {}
        : {
            tip: 'Serve /.well-known/acme-challenge/* from the reported TLS webroot on port 80 without redirecting that path.',
          }),
    };
  } catch (error) {
    return {
      id: `http01:${domain}`,
      label: `HTTP-01 ${domain}:80`,
      message: getErrorMessage(error),
      status: 'fail',
      tip: 'Verify DNS, TCP/80, and the web-server mapping for the reported TLS webroot.',
    };
  }
}

/*** Write one temporary HTTP-01 token directly into host-owned storage. */
async function writeChallengeAsync(storage: CertificateStoragePaths, token: string): Promise<void> {
  const directory = join(storage.webrootDirectory, '.well-known', 'acme-challenge');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, token), token, 'utf8');
}

/*** Remove the temporary HTTP-01 readiness token. */
async function removeChallengeAsync(
  storage: CertificateStoragePaths,
  token: string,
): Promise<void> {
  await rm(join(storage.webrootDirectory, '.well-known', 'acme-challenge', token), {
    force: true,
  });
}

/*** Convert an unknown failure to a stable readiness message. */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
