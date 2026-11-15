import type { Asset, CleanupResult, Plan, Request, Snapshot } from "./types";
import { selectable, selectionEstimate } from "./domain";

const GiB = 1024 ** 3;
const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
const asset = (
  kind: string,
  id: string,
  name: string,
  size: number | null,
  overrides: Partial<Asset> = {},
): Asset => ({
  key: `${kind}:${id}`,
  id,
  kind,
  name,
  bytes: size == null ? null : size * GiB,
  shared: null,
  state: "unknown",
  created: ago(220),
  started: null,
  finished: null,
  lastUsed: null,
  lastUsedSource: "Unknown",
  refs: [],
  mounts: [],
  labels: {},
  project: "Unattributed",
  evidence: [],
  protected: false,
  alias: "",
  ports: [],
  ...overrides,
});
export function makeDemo(): Snapshot {
  return {
    id: "synthetic-demo",
    endpoint: "Synthetic fixtures · no Docker connection",
    daemonId: "demo",
    capturedAt: new Date().toISOString(),
    warnings: [
      "Synthetic demonstration data inspired by the supplied cleanup journey. These figures are not measurements of your machine.",
      "Volumes can contain valuable data even without container references. Container finish time is not a universal last-used timestamp.",
    ],
    capabilities: {
      cache: "available",
      builder: "Engine cache only; external buildx builders unsupported",
      events: "Demonstration only — no live observations",
    },
    assets: [
      asset("container", "objective", "objective_bartik", 8.76, {
        state: "exited",
        project: "robotics-workspace",
        started: ago(220),
        finished: ago(210),
        lastUsed: ago(220),
        lastUsedSource: "Docker-reported container last start",
        refs: ["image:ros", "volume:vscode"],
        mounts: [
          {
            kind: "bind",
            source: "/home/user/projects/robotics",
            destination: "/workspaces/robotics",
            name: "",
          },
          {
            kind: "volume",
            source: "",
            destination: "/vscode",
            name: "vscode",
          },
        ],
        evidence: [
          "Devcontainer workspace label (explicit): /home/user/projects/robotics",
          "Image: ros:humble; command: /bin/bash",
        ],
      }),
      asset("container", "jolly", "jolly_poitras", 7.01, {
        state: "exited",
        project: "paperclip",
        started: ago(44),
        finished: ago(42),
        lastUsed: ago(44),
        lastUsedSource: "Docker-reported container last start",
        refs: ["image:paperclip", "volume:vscode"],
        evidence: ["Compose project label (explicit): paperclip"],
      }),
      asset("container", "recent", "intelligent_nightingale", 4.28, {
        state: "exited",
        project: "client-portal",
        started: ago(8),
        finished: ago(6),
        refs: ["image:node"],
        evidence: [
          "Workspace bind mount (inferred): /home/user/projects/client-portal",
        ],
      }),
      asset("container", "qdrant", "qdrant", 0.02, {
        state: "exited",
        project: "search-platform",
        finished: ago(10),
        refs: ["volume:qdrant"],
        evidence: ["Compose project: search-platform; service: vector-db"],
      }),
      asset("container", "running", "api-dev", 0.14, {
        state: "running",
        project: "client-portal",
        started: ago(0),
        refs: ["image:node"],
        ports: [3000],
      }),
      asset("image", "ros", "ros:humble", 4.8, {
        state: "tagged",
        shared: 1.5 * GiB,
        project: "robotics-workspace",
        refs: ["container:objective"],
      }),
      asset("image", "paperclip", "ghcr.io/paperclipai/paperclip:latest", 4.9, {
        state: "tagged",
        shared: 0,
        project: "paperclip",
        refs: ["container:jolly"],
      }),
      asset("image", "node", "node:22-bookworm", 1.1, {
        state: "tagged",
        shared: 0.6 * GiB,
        project: "client-portal",
        refs: ["container:recent", "container:running"],
      }),
      asset("image", "dangling", "<dangling> old development image", 3.1, {
        state: "dangling",
        shared: 0.5 * GiB,
      }),
      asset("image", "unknown", "legacy-dev:old", null, { state: "tagged" }),
      asset("volume", "vscode", "vscode", 17.05, {
        state: "persistent data",
        project: "Shared assets",
        protected: true,
        refs: ["container:objective", "container:jolly"],
        evidence: ["Shared development tools; explicitly protected"],
      }),
      asset("volume", "qdrant", "qdrant_qdrant_storage", 14.42, {
        state: "persistent data",
        project: "search-platform",
        refs: ["container:qdrant"],
        evidence: [
          "Referenced by a stopped database container; not disposable merely because it is stopped",
        ],
      }),
      asset("volume", "supabase", "supabase_db_xc_scanner", 1.765, {
        state: "persistent data",
        project: "xc-scanner",
        evidence: [
          "Unreferenced database volume. Contents and last use unknown.",
        ],
      }),
      asset("shared", "image-layers", "Shared image layers & metadata", 1.8, {
        state: "accounting only",
        project: "Shared assets",
        evidence: [
          "Shared data appears only once and cannot be independently deleted.",
        ],
      }),
    ],
  };
}

