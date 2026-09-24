export interface TlsPreflightCheck {
  readonly id: string;
  readonly label: string;
  readonly message: string;
  readonly status: 'pass' | 'fail';
  readonly tip?: string;
}
