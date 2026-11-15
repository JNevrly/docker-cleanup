import type { CleanupProgress, CleanupResult, Plan } from "./types";
export interface ProgressRow {
  key: string;
  name: string;
  status: string;
  message: string;
}
export const terminalStatus = (status: string) =>
  ["deleted", "failed", "skipped", "cancelled", "simulated"].includes(status);
export function queuedActions(plan: Plan): ProgressRow[] {
  return plan.cacheScope
    ? [
        {
          key: "engine-cache",
          name: "Engine-wide eligible cache prune",
          status: "queued",
          message: "Waiting for safety checks",
        },
      ]
    : plan.actions.map((a) => ({
        key: a.key,
        name: a.name,
        status: "queued",
        message: "Waiting for safety checks",
      }));
}
export function applyProgress(
  rows: ProgressRow[],
  event: CleanupProgress,
  planId: string,
): ProgressRow[] {
  if (event.planId !== planId || event.operationId !== planId || !event.key)
    return rows;
  return rows.map((row) =>
    row.key !== event.key || terminalStatus(row.status)
      ? row
      : { ...row, status: event.phase, message: event.message },
  );
}
export function reconcileProgress(
  rows: ProgressRow[],
  result: CleanupResult,
): ProgressRow[] {
  return rows.map((row) => {
    const outcome = result.outcomes.find((o) => o.key === row.key);
    return outcome
      ? { ...row, status: outcome.status, message: outcome.message }
      : row;
  });
}