let snapshot = makeDemo();
let plans = new Map<string, Plan>();
let history: CleanupResult[] = [];
export async function demoRequest<T>(request: Request): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  let value: unknown;
  switch (request.type) {
    case "scan":
    case "snapshot":
      value = structuredClone(snapshot);
      break;
    case "history":
      value = history;
      break;
    case "saveAsset": {
      const a = snapshot.assets.find((a) => a.key === request.key)!;
      Object.assign(a, { alias: request.alias, protected: request.protected });
      if (request.project != null) a.project = request.project;
      plans.clear();
      value = structuredClone(snapshot);
      break;
    }
    case "inspect":
      value = {
        note: "Synthetic metadata; environment variables are omitted.",
        asset: snapshot.assets.find((a) => a.key === request.key),
      };
      break;
    case "diff":
      value = {
        changes: [
          { Path: "/usr/local/lib", Kind: 0, status: "changed" },
          { Path: "/root/.cache", Kind: 1, status: "added" },
          { Path: "/scratch/notes.txt", Kind: 1, status: "added" },
        ],
        note: "Synthetic changed paths, not size measurements. Check important writable files before deleting.",
      };
      break;
    case "processes":
      value = {
        container: null,
        host: [],
        notes: [
          "Synthetic demonstration. No process collection was performed.",
        ],
      };
      break;
    case "plan":
    case "prunePlan": {
      let keys: string[];
      if (request.type === "plan") keys = request.keys;
      else
        keys = snapshot.assets
          .filter(
            (a) =>
              !a.protected &&
              (request.scope === "containers"
                ? a.kind === "container" && a.state === "exited"
                : request.scope === "dangling"
                  ? a.kind === "image" &&
                    a.state === "dangling" &&
                    !a.refs.length
                  : request.scope === "images"
                    ? a.kind === "image" && !a.refs.length
                    : request.scope === "volumes"
                      ? a.kind === "volume" && !a.refs.length
                      : false),
          )
          .filter(
            (a) =>
              request.olderThanDays == null ||
              ((a.kind === "container" ? a.finished : a.created) != null &&
                new Date(
                  (a.kind === "container" ? a.finished : a.created)!,
                ).valueOf() <
                  Date.now() - request.olderThanDays * 86400000),
          )
          .map((a) => a.key);
      if (!keys.length) throw Error("No eligible assets in this scope.");
      for (const key of keys) {
        const a = snapshot.assets.find((a) => a.key === key);
        if (!a || !selectable(a))
          throw Error(
            "Selection contains protected, running, unsupported, or stale assets.",
          );
        if (a.kind !== "container" && a.refs.some((r) => !keys.includes(r)))
          throw Error(`${a.name} still has references outside the selection.`);
      }
      const selected = snapshot.assets.filter((a) => keys.includes(a.key));
      const plan: Plan = {
        id: crypto.randomUUID(),
        snapshotId: snapshot.id,
        daemonId: "demo",
        createdAt: new Date().toISOString(),
        actions: selected
          .sort(
            (a, b) =>
              Number(a.kind !== "container") - Number(b.kind !== "container"),
          )
          .map((a) => ({
            key: a.key,
            id: a.id,
            kind: a.kind,
            name: a.name,
            fingerprint: "",
            evidence: a.evidence,
            retainedMounts: a.mounts.filter(
              (m) => m.kind === "bind" || !keys.includes(`volume:${m.name}`),
            ),
          })),
        warnings: [
          "Demonstration only: no Docker objects will be modified.",
          "Real deletion is irreversible. Bind mounts and unselected volumes are retained.",
        ],
        estimate: selectionEstimate(snapshot, new Set(keys)),
        newlyEligible: snapshot.assets
          .filter(
            (a) =>
              a.kind === "image" &&
              !keys.includes(a.key) &&
              a.refs.length > 0 &&
              a.refs.every((r) => keys.includes(r)),
          )
          .map((a) => a.key),
        volumes: selected.some((a) => a.kind === "volume"),
        cacheScope: false,
      };
      plans.set(plan.id, plan);
      value = plan;
      break;
    }
    case "execute": {
      const plan = plans.get(request.planId);
      if (
        !plan ||
        !request.confirmed ||
        (plan.volumes && !request.confirmVolumes)
      )
        throw Error("Review and confirm the plan first.");
      const before = structuredClone(snapshot);
      const keys = plan.actions.map((a) => a.key);
      snapshot.assets = snapshot.assets
        .filter((a) => !keys.includes(a.key))
        .map((a) => ({ ...a, refs: a.refs.filter((r) => !keys.includes(r)) }));
      snapshot.capturedAt = new Date().toISOString();
      const result: CleanupResult = {
        id: crypto.randomUUID(),
        at: snapshot.capturedAt,
        plan,
        before,
        after: structuredClone(snapshot),
        reportedReclaimed: null,
        hostFreeDelta: null,
        outcomes: plan.actions.map((a) => ({
          key: a.key,
          status: "simulated",
          message:
            "Removed from synthetic demonstration only. No Docker calls.",
        })),
        notes: [
          "This result is synthetic, not evidence of real disk recovery.",
        ],
      };
      history = [result, ...history];
      plans.delete(plan.id);
      value = result;
      break;
    }
  }
  return value as T;
}
