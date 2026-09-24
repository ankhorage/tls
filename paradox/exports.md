# Public API

## CertificateRuntimePort

Kind: `type`
Module: `src/features/certificates/application/ports/outbound/certificateRuntimePort.ts`
Source: `src/features/certificates/application/ports/outbound/certificateRuntimePort.ts:3:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| issueAsync | method | `(input: { readonly domain: string; readonly email: string; readonly forceRenewal: boolean; readonly staging: boolean; }) => Promise<void>` | yes |  |
| preflightAsync | method | `(input: { readonly domains: readonly string[]; }) => Promise<readonly TlsPreflightCheck[]>` | yes |  |
| renewAsync | method | `(input: { readonly dryRun: boolean; }) => Promise<void>` | yes |  |
| statusAsync | method | `() => Promise<string>` | yes |  |

## checkIssueReadinessAsync

Kind: `function`
Module: `src/features/certificates/application/use-cases/checkIssueReadinessAsync.ts`
Source: `src/features/certificates/application/use-cases/checkIssueReadinessAsync.ts:6:1`

Validate requested hostnames and inspect HTTP-01 runtime readiness before certificate issuance.

### Signatures

- `(runtime: CertificateRuntimePort, domains: readonly string[]) => Promise<readonly TlsPreflightCheck[]>`
  - domains: `readonly string[]`
  - runtime: `CertificateRuntimePort`
  - returns: `Promise<readonly TlsPreflightCheck[]>`

## createDockerCertbotRuntime

Kind: `function`
Module: `src/features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.ts`
Source: `src/features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.ts:23:1`

Compose the Docker-backed Certbot adapter for certificate lifecycle and HTTP-01 readiness.

### Signatures

- `(options?: CreateDockerCertbotRuntimeOptions) => CertificateRuntimePort`
  - options: `CreateDockerCertbotRuntimeOptions` (optional)
  - returns: `CertificateRuntimePort`

## createSystemdRenewalScheduler

Kind: `function`
Module: `src/features/automation/adapters/outbound/systemd/createSystemdRenewalScheduler.ts`
Source: `src/features/automation/adapters/outbound/systemd/createSystemdRenewalScheduler.ts:21:1`

Create the systemd adapter that owns TLS renewal service and timer units.

### Signatures

- `(options: CreateSystemdRenewalSchedulerOptions) => RenewalSchedulerPort`
  - options: `CreateSystemdRenewalSchedulerOptions`
  - returns: `RenewalSchedulerPort`

## disableRenewalAutomationAsync

Kind: `function`
Module: `src/features/automation/application/use-cases/disableRenewalAutomationAsync.ts`
Source: `src/features/automation/application/use-cases/disableRenewalAutomationAsync.ts:4:1`

Disable periodic TLS renewal checks and remove scheduler-owned state.

### Signatures

- `(scheduler: RenewalSchedulerPort) => Promise<void>`
  - scheduler: `RenewalSchedulerPort`
  - returns: `Promise<void>`

## enableRenewalAutomationAsync

Kind: `function`
Module: `src/features/automation/application/use-cases/enableRenewalAutomationAsync.ts`
Source: `src/features/automation/application/use-cases/enableRenewalAutomationAsync.ts:4:1`

Enable idempotent periodic TLS renewal checks through the configured scheduler.

### Signatures

- `(scheduler: RenewalSchedulerPort, storageVolumeName: string) => Promise<void>`
  - scheduler: `RenewalSchedulerPort`
  - storageVolumeName: `string`
  - returns: `Promise<void>`

## issueCertificatesAsync

Kind: `function`
Module: `src/features/certificates/application/use-cases/issueCertificatesAsync.ts`
Source: `src/features/certificates/application/use-cases/issueCertificatesAsync.ts:5:1`

Issue one independently renewable certificate for every unique validated domain.

### Signatures

- `(runtime: CertificateRuntimePort, input: { readonly domains: readonly string[]; readonly email: string; readonly forceRenewal?: boolean; readonly staging?: boolean; }) => Promise<void>`
  - input: `{ readonly domains: readonly string[]; readonly email: string; readonly forceRenewal?: boolean; readonly staging?: boolean; }`
  - runtime: `CertificateRuntimePort`
  - returns: `Promise<void>`

## provider

Kind: `value`
Module: `src/cli/index.ts`
Source: `src/cli/index.ts:59:7`

## readCertificateStatusAsync

Kind: `function`
Module: `src/features/certificates/application/use-cases/readCertificateStatusAsync.ts`
Source: `src/features/certificates/application/use-cases/readCertificateStatusAsync.ts:4:1`

Read the certificate inventory without changing persisted state.

### Signatures

- `(runtime: CertificateRuntimePort) => Promise<string>`
  - runtime: `CertificateRuntimePort`
  - returns: `Promise<string>`

## readRenewalAutomationStatusAsync

Kind: `function`
Module: `src/features/automation/application/use-cases/readRenewalAutomationStatusAsync.ts`
Source: `src/features/automation/application/use-cases/readRenewalAutomationStatusAsync.ts:7:1`

Read scheduler state without mutating renewal automation.

### Signatures

- `(scheduler: RenewalSchedulerPort) => Promise<RenewalAutomationStatus>`
  - scheduler: `RenewalSchedulerPort`
  - returns: `Promise<RenewalAutomationStatus>`

## renderSystemdRenewalUnits

Kind: `function`
Module: `src/features/automation/adapters/outbound/systemd/renderSystemdRenewalUnits.ts`
Source: `src/features/automation/adapters/outbound/systemd/renderSystemdRenewalUnits.ts:7:1`

Render deterministic systemd service and timer units for daily TLS renewal checks.

### Signatures

- `(input: RenderSystemdRenewalUnitsInput) => { readonly service: string; readonly timer: string; }`
  - input: `RenderSystemdRenewalUnitsInput`
  - returns: `{ readonly service: string; readonly timer: string; }`

## RenewalAutomationStatus

Kind: `type`
Module: `src/features/automation/application/ports/outbound/renewalSchedulerPort.ts`
Source: `src/features/automation/application/ports/outbound/renewalSchedulerPort.ts:1:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| active | property | `boolean` | yes |  |
| detail | property | `string` | yes |  |
| enabled | property | `boolean` | yes |  |

