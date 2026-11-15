# Using Docker Cleanup

## Connect

Launch `docker-cleanup` on a Linux desktop, enter the appropriate local socket,
and choose **Connect & scan**:

- Rootful Docker: `unix:///var/run/docker.sock`
- Rootless Docker: often `unix:///run/user/1000/docker.sock` (use your UID)
- Development DinD: `unix:///other_mounts/test-docker/docker.sock`, inside the harness

The connected daemon ID and negotiated API appear next to the scan time. Only
Unix endpoints are accepted. A failed connection never triggers permission
changes or elevation. Check the socket's owner/group and your Docker setup;
do not make it world-writable. Docker socket access itself is highly privileged.

The browser-only developer preview is clearly marked **SYNTHETIC DATA**. It does
not connect to Docker, and its cleanup button says **Simulate cleanup**.

## Investigate the biggest assets

The interface starts in **Light** mode. Choose **Light**, **Dark** or **System**
at the bottom of the sidebar; the preference persists and System follows live OS
changes. **Focus asset table** collapses the map and summary; **Show landscape**
restores them. Drag the vertical divider beside the inspector to change its
width, or the horizontal divider between map and asset controls to change map
height. Tab to a divider and use arrow keys (Shift for larger steps), Home or End.
Sizes persist and safely clamp to the current viewport. The table and inspector
scroll independently; one does not take its height from the other. Collapse the
inspector when you need more table space; drafts survive collapse/restore.

**Storage explorer** and the prominent **All storage** breadcrumb return to the
starting overview: category grouping, no drill-down or exploration filters.
They preserve cleanup selection, inspector drafts and saved layout/theme.
This is deliberately different from **Back** after review/history, which restores
the previous browsing context. Idle scan status stays beside the main title and
does not insert another row or move the panels.

1. Start with the category treemap. Containers show **writable layer data**,
   not their image size or mounted workspace files.
2. Switch to **By project** to group assets using Compose/devcontainer labels,
   mount clues and reference relationships. Shared assets appear only once.
3. Use the sortable table, age/state filters and search to narrow the view.
   Unknown sizes remain in the table even though they cannot get measured area.
4. Open an asset to inspect evidence, related images/containers/volumes, and
   storage boundaries. You can assign a friendly name or project yourself.
5. For containers, inspect filesystem changes and collect process evidence on
   demand. Changes identify added/changed/deleted paths, **not path sizes**.
    Container inspection does not start containers or execute commands inside them.

Category selection and pointer/keyboard-actionable map headers provide an **About**
disclosure for ownership and deletion-risk explanations. Click anywhere in a
category or project header, or focus it and press Enter/Space, to drill down.
Hover/focus anywhere in its header region to disclose the complete name and size.
The chevron beside **By project** opens all measured projects (or categories in
**By category**), including groups too small to target on the map. It does not
inflate their storage area or select deletion targets.

When an image reference cannot fit, the map favors its repository basename,
dropping registry/path/tag/digest detail before shortening the meaningful name
with trailing ellipsis. Multiple tags are parsed as separate references, not one
path; the first repository is used. Aliases stay as assigned. Complete references
remain available on tile hover/focus and in the inspector. Tiny tiles omit
unreadable text rather than shrinking it. In the inspector, **Overview**, **Files**,
**Processes** and optional **Metadata** keep details inline, without a data dialog.
Opening Files/Processes does not collect anything until **Load inspection**;
related-asset links navigate without selecting deletion targets, and
**Back to previous asset** returns to the prior inspected asset.

Project associations are explained as explicit metadata, inferred clues, user
overrides, or unknown/shared. A related host program is not proof of ownership.
Host process discovery can be incomplete because of permissions and namespaces;
it is deliberately unavailable from inside the development harness's `/proc`.

## Understand the numbers and dates

Tile area represents attributed Docker bytes, not physical disk recovery.
Click a tile (or focus it and press Enter) to inspect it. Unknown-size assets stay
in the asset list without measured map area. Shared cache data is excluded from
attributed area to avoid overlap. The map legend appears only for multiple
visible categories; single-color drilled views do not need one.

- The treemap uses unique image data plus a separate shared/metadata bucket,
  container writable bytes, measured volume bytes and non-shared Engine cache.
- Logical image size is also visible, but is not added repeatedly to totals.
- Selection recovery is a conservative **logical-data interval**, not guaranteed
  host free-space recovery. Selected images may jointly release shared layers
  that cannot be attributed exactly from Engine metadata.
- A missing value is **Unknown**, never a fabricated zero.
- Created, last started and last finished are different dates.
- Image creation is not image last use; container finish is not volume last use.
- Observed/inferred usage has a source. Activity before installation, while
  disconnected, or between observations may be unknown.

