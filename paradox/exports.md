# Public API

## CertificateRenewalResult

Kind: `type`
Module: `src/types/certificates.ts`
Source: `src/types/certificates.ts:6:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| renewed | property | `boolean` | yes |  |

## CertificateRuntimeKind

Kind: `unknown`
Module: `src/types/certificates.ts`
Source: `src/types/certificates.ts:3:1`

## CertificateRuntimePort

Kind: `type`
Module: `src/features/certificates/application/ports/outbound/certificateRuntimePort.ts`
Source: `src/features/certificates/application/ports/outbound/certificateRuntimePort.ts:4:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| issueAsync | method | `(input: { readonly domain: string; readonly email: string; readonly forceRenewal: boolean; readonly staging: boolean; }) => Promise<void>` | yes |  |
| preflightAsync | method | `(input: { readonly domains: readonly string[]; }) => Promise<readonly TlsPreflightCheck[]>` | yes |  |
| renewAsync | method | `(input: { readonly dryRun: boolean; }) => Promise<CertificateRenewalResult>` | yes |  |
| statusAsync | method | `() => Promise<string>` | yes |  |

## CertificateRuntimePreference

Kind: `unknown`
Module: `src/types/certificates.ts`
Source: `src/types/certificates.ts:4:1`

## CertificateStoragePaths

Kind: `type`
Module: `src/types/certificates.ts`
Source: `src/types/certificates.ts:10:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| configDirectory | property | `string` | yes |  |
| logsDirectory | property | `string` | yes |  |
| rootDirectory | property | `string` | yes |  |
| webrootDirectory | property | `string` | yes |  |
| workDirectory | property | `string` | yes |  |

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

## createCertificateRuntimeAsync

Kind: `function`
Module: `src/features/certificates/composition/createCertificateRuntimeAsync.ts`
Source: `src/features/certificates/composition/createCertificateRuntimeAsync.ts:30:1`

Select a usable certificate runtime without making Docker a package prerequisite.

### Signatures

- `(options: CreateCertificateRuntimeOptions) => Promise<ResolvedCertificateRuntime>`
  - options: `CreateCertificateRuntimeOptions`
  - returns: `Promise<ResolvedCertificateRuntime>`

## createDockerCertbotRuntime

Kind: `function`
Module: `src/features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.ts`
Source: `src/features/certificates/adapters/outbound/docker/createDockerCertbotRuntime.ts:28:1`

Create a Docker-backed Certbot adapter over host-owned certificate storage.

### Signatures

- `(options: CreateDockerCertbotRuntimeOptions) => CertificateRuntimePort`
  - options: `CreateDockerCertbotRuntimeOptions`
  - returns: `CertificateRuntimePort`

## createNativeCertbotRuntime

Kind: `function`
Module: `src/features/certificates/adapters/outbound/native/createNativeCertbotRuntime.ts`
Source: `src/features/certificates/adapters/outbound/native/createNativeCertbotRuntime.ts:19:1`

Create a native Certbot adapter over host-owned certificate storage.

### Signatures

- `(options: CreateNativeCertbotRuntimeOptions) => CertificateRuntimePort`
  - options: `CreateNativeCertbotRuntimeOptions`
  - returns: `CertificateRuntimePort`

## createRenewalScheduler

Kind: `function`
Module: `src/features/automation/composition/createRenewalScheduler.ts`
Source: `src/features/automation/composition/createRenewalScheduler.ts:13:1`

Compose the host renewal scheduler without exposing its concrete adapter to CLI commands.

### Signatures

- `(options: CreateRenewalSchedulerOptions) => RenewalSchedulerPort`
  - options: `CreateRenewalSchedulerOptions`
  - returns: `RenewalSchedulerPort`

## createSystemdRenewalScheduler

Kind: `function`
Module: `src/features/automation/adapters/outbound/systemd/createSystemdRenewalScheduler.ts`
Source: `src/features/automation/adapters/outbound/systemd/createSystemdRenewalScheduler.ts:21:1`

Create the systemd adapter that owns TLS renewal service and timer units.

### Signatures

- `(options: CreateSystemdRenewalSchedulerOptions) => RenewalSchedulerPort`
  - options: `CreateSystemdRenewalSchedulerOptions`
  - returns: `RenewalSchedulerPort`

## DeploymentHookPort

Kind: `type`
Module: `src/features/deployment/application/ports/outbound/deploymentHookPort.ts`
Source: `src/features/deployment/application/ports/outbound/deploymentHookPort.ts:1:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| runAsync | method | `(command: string) => Promise<void>` | yes |  |

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
Source: `src/features/automation/application/use-cases/enableRenewalAutomationAsync.ts:5:1`

Enable idempotent periodic TLS renewal checks through the configured scheduler.

### Signatures

- `(scheduler: RenewalSchedulerPort, input: { readonly deployCommand?: string; readonly runtimePreference: CertificateRuntimePreference; readonly storageDirectory: string; }) => Promise<void>`
  - input: `{ readonly deployCommand?: string; readonly runtimePreference: CertificateRuntimePreference; readonly storageDirectory: string; }`
  - scheduler: `RenewalSchedulerPort`
  - returns: `Promise<void>`

