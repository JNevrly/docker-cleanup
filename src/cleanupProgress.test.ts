import { expect, it } from "vitest";
import {
  applyProgress,
  queuedActions,
  reconcileProgress,
} from "./cleanupProgress";
import type { CleanupProgress, CleanupResult, Plan } from "./types";
const plan = {
  id: "p",
  actions: [
    { key: "one", name: "One" },
    { key: "two", name: "Two" },
  ],
  cacheScope: false,
} as Plan;
const event = {
  operationId: "p",
  planId: "p",
  key: "one",
  phase: "deleted",
  message: "Removed",
} as CleanupProgress;
it("uses executable counts and ignores stale or regressive events", () => {
  const rows = queuedActions(plan);
  expect(rows).toHaveLength(2);
  expect(applyProgress(rows, { ...event, planId: "old" }, "p")).toBe(rows);
  const done = applyProgress(rows, event, "p");
  expect(applyProgress(done, { ...event, phase: "deleting" }, "p")).toEqual(
    done,
  );
  expect(
    reconcileProgress(rows, {
      outcomes: [{ key: "one", status: "failed", message: "Denied" }],
    } as CleanupResult)[0].status,
  ).toBe("failed");
});
it("represents all cache records as one Engine operation", () => {
  expect(queuedActions({ ...plan, cacheScope: true })).toEqual([
    {
      key: "engine-cache",
      name: "Engine-wide eligible cache prune",
      status: "queued",
      message: "Waiting for safety checks",
    },
  ]);
});
