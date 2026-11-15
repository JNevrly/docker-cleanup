# Docker adapter capability matrix

## Compatibility and validation

The application accepts **local Linux Unix sockets only**, negotiates the
daemon's maximum API capped at 1.56, and requires a mutually supported API
between 1.44 and 1.56. Rootful and rootless socket paths are configurable.
API compatibility does not imply every storage backend is verified.

Live development validation: Docker Engine **29.9.3**, API **1.56**, Linux,
containerd/overlayfs storage, accessed through an identity-checked disposable
DinD socket. `/version`, `/info`, `/system/df`, container list and volume list
were read successfully. Other versions, legacy overlay2, rootless installations,
and external buildx drivers require separate validation.

| Capability | Source | Semantics / limitations |
|---|---|---|
| Container writable bytes | Container list `size=true`, inspect `size=true` | Not image size or mounted storage; scan can be expensive |
| Lifecycle dates | Container inspect state | Created, last started and last finished are different facts |
| Image logical/shared bytes | `/system/df` Images | Unique = Size − SharedSize when both are nonnegative; unknown stays null |
| Deduplicated image total | `LayersSize`, or `ImageUsage.TotalSize` | Unattributed shared/metadata residual shown once; never assigned to every project |
| Selected image recovery | Existing references and shared/unique metadata | Conservative logical-data interval; exact jointly-reclaimable shared layers cannot be derived |
| Volume bytes | `/system/df` volume UsageData | Negative/missing Size means unknown, not zero; volume contents are not inspected |
| Engine builder cache | `/system/df` BuildCache | Shared cache bytes excluded from attributed area; in-use state and reported dates retained |
| Cache deletion | `/build/prune?all=true` | Explicit Engine-wide scope, separate confirmation, not individual record removal |
| External buildx builders | Not supported | No Docker CLI/buildx dependency; no implication that empty Engine cache means all builders are empty |
| Changed filesystem paths | Container changes API | Added/changed/deleted paths only, not per-directory sizes; never starts a container |
| Container processes | Container top with PID/comm only | Running containers only; command arguments and environment omitted |
| Host processes | On-demand `/proc` cwd and local TCP sockets | Best effort; no escalation. Disabled in harness namespace. Namespace/permission limits reported |
| Event history | Bounded `/events` since previous snapshot | On refresh; start/attach/mount evidence where available. Not an always-running monitor |
| Host free-space change | Not measured in MVP | Cannot reliably map daemon root into application mount namespace; explicitly unavailable |

## Missing, zero and errors

`bytes: 0` means measured zero. `bytes: null` / `shared: null` means not known;
unknown measurements are excluded from measured treemap area but remain in the
asset table. Scan warnings and capability messages distinguish permission denial,
unsupported/missing endpoints, transport failure, and measured zero.

Failure to inspect a container marks its references incomplete and blocks
cleanup planning, rather than treating related assets as unreferenced. A
replacement daemon at the same socket path requires a new connection and review.

## Pruning and protection

Container/image/volume prune workflows enumerate eligible objects and create
explicit deletion actions, preserving protected objects without relying on
unsupported daemon-side exclusions. Image deletion uses `force=false` and
`noprune=true`; container deletion uses `force=false` and `v=false`.

Engine-wide cache prune is disabled when any cache record is protected; the
reviewed set must still match immediately before execution. Cache age filters
are unsupported, rather than silently widened. Docker retains in-use cache.
Object age filters refer to container finish/creation or image/volume creation,
never an invented universal last-use time.

Engine reference guards handle races after revalidation; no application can make
all independent Docker operations transactional. Partial failure is recorded.
