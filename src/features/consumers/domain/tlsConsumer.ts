export const TLS_CONSUMERS = [
  'generic',
  'caddy',
  'nginx',
  'apache',
  'haproxy',
  'traefik',
  'envoy',
  'kubernetes',
] as const;

export type TlsConsumer = (typeof TLS_CONSUMERS)[number];

/*** Narrow one CLI value to a supported TLS certificate consumer profile. */
export function isTlsConsumer(value: string): value is TlsConsumer {
  return TLS_CONSUMERS.some((consumer) => consumer === value);
}
