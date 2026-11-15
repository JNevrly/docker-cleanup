import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

async function cacheFixture(
  page: import("@playwright/test").Page,
  mode = "normal",
) {
  const snapshot = makeDemo();
  snapshot.capabilities.cache =
    mode === "unsupported"
      ? "unsupported"
      : mode === "unavailable"
        ? "unavailable"
        : "available";
  if (!["empty", "unsupported", "unavailable"].includes(mode))
    snapshot.assets.push({
      ...snapshot.assets[0],
      key: "cache:one",
      id: "one",
      kind: "cache",
      name: "Build stage",
      protected: mode === "protected",
      refs: [],
      mounts: [],
      bytes: mode === "zero" ? 0 : 1024,
      shared: 0,
      state: "cache",
    });
  await page.addInitScript(
    ({ snapshot }) => {
      const state = {
        requests: [] as { type: string; olderThanDays?: number | null }[],
        finish: () => {},
      };
      Object.assign(window, {
        cacheTest: state,
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request?: { type: string; olderThanDays?: number | null } },
          ) => {
            if (command !== "dispatch") return 1;
            const req = args.request!;
            state.requests.push(req);
            if (req.type === "scan") return snapshot;
            const records = snapshot.assets.filter((a) => a.kind === "cache");
            const plan = {
              id: "cache-plan",
              snapshotId: snapshot.id,
              daemonId: snapshot.daemonId,
              createdAt: snapshot.capturedAt,
              actions: records.map((a) => ({
                ...a,
                fingerprint: "",
                evidence: [],
                retainedMounts: [],
              })),
              estimate: { reported: 1024, lower: 0, upper: 1024, notes: [] },
              warnings: [],
              newlyEligible: [],
              volumes: false,
              cacheScope: true,
            };
            if (req.type === "prunePlan") return plan;
            if (req.type === "execute") {
              await new Promise<void>((resolve) => {
                state.finish = resolve;
              });
              return {
                id: "cache-result",
                at: snapshot.capturedAt,
                plan,
                before: snapshot,
                after: snapshot,
                outcomes: [
                  {
                    key: "engine-cache",
                    status: "deleted",
                    message: "In-use records retained.",
                  },
                ],
                notes: [],
                reportedReclaimed: 512,
                hostFreeDelta: null,
              };
            }
          },
        },
      });
    },
    { snapshot },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Connect & scan" }).click();
  await page.getByRole("button", { name: /^Build cache / }).click();
}

test("direct cache cleanup reviews one Engine-wide scope and requires separate acknowledgement", async ({
  page,
}) => {
  await cacheFixture(page);
  await expect(
    page.getByRole("checkbox", { name: "Select Build stage", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear Engine build cache", exact: true })
    .click();
  const review = page.getByRole("region", { name: "Review cleanup plan" });
  await expect(review).toContainText(
    "One Engine-wide eligible cache cleanup operation",
  );
  await expect(review).toContainText("External buildx");
  await review
    .getByRole("checkbox", {
      name: "I reviewed this plan and understand deletion is irreversible.",
    })
    .check();
  await expect(
    review.getByRole("button", { name: "Delete reviewed assets", exact: true }),
  ).toBeDisabled();
  await review
    .getByRole("checkbox", {
      name: /I authorize Engine-wide eligible builder-cache prune/,
    })
    .check();
  await review
    .getByRole("button", { name: "Delete reviewed assets", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Cleanup progress", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", {
      name: "Engine cache operation: duration unknown",
    }),
  ).not.toHaveAttribute("value");
  await expect(page.locator(".cleanup-action-progress li")).toHaveCount(1);
  await page.evaluate(() =>
    (
      window as unknown as { cacheTest: { finish: () => void } }
    ).cacheTest.finish(),
  );
  await expect(
    page.getByRole("region", { name: "Cleanup result", exact: true }),
  ).toContainText("Engine-wide eligible cache prune");
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            cacheTest: {
              requests: { type: string; olderThanDays?: number | null }[];
            };
          }
        ).cacheTest.requests.find((r) => r.type === "prunePlan")?.olderThanDays,
    ),
  ).toBeNull();
});

for (const [mode, explanation] of [
  ["protected", "Protected cache prevents"],
  ["empty", "No Engine cache records reported"],
  ["unsupported", "reporting is unsupported"],
  ["unavailable", "accounting is unavailable"],
  ["zero", "0 B"],
]) {
  test(`cache ${mode} is explained distinctly`, async ({ page }) => {
    await cacheFixture(page, mode);
    await expect(
      page.getByRole("region", { name: "Engine cache cleanup" }),
    ).toContainText(explanation);
    const action = page.getByRole("button", {
      name: "Clear Engine build cache",
      exact: true,
    });
    if (mode === "zero") await expect(action).toBeEnabled();
    else await expect(action).toBeDisabled();
  });
}
