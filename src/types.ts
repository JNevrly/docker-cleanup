export interface Mount {
  kind: string;
  source: string;
  destination: string;
  name: string;
}
export interface Asset {
  key: string;
  id: string;
  kind: string;
  name: string;
  bytes: number | null;
  shared: number | null;
  state: string;
  created: string | null;
  started: string | null;
  finished: string | null;
  lastUsed: string | null;
  lastUsedSource: string;
  refs: string[];
  mounts: Mount[];
  labels: Record<string, string>;
  project: string;
  evidence: string[];
  protected: boolean;
  alias: string;
  ports: number[];
}
export interface Snapshot {
  id: string;
  endpoint: string;
  daemonId: string;
  capturedAt: string;
  assets: Asset[];
  warnings: string[];
  capabilities: Record<string, string>;
}
export interface Estimate {
  reported: number;
  lower: number;
  upper: number | null;
  notes: string[];
}
export interface Action {
  key: string;
  id: string;
  kind: string;
  name: string;
  fingerprint: string;
  evidence: string[];
  retainedMounts: Mount[];
}
export interface Plan {
  endpoint?: string;
  target?: string;
  id: string;
  snapshotId: string;
  daemonId: string;
  createdAt: string;
  actions: Action[];
  warnings: string[];
  estimate: Estimate;
  newlyEligible: string[];
  volumes: boolean;
  cacheScope: boolean;
}
export interface Outcome {
  key: string;
  status: string;
  message: string;
}
export type ActionStatus =
  | "queued"
  | "checking"
  | "deleting"
  | "deleted"
  | "failed"
  | "skipped"
  | "cancelled";
export interface CleanupProgress {
  operationId: string;
  planId: string;
  key: string | null;
  name: string | null;
  phase: ActionStatus | "complete";
  completed: number;
  total: number;
  cacheScope: boolean;
  message: string;
}
export interface CleanupResult {
  id: string;
  at: string;
  plan: Plan;
  outcomes: Outcome[];
  before: Snapshot;
  after: Snapshot | null;
  reportedReclaimed: number | null;
  hostFreeDelta: number | null;
  notes: string[];
}
export type Request =
  | { type: "contexts" }
  | { type: "scan"; endpoint: string }
  | { type: "snapshot" | "history" }
  | { type: "inspect" | "diff" | "processes"; key: string }
  | {
      type: "saveAsset";
      key: string;
      alias: string;
      project: string | null;
      protected: boolean;
    }
  | { type: "plan"; keys: string[] }
  | { type: "prunePlan"; scope: string; olderThanDays: number | null }
  | {
      type: "execute";
      planId: string;
      confirmed: boolean;
      confirmVolumes: boolean;
      confirmCacheScope: boolean;
    };
