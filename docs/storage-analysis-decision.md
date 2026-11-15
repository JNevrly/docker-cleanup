# Decision: per-directory container storage analysis

TASK-21 · 2026-11-15 · Accepted investigation scope.

## Outcome

**Do not add a writable-layer directory scanner in this task.** Docker exposes
aggregate writable bytes and changed paths, but not portable per-directory
writable-byte accounting. Keep the existing on-demand Files investigation:
changed paths are not sizes. Never start, pause, commit or execute code in a
container merely to explain its size.

A separately approved future feature could stream a container export and count
tar entry sizes **in memory**, without extracting or retaining contents. It must
be named **merged filesystem logical sizes**, not writable-layer usage,
reclaimable bytes or a breakdown of the current treemap. It is feasible as a
different, expensive diagnostic, not a solution to the original attribution
question. No such collection is implemented or enabled by this decision.

## Options

| Approach | Running container | Stopped container | Meaning, permission and side effects |
|---|---|---|---|
| Existing inspect/list sizes + changes API | Yes, can race with writes | Yes, without starting | Engine aggregate writable bytes; added/modified/deleted path names, no per-path sizes. Requires privileged Engine socket/API access. Metadata only; existing behavior. |
| `exec du` | Only with explicit execution permission and installed tools | Requires starting it: rejected | Merged filesystem, often includes mounts unless carefully excluded. Runs untrusted container programs, may update access times, consumes CPU/I/O and exposes filenames. Distroless images may lack tools. `du` apparent vs allocated sizes differ. Not a writable-layer breakdown. |
| `GET /containers/{id}/export` | Possible, not a consistent snapshot while writes occur | Possible, no start required | Streams the merged root filesystem, including image data; excludes mounted volume contents, exposing the underlying rootfs directory instead. Reads/transfers file contents, not just metadata. Logical tar sizes are not allocated blocks or physical recovery. |
| `HEAD/GET .../archive?path=...` / `docker cp` | Yes, with filesystem/mount restrictions | Yes, without starting | Selected merged paths. HEAD stat is not recursive size; GET transfers contents. Must not follow symlinks or cross mounts automatically. Recursive per-file queries are expensive and race-prone. Changed-path summation omits deleted files/whiteouts and cannot account for copy-up or metadata allocation. |
| Read `GraphDriver.Data.UpperDir` / daemon storage | Backend-specific, requires host filesystem access | Sometimes, backend-specific | Rejected. Local application paths need not refer to daemon paths. Legacy overlay2 internals do not cover containerd snapshotters, rootless namespaces, VFS, btrfs or ZFS. Privileged helpers, mounting snapshots and manipulating Docker's storage are out of scope. |
| Commit container, inspect/save resulting layers | Commit may pause a running container unless overridden | Can create a new image from it | Rejected for investigation. Creates persistent objects, may pause workload, reads private contents, needs cleanup and still does not measure physical driver allocation reliably. |
| Helper/clone container | Requires a new helper and mounts/namespace decisions | Does not magically expose its writable layer | Rejected. Pull/create/start/mount/cleanup side effects and elevated privileges; `--volumes-from` exposes volumes, not another container's writable filesystem. |

## Storage backends and portability

The supported Engine API semantics remain the portability boundary. Classic
overlay2 copy-up/whiteouts, btrfs/ZFS snapshots, VFS copies and containerd
snapshotters have different sharing, metadata and allocation behavior. Filesystem
tar lengths cannot explain those allocations, sparse extents, compression,
reflinks or deduplication. Rootless UID mappings and inaccessible mounts add
permission limits; remote engines make direct host-path access invalid.

Docker 29+ fresh installations normally use the containerd image store. Do not
assume a legacy `UpperDir` is present, readable or authoritative. No broad
backend verification is claimed by this research.

## Requirements before any future export-size diagnostic

- Explicit per-container opt-in after a warning that *all rootfs file contents*
  will cross the Engine connection, even if only sizes are displayed.
- No automatic scan, container start, pause, exec, commit, helper or privilege
  escalation. No extraction, persisted archive or content logging.
- Byte, entry-count, depth and wall-clock limits with cancellation closing the
  stream; partial results labelled incomplete, never converted to zero.
- Reject traversal/absolute unsafe archive names; handle hard links once, do not
  follow symbolic links, and count only known regular-file logical lengths.
  Handle PAX/long names, sparse entries and overflow explicitly.
- Document mount exclusions/underlying-directory behavior and running-write
  races. Do not mix totals with writable bytes, mounted storage or cleanup
  estimates.
- Treat paths as private daemon-side data, including for remote Engines.
  Report permission/unsupported errors rather than weakening access checks.

Export cost is O(merged filesystem bytes transferred), even if the writable
layer is tiny; memory for an aggregation is O(unique directories/entries) unless
bounded. Many small files increase overhead. No performance benchmark or
numerical accuracy claim is made: this task performs no content scan.

## Evidence and review

The approved scope is research, not a scanner implementation. Existing
`inventory::diff` uses only the Engine changes GET; existing service tests assert
scan/inspect/diff/process investigation does not mutate the daemon. No new
inspection endpoint or filesystem operation is introduced.

Official references reviewed on 2026-11-15:

- [Storage drivers and writable versus virtual size](https://docs.docker.com/engine/storage/drivers/)
- [Container export: volume exclusion and underlying directories](https://docs.docker.com/reference/cli/docker/container/export/)
- [Container copy: running/stopped support and restrictions](https://docs.docker.com/reference/cli/docker/container/cp/)

The user approved completing TASK-21 as an investigation. A future scanning UI,
content-transfer consent model and implementation require separate approval;
this decision does not create or start additional backlog work.
