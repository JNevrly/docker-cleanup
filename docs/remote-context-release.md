# Docker Cleanup 0.4.0 — explicit remote contexts

TASK-21 and TASK-22 · 2026-11-15.

## Changes

- Explicit `context://NAME` connections using existing SSH and verified
  mutual-TLS Docker contexts. **Contexts** discovers supported configured targets.
  The responsive chooser closes after selection; the pointer journey covers
  discovery, review and repeated switching at 1024×720 without page overflow.
  Docker CLI is optional for remote support; direct Unix sockets still use the
  native adapter without the CLI.
- Authentication remains in Docker/OpenSSH configuration. No stored passwords,
  copied key material, implicit default endpoint, insecure TCP or TLS fallback.
  Errors redact CLI stderr and remote API response details.
- Remote context/target/daemon identity appears in cleanup review. Endpoint
  switches, failed switches and context retargeting invalidate old plans;
  selection and investigation caches do not cross endpoints. Remote preferences
  are connection-scoped; existing local data remains compatible.
- Remote paths are reported metadata, never local filesystem evidence. Local
  host process correlation is disabled for all context connections, including
  loopback. Container process evidence still comes from the selected Engine.
- [Directory-analysis decision](storage-analysis-decision.md): no portable
  writable-layer directory scanner is enabled. A future opt-in merged-rootfs
  diagnostic would require separate content-transfer consent and honest sizes.

## Install and configure

Close the app, then on your Linux host from this checkout:

```bash
sha256sum -c 'artifacts/deb/Docker Cleanup_0.4.0_amd64.deb.sha256'
sudo apt install './artifacts/deb/Docker Cleanup_0.4.0_amd64.deb'
docker-cleanup
```

Run as your normal desktop user. See [remote setup](user-guide.md#remote-ssh-and-tls-contexts)
for SSH trust/agent and TLS CA/client context examples. The reviewed
[transport design](remote-context-design.md) documents the scope and trust model.
Application ID and SQLite schema remain unchanged. Existing local history,
identities, protections and theme/layout need no reset.

## Validation boundaries

The remote test uses real Docker CLI **29.9.3**, OpenSSH and mutual TLS over
loopback, but a **synthetic Engine API**. This is not proof against a production
remote Docker host. Browser tests use IPC fixtures; native desktop tests use a
Unix API fixture. Live Docker cleanup tests use only the explicitly
identity-checked disposable local Engine.

No user remote environment is needed for these checks. External hosts, arbitrary
CLI/SSH versions, hardware-key agents, proxies/jump-host configurations, actual
rootless Engines and custom SSH remote-socket URL paths remain unvalidated or
unsupported. Direct remote URL entry, insecure transport, server-only TLS and
external buildx are outside this release's scope.

The bridge opens an authenticated connection per API request and rechecks context
metadata; high-latency inventories can be expensive. CLI requests have a 60s
deadline and output cap. In-flight deletion cannot be undone; cancellation stops
further scheduling. Logical storage is not guaranteed physical recovery; no
backup/undo is introduced.

## Reproducibility

Two complete locked normalized builds compared byte-identically (`cmp` passed)
in the Debian 12 builder, Rust 1.100.0, Node 24, with
`SOURCE_DATE_EPOCH=1794614400`. This is verification in that environment,
not a claim across arbitrary toolchains.

Package: `artifacts/deb/Docker Cleanup_0.4.0_amd64.deb`

SHA-256:

```text
2f1ab272944cc247b3700407ddca11d118a5b27766fdee088d25dd6d804684c5
```

[Checksum sidecar](../artifacts/deb/Docker%20Cleanup_0.4.0_amd64.deb.sha256).

## Executed verification

- **22 real CLI transport checks** using Docker 29.9.3 with isolated SSH and
  mutual-TLS fixtures: authentication/trust refusal, explicit target despite
  poisoned defaults, remote evidence isolation, connection-scoped persistence,
  failed switch/retarget safeguards, confirmation, no replay and redaction.
  Also proves direct Unix access without a CLI on PATH.
- **57 browser journeys**, **14 frontend unit tests**, **14 Rust unit +
  22 service tests**, **8 Python tests**; production build, Prettier, Rustfmt and
  desktop all-target Clippy with warnings denied.
- **20 live local Docker checks** on the identity-checked disposable daemon.
  No nonempty Engine-global cache prune or external remote host was used.
- **29 packaged-native checks** using the final extracted 0.4.0 executable after
  the actual 0.3.1 package seeded history, aliases, project associations,
  protections, Dark theme and pane sizes. All survive upgrade without reset.

[Remote transport report](../artifacts/remote-contexts/remote-context-report.json) ·
[Remote review screenshot (IPC fixture)](../artifacts/remote-contexts/review.png) ·
[Live local Docker report](../artifacts/integration-report.json).

[Packaged upgrade report](../artifacts/remote-contexts/packaged/native-report.json) ·
[Packaged explorer](../artifacts/remote-contexts/packaged/native-explorer.png) ·
[Packaged results](../artifacts/remote-contexts/packaged/native-results.png).

During concurrent release compilation the 1,000-asset browser assertion hit its
5s deadline. The entire suite passed after compilation finished, without changing
that test or loosening its timeout.
An initial native upgrade attempt lost its WebKitDriver connection while the
SSH fixture suite was running; the standalone retry passed all 29 checks.
