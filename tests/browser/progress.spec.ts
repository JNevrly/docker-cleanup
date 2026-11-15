import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

test("live item progress, mixed terminal counts, cancellation and navigation are truthful", async ({
  page,
}) => {
  const snapshot = makeDemo();
  const actions = Array.from({ length: 4 }, (_, i) => ({
    key: `container:progress-${i}`,
    id: `progress-${i}`,
    kind: "container",
    name: `Reviewed action ${i}`,
    fingerprint: "",
    evidence: [],
    retainedMounts: [],
  }));
  const plan = {
    id: "progress-plan",
    daemonId: snapshot.daemonId,
    snapshotId: snapshot.id,
    createdAt: snapshot.capturedAt,
    actions,
    estimate: { reported: 0, lower: 0, upper: null, notes: [] },
    warnings: [],
    newlyEligible: [],
    volumes: false,
    cacheScope: false,
  };
  await page.addInitScript(
    ({ snapshot, plan }) => {
      let callback: (event: unknown) => void = () => {};
      const state = {
        cancelled: 0,
        finish: () => {},
        emit: (key: string, phase: string, old = false) => {
          callback({
            event: "operation-progress",
            payload: {
              operationId: old ? "old" : plan.id,
              planId: old ? "old" : plan.id,
              key,
              phase,
              name: "Reviewed action",
              completed: 0,
              total: 4,
              cacheScope: false,
              message: `${phase} evidence`,
            },
          });
        },
      };
      Object.assign(window, {
        progressTest: state,
        __TAURI_INTERNALS__: {
          transformCallback: (fn: (event: unknown) => void) => {
            callback = fn;
            return 1;
          },
          invoke: async (
            command: string,
            args: { request?: { type: string } },
          ) => {
            if (command === "cancel") {
              state.cancelled++;
              return;
            }
            if (command !== "dispatch") return 1;
            if (args.request?.type === "scan") return snapshot;
            if (args.request?.type === "plan") return plan;
            if (args.request?.type === "execute") {
              await new Promise<void>((resolve) => {
                state.finish = resolve;
              });
              return {
                id: "progress-result",
                at: snapshot.capturedAt,
                plan,
                before: snapshot,
                after: snapshot,
                outcomes: ["deleted", "failed", "skipped", "cancelled"].map(
                  (status, i) => ({
                    key: plan.actions[i].key,
                    status,
                    message: `${status} final evidence`,
                  }),
                ),
                notes: [],
                reportedReclaimed: null,
                hostFreeDelta: null,
              };
            }
          },
        },
      });
    },
    { snapshot, plan },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Connect & scan" }).click();
  await page
    .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Review cleanup →", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "I reviewed this plan and understand deletion is irreversible.",
    })
    .check();
  await page
    .getByRole("button", { name: "Delete reviewed assets", exact: true })
    .click();
  const progress = page.getByRole("region", {
    name: "Cleanup progress",
    exact: true,
  });
  const rows = progress.locator(".cleanup-action-progress li");
  await expect(rows).toHaveCount(4);
  await expect(progress.getByRole("status")).toContainText("0 of 4");
  const emit = async (key: string, phase: string, old = false) =>
    page.evaluate(
      ({ key, phase, old }) =>
        (
          window as unknown as {
            progressTest: { emit: (k: string, p: string, o: boolean) => void };
          }
        ).progressTest.emit(key, phase, old),
      { key, phase, old },
    );
  await emit(actions[0].key, "checking");
  await expect(rows.nth(0)).toHaveAttribute("data-status", "checking");
  await expect(rows.nth(0).locator(".spinner")).toBeVisible();
  await emit(actions[0].key, "deleting");
  await expect(rows.nth(0)).toHaveAttribute("data-status", "deleting");
  await progress
    .getByRole("button", { name: "Cancel remaining actions", exact: true })
    .focus();
  await emit(actions[0].key, "deleted");
  await expect(
    progress.getByRole("button", {
      name: "Cancel remaining actions",
      exact: true,
    }),
  ).toBeFocused();
  await emit(actions[1].key, "deleted", true);
  await expect(rows.nth(1)).toHaveAttribute("data-status", "queued");
  await page.getByRole("button", { name: /Storage explorer/ }).click();
  await expect(page.locator(".active-cleanup")).toBeVisible();
  await emit(actions[1].key, "failed");
  await page
    .locator(".active-cleanup")
    .getByRole("button", { name: "View cleanup progress", exact: true })
    .click();
  await expect(rows.nth(1)).toHaveAttribute("data-status", "failed");
  await progress
    .getByRole("button", { name: "Cancel remaining actions", exact: true })
    .click();
  await emit(actions[2].key, "skipped");
  await emit(actions[3].key, "cancelled");
  await expect(progress.getByRole("status")).toContainText(
    "4 of 4 actions finished · 1 deleted/simulated · 1 failed · 1 skipped · 1 cancelled",
  );
  await expect(progress.getByRole("progressbar")).toHaveAttribute("value", "4");
  await page.screenshot({ path: "artifacts/cleanup-progress.png" });
  await page.evaluate(() =>
    (
      window as unknown as { progressTest: { finish: () => void } }
    ).progressTest.finish(),
  );
  await expect(
    page.getByRole("region", { name: "Cleanup result", exact: true }),
  ).toContainText("cancelled final evidence");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { progressTest: { cancelled: number } })
          .progressTest.cancelled,
    ),
  ).toBe(1);
});