## executeDeploymentHookAsync

Kind: `function`
Module: `src/features/deployment/composition/executeDeploymentHookAsync.ts`
Source: `src/features/deployment/composition/executeDeploymentHookAsync.ts:13:1`

Execute one explicit post-renewal host command through the deployment composition boundary.

### Signatures

- `(input: ExecuteDeploymentHookInput) => Promise<void>`
  - input: `ExecuteDeploymentHookInput`
  - returns: `Promise<void>`

## inspectTlsConsumerAsync

Kind: `function`
Module: `src/features/consumers/composition/inspectTlsConsumerAsync.ts`
Source: `src/features/consumers/composition/inspectTlsConsumerAsync.ts:18:1`

Inspect one TLS consumer using the default host filesystem discovery adapter.

### Signatures

- `(input: InspectTlsConsumerInput) => Promise<TlsConsumerGuidance>`
  - input: `InspectTlsConsumerInput`
  - returns: `Promise<TlsConsumerGuidance>`

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

## isTlsConsumer

Kind: `function`
Module: `src/features/consumers/domain/tlsConsumer.ts`
Source: `src/features/consumers/domain/tlsConsumer.ts:15:1`

Narrow one CLI value to a supported TLS certificate consumer profile.

### Signatures

- `(value: string) => boolean`
  - value: `string`
  - returns: `boolean`

## provider

Kind: `value`
Module: `src/cli/index.ts`
Source: `src/cli/index.ts:62:7`

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
Source: `src/features/automation/adapters/outbound/systemd/renderSystemdRenewalUnits.ts:11:1`

Render deterministic systemd service and timer units for daily TLS renewal checks.

### Signatures

- `(input: RenderSystemdRenewalUnitsInput) => { readonly service: string; readonly timer: string; }`
  - input: `RenderSystemdRenewalUnitsInput`
  - returns: `{ readonly service: string; readonly timer: string; }`

## RenewalAutomationStatus

Kind: `type`
Module: `src/features/automation/application/ports/outbound/renewalSchedulerPort.ts`
Source: `src/features/automation/application/ports/outbound/renewalSchedulerPort.ts:3:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| active | property | `boolean` | yes |  |
| detail | property | `string` | yes |  |
| enabled | property | `boolean` | yes |  |

## RenewalSchedulerPort

Kind: `type`
Module: `src/features/automation/application/ports/outbound/renewalSchedulerPort.ts`
Source: `src/features/automation/application/ports/outbound/renewalSchedulerPort.ts:9:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| disableAsync | method | `() => Promise<void>` | yes |  |
| enableAsync | method | `(input: { readonly deployCommand?: string; readonly runtimePreference: CertificateRuntimePreference; readonly storageDirectory: string; }) => Promise<void>` | yes |  |
| statusAsync | method | `() => Promise<RenewalAutomationStatus>` | yes |  |

## renewCertificatesAsync

Kind: `function`
Module: `src/features/certificates/application/use-cases/renewCertificatesAsync.ts`
Source: `src/features/certificates/application/use-cases/renewCertificatesAsync.ts:5:1`

Renew all due certificates using the runtime's persisted renewal configuration.

### Signatures

- `(runtime: CertificateRuntimePort, input?: { readonly dryRun?: boolean; }) => Promise<CertificateRenewalResult>`
  - input: `{ readonly dryRun?: boolean; }` (optional)
  - runtime: `CertificateRuntimePort`
  - returns: `Promise<CertificateRenewalResult>`

## resolveCertificateStorage

Kind: `function`
Module: `src/features/certificates/composition/resolveCertificateStorage.ts`
Source: `src/features/certificates/composition/resolveCertificateStorage.ts:6:1`

Resolve the host-owned certificate storage tree from an explicit root directory.

### Signatures

- `(rootDirectory: string) => CertificateStoragePaths`
  - rootDirectory: `string`
  - returns: `CertificateStoragePaths`

## ResolvedCertificateRuntime

Kind: `type`
Module: `src/types/certificates.ts`
Source: `src/types/certificates.ts:18:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| kind | property | `CertificateRuntimeKind` | yes |  |
| runtime | property | `CertificateRuntimePort` | yes |  |
| storage | property | `CertificateStoragePaths` | yes |  |

## runDeploymentHookAsync

Kind: `function`
Module: `src/features/deployment/application/use-cases/runDeploymentHookAsync.ts`
Source: `src/features/deployment/application/use-cases/runDeploymentHookAsync.ts:4:1`

Run one explicit host deployment command after certificate files actually change.

### Signatures

- `(hook: DeploymentHookPort, command: string) => Promise<void>`
  - command: `string`
  - hook: `DeploymentHookPort`
  - returns: `Promise<void>`

## TLS_CONSUMERS

Kind: `value`
Module: `src/features/consumers/domain/tlsConsumer.ts`
Source: `src/features/consumers/domain/tlsConsumer.ts:1:14`

## TlsConsumer

Kind: `unknown`
Module: `src/features/consumers/domain/tlsConsumer.ts`
Source: `src/features/consumers/domain/tlsConsumer.ts:12:1`

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
