import { join, resolve } from 'node:path';

import type { CertificateStoragePaths } from '../../../../types/certificates.js';
import type { TlsConsumer } from '../../domain/tlsConsumer.js';
import type { ConsumerConfigDiscoveryPort } from '../ports/outbound/consumerConfigDiscoveryPort.js';

interface BuildTlsConsumerGuidanceInput {
  readonly configPath?: string;
  readonly consumer: TlsConsumer;
  readonly cwd: string;
  readonly domains: readonly string[];
  readonly storage: CertificateStoragePaths;
}

export interface TlsConsumerGuidance {
  readonly configPath: string | null;
  readonly text: string;
}

/*** Discover an optional consumer config and render non-mutating integration guidance. */
export async function buildTlsConsumerGuidanceAsync(
  discovery: ConsumerConfigDiscoveryPort,
  input: BuildTlsConsumerGuidanceInput,
): Promise<TlsConsumerGuidance> {
  const configPath = await resolveConfigPathAsync(discovery, input);
  return {
    configPath,
    text: renderGuidance(input, configPath),
  };
}

/*** Resolve an explicit consumer config or discover the first standard candidate path. */
async function resolveConfigPathAsync(
  discovery: ConsumerConfigDiscoveryPort,
  input: BuildTlsConsumerGuidanceInput,
): Promise<string | null> {
  if (input.configPath !== undefined) {
    const explicitPath = resolve(input.configPath);
    if (!(await discovery.pathExistsAsync(explicitPath))) {
      throw new Error(`Consumer config does not exist: ${explicitPath}`);
    }
    return explicitPath;
  }

  return discovery.findFirstExistingAsync(candidatePaths(input.consumer, input.cwd));
}

/*** Return standard configuration candidates without assuming that any one path must exist. */
function candidatePaths(consumer: TlsConsumer, cwd: string): readonly string[] {
  const local = (name: string) => resolve(cwd, name);
  switch (consumer) {
    case 'generic':
      return [];
    case 'caddy':
      return [local('Caddyfile'), '/etc/caddy/Caddyfile'];
    case 'nginx':
      return [local('nginx.conf'), '/etc/nginx/nginx.conf'];
    case 'apache':
      return [
        local('apache2.conf'),
        local('httpd.conf'),
        '/etc/apache2/apache2.conf',
        '/etc/httpd/conf/httpd.conf',
      ];
    case 'haproxy':
      return [local('haproxy.cfg'), '/etc/haproxy/haproxy.cfg'];
    case 'traefik':
      return [
        local('traefik.yml'),
        local('traefik.yaml'),
        local('traefik.toml'),
        '/etc/traefik/traefik.yml',
        '/etc/traefik/traefik.yaml',
        '/etc/traefik/traefik.toml',
      ];
    case 'envoy':
      return [local('envoy.yaml'), local('envoy.yml'), '/etc/envoy/envoy.yaml'];
    case 'kubernetes':
      return [
        local('kustomization.yaml'),
        local('Chart.yaml'),
        local('deployment.yaml'),
        local('deployment.yml'),
      ];
  }
}

/*** Render paths and consumer-specific suggestions without editing third-party configuration. */
function renderGuidance(input: BuildTlsConsumerGuidanceInput, configPath: string | null): string {
  const lines = [
    `TLS consumer: ${input.consumer}`,
    `storage: ${input.storage.rootDirectory}`,
    `HTTP-01 webroot: ${input.storage.webrootDirectory}`,
    configPath === null
      ? 'consumer config: not detected; pass --consumer-config <path> if desired'
      : `consumer config: ${configPath}`,
    ...input.domains.flatMap((domain) => [
      `certificate ${domain}: ${join(input.storage.configDirectory, 'live', domain, 'fullchain.pem')}`,
      `private key ${domain}: ${join(input.storage.configDirectory, 'live', domain, 'privkey.pem')}`,
    ]),
    '',
    ...consumerAdvice(input.consumer, input.storage.webrootDirectory),
    '',
  ];
  return lines.join('\n');
}

/*** Render concise profile advice while keeping consumer mutation outside TLS core. */
function consumerAdvice(consumer: TlsConsumer, webrootDirectory: string): readonly string[] {
  switch (consumer) {
    case 'generic':
      return [
        `Serve /.well-known/acme-challenge/* from ${webrootDirectory} on HTTP port 80.`,
        'Configure your TLS consumer with the reported fullchain.pem and privkey.pem files.',
      ];
    case 'caddy':
      return [
        'Caddy has native ACME and should normally manage its own certificates.',
        `For externally managed HTTP-01, route /.well-known/acme-challenge/* to ${webrootDirectory}.`,
        'If you intentionally use these files, configure the Caddy tls directive with the reported certificate and key paths.',
      ];
    case 'nginx':
      return [
        `Map location ^~ /.well-known/acme-challenge/ to ${webrootDirectory}.`,
        'Set ssl_certificate and ssl_certificate_key to the reported files.',
      ];
    case 'apache':
      return [
        `Expose ${webrootDirectory}/.well-known/acme-challenge/ with an Alias or equivalent HTTP mapping.`,
        'Set SSLCertificateFile and SSLCertificateKeyFile to the reported files.',
      ];
    case 'haproxy':
      return [
        `Serve HTTP-01 from ${webrootDirectory} through the frontend handling port 80.`,
        'HAProxy commonly expects a combined PEM; keep that deployment transformation outside TLS core.',
      ];
    case 'traefik':
      return [
        'Traefik has native ACME and should normally manage its own certificates.',
        `If using external HTTP-01, expose ${webrootDirectory} and reference the reported certificate files from dynamic TLS configuration.`,
      ];
    case 'envoy':
      return [
        `Route ACME HTTP-01 requests to ${webrootDirectory} or an equivalent static-file endpoint.`,
        'Reference the reported certificate_chain and private_key files, or adapt them through SDS.',
      ];
    case 'kubernetes':
      return [
        'Kubernetes deployments should normally prefer cert-manager for in-cluster certificate lifecycle.',
        'If these external files are intentional, deploy them through a Secret or another explicit deployment adapter.',
      ];
  }
}
