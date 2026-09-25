# @ankhorage/tls

## 0.2.0

### Minor Changes

- e7f93fb: Make TLS storage host-owned and environment-agnostic, add native Certbot with Docker fallback, route CLI commands through composition boundaries, stream long-running Certbot output, add optional consumer guidance profiles, and run an explicit deployment hook only after certificate files actually renew.

## 0.1.0

### Minor Changes

- 8b59bf4: Initial standalone TLS lifecycle with HTTP-01 readiness checks, Certbot-backed issuance and renewal, certificate status, and systemd renewal automation.

All notable changes to this package will be documented in this file by Changesets.
