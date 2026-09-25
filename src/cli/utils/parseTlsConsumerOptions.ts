import { isTlsConsumer, type TlsConsumer } from '../../features/consumers/domain/tlsConsumer.js';

interface ParsedTlsConsumerOptions {
  readonly configPath?: string;
  readonly consumer?: TlsConsumer;
  readonly remaining: readonly string[];
}

/*** Parse optional TLS consumer guidance flags without changing consumer configuration. */
export function parseTlsConsumerOptions(argv: readonly string[]): ParsedTlsConsumerOptions {
  const parsed = parseTokens(argv, { remaining: [] });
  if (parsed.configPath !== undefined && parsed.consumer === undefined) {
    throw new Error('--consumer-config requires --consumer <profile>.');
  }
  return parsed;
}

/*** Consume consumer flags recursively while preserving command-specific arguments. */
function parseTokens(
  argv: readonly string[],
  parsed: ParsedTlsConsumerOptions,
): ParsedTlsConsumerOptions {
  const [token, value, ...rest] = argv;
  if (token === undefined) return parsed;

  if (token === '--consumer' || token === '--consumer-config') {
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${token} requires a value.`);
    }
    if (token === '--consumer' && !isTlsConsumer(value)) {
      throw new Error(
        '--consumer must be one of: generic, caddy, nginx, apache, haproxy, traefik, envoy, kubernetes.',
      );
    }
    return parseTokens(rest, {
      ...parsed,
      ...(token === '--consumer'
        ? { consumer: value as TlsConsumer }
        : { configPath: value }),
    });
  }

  return parseTokens(argv.slice(1), {
    ...parsed,
    remaining: [...parsed.remaining, token],
  });
}
