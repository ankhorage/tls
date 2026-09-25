/***
 * Issue a certificate with automatically selected Certbot runtime
 *
 * TLS owns host-based certificate storage and does not require Docker. Runtime selection prefers
 * native Certbot and falls back to the Docker adapter when available. The same storage tree and
 * HTTP-01 contract can be consumed by any web server through explicit configuration.
 *
 * @usage
 */
import {
  checkIssueReadinessAsync,
  createCertificateRuntimeAsync,
  issueCertificatesAsync,
} from '@ankhorage/tls';

const { runtime, storage } = await createCertificateRuntimeAsync({
  storageDirectory: '.ankh-tls',
});
const domains = ['app.example.com'];

console.log(`Serve HTTP-01 challenges from ${storage.webrootDirectory}`);
const checks = await checkIssueReadinessAsync(runtime, domains);

if (checks.some(({ status }) => status === 'fail')) {
  console.error(checks);
  process.exitCode = 1;
} else {
  await issueCertificatesAsync(runtime, {
    domains,
    email: 'admin@example.com',
  });
}
