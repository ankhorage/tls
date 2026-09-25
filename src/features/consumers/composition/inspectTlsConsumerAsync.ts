import type { CertificateStoragePaths } from '../../../types/certificates.js';
import { createNodeConsumerConfigDiscovery } from '../adapters/outbound/node/createNodeConsumerConfigDiscovery.js';
import {
  buildTlsConsumerGuidanceAsync,
  type TlsConsumerGuidance,
} from '../application/use-cases/buildTlsConsumerGuidanceAsync.js';
import type { TlsConsumer } from '../domain/tlsConsumer.js';

interface InspectTlsConsumerInput {
  readonly configPath?: string;
  readonly consumer: TlsConsumer;
  readonly cwd: string;
  readonly domains: readonly string[];
  readonly storage: CertificateStoragePaths;
}

/*** Inspect one TLS consumer using the default host filesystem discovery adapter. */
export async function inspectTlsConsumerAsync(
  input: InspectTlsConsumerInput,
): Promise<TlsConsumerGuidance> {
  return buildTlsConsumerGuidanceAsync(createNodeConsumerConfigDiscovery(), input);
}
