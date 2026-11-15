import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

test("full-page review and Back preserve explorer context without deleting", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "By project", exact: true }).click();
  await page.getByRole("textbox", { name: "Search assets" }).fill("objective");
  await page
    .getByRole("combobox", { name: "Container state" })
    .selectOption("stopped");
  await page.getByRole("combobox", { name: "Sort assets" }).selectOption("age");
  await page
    .getByRole("spinbutton", { name: "Minimum age in days" })
    .fill("100");
  await page
    .getByRole("button", { name: "Explore robotics-workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Friendly name" })
    .fill("Unsaved inspector context");
  await page
    .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Review cleanup →", exact: true })
    .click();
  const review = page.getByRole("region", { name: "Review cleanup plan" });
  await expect(review).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(review).toContainText("Retained bind:");
  await expect(review).toContainText("Daemon demo");
  await expect(
    review.getByRole("button", { name: "Simulate cleanup" }),
  ).toBeDisabled();
  await review.getByRole("button", { name: "← Back", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Search assets" }),
  ).toHaveValue("objective");
  await expect(
    page.getByRole("combobox", { name: "Container state" }),
  ).toHaveValue("stopped");
  await expect(page.getByRole("combobox", { name: "Sort assets" })).toHaveValue(
    "age",
  );
  await expect(
    page.getByRole("spinbutton", { name: "Minimum age in days" }),
  ).toHaveValue("100");
  await expect(
    page.getByRole("textbox", { name: "Friendly name" }),
  ).toHaveValue("Unsaved inspector context");
  await expect(
    page.getByRole("button", { name: "By project", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".breadcrumbs")).toContainText(
    "robotics-workspace",
  );
  await expect(
    page.getByRole("checkbox", {
      name: "Select objective_bartik",
      exact: true,
    }),
  ).toBeChecked();
  await page.getByRole("button", { name: /Cleanup history/ }).click();
  await expect(
    page.getByRole("region", { name: "Cleanup history", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Cleanup history", exact: true }),
  ).toContainText("No cleanup batches");
});

test("cache acknowledgement and active cleanup survive navigation without replay or cancellation", async ({
  page,
}) => {
  const snapshot = makeDemo();
  snapshot.assets.push({
    ...snapshot.assets[0],
    key: "cache:synthetic",
    id: "synthetic",
    kind: "cache",
    name: "Synthetic cache",
    protected: false,
    refs: [],
  });
  const plan = {
    id: "nav-plan",
    snapshotId: snapshot.id,
    daemonId: snapshot.daemonId,
    createdAt: snapshot.capturedAt,
    actions: [
      {
        key: "cache:engine",
        id: "engine",
        name: "Engine-wide cache prune",
        kind: "cache",
        fingerprint: "",
        evidence: [],
        retainedMounts: [],
      },
    ],
    warnings: ["Entire eligible Engine cache; in-use records retained."],
    estimate: { reported: 100, lower: 0, upper: 100, notes: [] },
    newlyEligible: [],
    volumes: false,
    cacheScope: true,
  };
  await page.addInitScript(
    ({ snapshot, plan }) => {
      const state = { executes: 0, cancels: 0, finish: () => {} };
      Object.assign(window, {
        navigationTest: state,
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request?: { type: string } },
          ) => {
            if (command === "cancel") {
              state.cancels++;
              return;
            }
            if (command !== "dispatch") return 1;
            switch (args.request?.type) {
              case "scan":
                return snapshot;
              case "prunePlan":
                return plan;
              case "history":
                return [];
              case "execute":
                state.executes++;
                await new Promise<void>((resolve) => {
                  state.finish = resolve;
                });
                return {
                  id: "nav-result",
                  at: snapshot.capturedAt,
                  plan,
                  before: snapshot,
                  after: snapshot,
                  outcomes: [
                    {
                      key: "cache:engine",
                      status: "deleted",
                      message: "Synthetic cache result",
                    },
                  ],
                  notes: ["Not a rollback point."],
                  reportedReclaimed: 80,
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
  await page.getByRole("button", { name: /Prune resources/ }).click();
  await page
    .getByRole("combobox", { name: "Prune scope", exact: true })
    .selectOption("cache");
  await page
    .getByRole("button", { name: "Preview prune plan", exact: true })
    .click();
  const review = page.getByRole("region", { name: "Review cleanup plan" });
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
  await page.getByRole("button", { name: /Storage explorer/ }).click();
  await expect(page.locator(".active-cleanup")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review cleanup →", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Cleanup history/ }).click();
  await expect(
    page.getByRole("region", { name: "Cleanup history", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".active-cleanup")).toBeVisible();
  expect(
    await page.evaluate(() => {
      const state = (
        window as unknown as {
          navigationTest: { executes: number; cancels: number };
        }
      ).navigationTest;
      return { executes: state.executes, cancels: state.cancels };
    }),
  ).toEqual({ executes: 1, cancels: 0 });
  await page.evaluate(() =>
    (
      window as unknown as { navigationTest: { finish: () => void } }
    ).navigationTest.finish(),
  );
  await expect(page.locator(".active-cleanup")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Cleanup history", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Last cleanup", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Cleanup result", exact: true }),
  ).toContainText("Synthetic cache result");
  await expect(
    page.getByRole("button", { name: "Delete reviewed assets", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cleanup review", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "artifacts/workspace-result.png" });
});
