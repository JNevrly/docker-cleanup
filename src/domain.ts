import type { Asset, Estimate, Snapshot } from "./types";

export const kinds = [
  "container",
  "image",
  "volume",
  "cache",
  "shared",
] as const;
export const titles: Record<string, string> = {
  container: "Writable layers",
  image: "Images · unique data",
  volume: "Volumes",
  cache: "Build cache",
  shared: "Shared image storage",
};
export const categoryHelp: Record<string, string> = {
  container:
    "Container writable layers are files added or changed inside a container, separate from its image and mounted storage. Removing a container loses these files; bind mounts and unselected volumes are retained.",
  image:
    "Images are templates for containers. Images can share layers, so logical image sizes do not add up to reclaimed space. The map separates unique data from shared storage; cleanup estimates remain uncertain.",
  volume:
    "Volumes are persistent Docker-managed storage, often containing databases or user data. Unreferenced does not mean disposable. Removing a selected volume loses its contents and needs a separate confirmation.",
  cache:
    "Engine build cache reuses previous build results. Eligible cache can be recreated, but clearing it makes later builds slower. Cleanup is Engine-wide, retains in-use cache and does not cover external buildx builders.",
  shared:
    "Shared image layers and metadata are counted once, not once per image or project. This storage cannot be deleted independently; removing the images that reference it may make some of it reclaimable.",
};
export const colors: Record<string, string> = {
  container: "#73d4b4",
  image: "#8ba9e8",
  volume: "#dcb879",
  cache: "#bd9cde",
  shared: "#63758a",
};
export function bytes(value: number | null | undefined): string {
  if (value == null) return "Unknown";
  if (value === 0) return "0 B";
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4);
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${["B", "KiB", "MiB", "GiB", "TiB"][unit]}`;
}
export function storageBytes(a: Asset): number | null {
  if (a.kind === "image")
    return a.bytes != null && a.shared != null
      ? Math.max(0, a.bytes - a.shared)
      : null;
  if (a.kind === "cache")
    return a.shared == null ? null : a.shared > 0 ? 0 : a.bytes;
  return a.bytes;
}
export function measured(assets: Asset[]): number {
  return assets.reduce((total, a) => total + (storageBytes(a) ?? 0), 0);
}
export function date(value: string | null): string {
  if (!value) return "Unknown";
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? "Unknown" : d.toLocaleString();
}
export function age(value: string | null): string {
  if (!value) return "Unknown";
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).valueOf()) / 86400000),
  );
  return days < 1 ? "Today" : `${days}d ago`;
}
export function selectable(a: Asset): boolean {
  return (
    !a.protected &&
    a.kind !== "shared" &&
    a.kind !== "cache" &&
    (a.kind !== "container" || ["exited", "created", "dead"].includes(a.state))
  );
}
export function selectionReason(a: Asset): string {
  if (a.protected) return "Protected: excluded from cleanup.";
  if (a.kind === "shared")
    return "Shared accounting only: cannot delete independently.";
  if (a.kind === "cache")
    return "No per-record deletion: use Clear Engine build cache.";
  if (!selectable(a)) return "Container is not stopped: excluded from cleanup.";
  return a.refs.length && a.kind !== "container"
    ? "Eligible for review; referenced assets need dependency checks before deletion."
    : "Eligible for cleanup review.";
}
export function selectionEstimate(
  snapshot: Snapshot,
  selected: Set<string>,
): Estimate {
  const assets = snapshot.assets.filter((a) => selected.has(a.key));
  let lower = 0;
  let upper: number | null = 0;
  for (const a of assets) {
    upper = upper != null && a.bytes != null ? upper + a.bytes : null;
    if (a.refs.every((r) => selected.has(r)) || a.kind === "container")
      lower += storageBytes(a) ?? 0;
  }
  return {
    reported: assets.reduce((sum, a) => sum + (a.bytes ?? 0), 0),
    lower,
    upper,
    notes: [
      "Logical-data estimate, not guaranteed recovered host space. Shared-only-among-selected layers and unknown sizes require a range.",
    ],
  };
}
export function estimateText(e: Estimate): string {
  if (e.upper == null) return `at least ${bytes(e.lower)} · incomplete`;
  return e.lower === e.upper
    ? `~${bytes(e.lower)}`
    : `${bytes(e.lower)} – ${bytes(e.upper)}`;
}
