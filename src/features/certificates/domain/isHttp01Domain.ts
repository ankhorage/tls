/*** Validate an ordinary DNS hostname suitable for ACME HTTP-01 validation. */
export function isHttp01Domain(domain: string): boolean {
  const labels = domain.split('.');
  return (
    domain.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/iu.test(label),
    )
  );
}