## RenewalSchedulerPort

Kind: `type`
Module: `src/features/automation/application/ports/outbound/renewalSchedulerPort.ts`
Source: `src/features/automation/application/ports/outbound/renewalSchedulerPort.ts:7:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| disableAsync | method | `() => Promise<void>` | yes |  |
| enableAsync | method | `(input: { readonly storageVolumeName: string; }) => Promise<void>` | yes |  |
| statusAsync | method | `() => Promise<RenewalAutomationStatus>` | yes |  |

## renewCertificatesAsync

Kind: `function`
Module: `src/features/certificates/application/use-cases/renewCertificatesAsync.ts`
Source: `src/features/certificates/application/use-cases/renewCertificatesAsync.ts:4:1`

Renew all due certificates using the runtime's persisted renewal configuration.

### Signatures

- `(runtime: CertificateRuntimePort, input?: { readonly dryRun?: boolean; }) => Promise<void>`
  - input: `{ readonly dryRun?: boolean; }` (optional)
  - runtime: `CertificateRuntimePort`
  - returns: `Promise<void>`

## TlsPreflightCheck

Kind: `type`
Module: `src/types/preflight.ts`
Source: `src/types/preflight.ts:1:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| id | property | `string` | yes |  |
| label | property | `string` | yes |  |
| message | property | `string` | yes |  |
| status | property | `"pass" \| "fail"` | yes |  |
| tip | property | `string \| undefined` | no |  |
