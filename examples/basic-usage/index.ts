/***
 * Issue a certificate after HTTP-01 readiness succeeds
 *
 * The certificate lifecycle stays provider-agnostic. This example composes the built-in Docker
 * Certbot adapter, runs the same readiness checks used by `ankh tls issue`, and issues only when
 * every prerequisite passes.
 *
 * @usage
 */
import {
  checkIssueReadinessAsync,
  createDockerCertbotRuntime,
  issueCertificatesAsync,
} from '@ankhorage/tls';

const runtime = createDockerCertbotRuntime({
  storageVolumeName: 'tls-state',
});
const domains = ['app.example.com'];
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