The explorer refreshes approximately once per minute while connected and idle.
Every deletion plan refreshes state, and execution revalidates it again.

## Protect, select and review

Use the diamond button to protect an asset from deletion and pruning. Protection,
aliases and user project associations persist locally, scoped to the daemon.

Select a small batch, such as a few old large stopped containers. The footer
shows count and estimated recovery; **Selection** reveals assets selected
outside the current filter. Switching views does not delete or discard selection.
A daemon change clears selection. Disappeared or newly ineligible assets are
removed from selection with an explanation.

The table-header checkbox selects **all individually eligible assets in the
current filtered/drilled view**, not just currently visible screen rows.
Its mixed state means some eligible rows are selected. **Select in view** uses
the same eligibility rules. Unchecking or choosing **Deselect in view** leaves
selections outside the view unchanged. **Clear all** clears the entire batch.
**Selection** shows selected assets; **All assets** exits that view.
Counts distinguish eligible,
selected-in-view and selected-outside-view assets; excluded rows explain why.
Running/protected assets and shared-accounting/cache records are never silently
added. Referenced images/volumes may be selected for review but cannot bypass
dependency checks.

Choose **Review cleanup**. Review the ordered actions, project evidence, actual
retained mounts, warnings and uncertainty:

Review is a main-workspace page. **Back** preserves explorer filters, selection
and inspector input and never authorizes deletion. Once submitted, a plan cannot
be replayed from navigation; changed state/protection requires a fresh review.

- Running containers are not stopped or removed automatically.
- Container removal loses its writable layer but retains unselected volumes.
- Bind-mounted host directories are **never deletion targets**.
- Referenced images/volumes require their container dependencies to be selected
  and successfully removed first.
- Volume deletion needs separate acknowledgement that all its persistent data,
  including possible databases, will be lost.
- Deletion is irreversible. There is no backup or undo feature in this MVP.

Execution reports every action as deleted, failed, skipped or cancelled.
Cancellation stops scheduling further work; an in-flight operation may finish.
Partial failures are not rolled back.

The **Cleanup progress** page lists queued, checking, deleting and terminal
statuses for each executable action. Its bar counts finished actions, including
failures/skips/cancellation, **not** successful deletions or bytes reclaimed.
In-flight work has an indeterminate spinner. Engine cache is one
unknown-duration operation, never pretend per-record progress.
**Cancel remaining actions** cannot undo an in-flight deletion. Navigating away
keeps a visible running-cleanup banner with access to progress and cancellation.
Completion opens the result page if you stayed on progress; otherwise it does
not steal your current page.

After deleting containers, newly unreferenced images can be reviewed as a
**separate batch**; they are never automatically selected for deletion.

## Prune deliberately

**Prune resources** offers separate scopes:

- Stopped containers
- Dangling unreferenced images
- All unreferenced images, including tagged images
- Unreferenced named/anonymous volumes
- Engine-wide builder cache

Object scopes create explicit-target plans to preserve protected resources.
Age filtering uses available finish/creation evidence and excludes unknown
dates; it does not infer universal last use.

Engine cache prune is a separately confirmed **builder-wide operation**, not
per-record removal. A protected cache record disables it. Its reviewed record
set must still match before execution. In-use records are retained by Docker.
Cache age filtering and external buildx builders are unsupported. Empty Engine
cache does not establish that every external builder is empty.

Choose **Build cache → Clear Engine build cache** to review it directly.
Rebuilding cache later may slow builds. A separate builder-scope acknowledgement
is mandatory, even after the general deletion confirmation. Protected cache,
unavailable/unsupported accounting, an empty inventory and reported zero are
explained distinctly. No actionable per-record deletion checkbox or unsupported
age filter is offered.

No combined “prune everything with volumes” default is provided.

## Verify and revisit results

Cleanup history keeps before/after inventories, estimates and per-action outcomes.
It is a searchable, outcome-filtered, sortable and paginated workspace list.
Open an entry for full result details; **Back** preserves list browsing context.
Long and partially failed batches keep their individual outcomes visible.
Follow-up selection is available only for the currently connected matching
daemon, and still needs a fresh cleanup review. History never re-executes plans.
Prune-reported reclaimed bytes are shown only when Docker supplies them.
Individual delete APIs generally do not. Host free-space change remains
unavailable when the daemon filesystem cannot be reliably mapped locally;
concurrent Docker activity can affect before/after comparisons.

The history database lives in the platform application data directory under
`io.github.docker-cleanup.app/history.sqlite`. It contains potentially sensitive
workspace paths and object metadata and is stored with restrictive permissions.
Results are not rollback points. If persistence fails after deletion, the UI
still shows completed outcomes and explicitly warns that they were not saved.
