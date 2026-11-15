# Reviewed design: remote Docker contexts

TASK-22 · user approved 2026-11-15 before implementation.

## Scope and authentication

Keep direct local Unix transport independent of Docker CLI installation. Add
explicit `context://NAME` selection of existing SSH or verified mutual-TLS Docker
contexts. Do not implicitly follow the active context, `DOCKER_HOST` or
`DOCKER_CONTEXT`. Context discovery is an explicit action.

Use the installed Docker CLI to resolve context metadata and proxy Engine HTTP
through `docker system dial-stdio`. This is Docker's own internal SSH transport
mechanism; CLI compatibility must be tested and failures reported without
fallback. Pin the resolved host and TLS file locations in the invocation using
explicit `--host`/TLS flags, rather than allowing a context rename/retarget race
to change the destination of a pending operation. Recheck context metadata before
every API call and reconnect/review on change.

Initial supported contexts:

- SSH using existing SSH agent/keys, known-hosts and user SSH configuration.
  No password UI, automatic host-key acceptance, key installation or privilege
  escalation. Users must establish trust/authentication outside this app; the
  app never adds insecure SSH options. User SSH configuration is trusted and
  remains the user's responsibility.
- TCP contexts with `SkipTLSVerify=false` and CA/client certificate/key material.
  Require explicit `--tlsverify`; no plaintext TCP, insecure TLS, URL passwords,
  query credentials or unverified remote fallback. Server-only TLS/custom
  authentication and arbitrary direct remote URLs are outside this first slice.

Credential files stay in Docker's existing context directory and are opened by
the CLI. Do not persist their contents or forward raw CLI stderr/metadata into
the UI, logs, SQLite or tests' reports. Only validated context names, host
addresses, transport type and daemon IDs are exposed. Remote hostnames/usernames
and paths are private metadata, not secrets-free public telemetry.

## Isolation and safety

- Treat every context connection as remote, even loopback. Disable local `/proc`
  host correlation; container `top` still comes from the selected Engine.
  Mount/project paths are daemon-reported labels, never local paths to open or
  stat. Explicitly identify remote path evidence.
- Scope remote preferences/observations to context + resolved target + daemon
  identity. Retain the existing daemon-scoped local keys for compatibility.
  Keep recorded daemon IDs truthful, not replaced with a composite pseudo-ID.
- Bind plans to connection identity as well as daemon identity. An endpoint
  switch, failed switch, context retarget or replaced daemon cannot reuse a
  previous plan. Revalidate before each deletion and retain non-force/mount,
  protection, dependency, cache-scope and acknowledgement safeguards.
- Show the context, resolved target and daemon in connection/review/results.
  Clear selections, inspectors and cached investigation on connection changes,
  including the same daemon reached through another endpoint. Historical
  follow-up requires a matching connection, not merely a matching daemon ID.
- Bound CLI output and wall-clock duration; terminate subprocess groups on
  timeout/overflow. Do not hang on interactive authentication or leak SSH
  children. No endpoint switching during an in-flight cleanup.

## Verification boundaries

Use parser/policy unit tests, service fixtures for failed switches/retargeting
and endpoint-scoped state, browser pointer journeys for connection/review/
historical follow-up, and real CLI SSH/TLS tests in disposable infrastructure
when available. The user has no external host for manual testing; completing
this task must not imply their production SSH/TLS, rootless namespaces, proxies,
hardware keys or arbitrary CLI versions were verified. Record exact executed
coverage and remaining limits separately.

References:
[Docker contexts](https://docs.docker.com/engine/manage-resources/contexts/),
[SSH/TLS protection](https://docs.docker.com/engine/security/protect-access/),
[CLI dial-stdio implementation](https://github.com/docker/cli/blob/master/cli/command/system/dial_stdio.go).
