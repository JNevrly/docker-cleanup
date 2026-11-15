import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";
import type { CleanupResult } from "../../src/types";

function legacyResult(index: number): CleanupResult {
  const before = makeDemo(),
    at = new Date(Date.UTC(2026, 8, 1 + index)).toISOString();
  before.daemonId = "legacy-daemon";
  before.endpoint = "unix:///synthetic/legacy.sock";
  const a = before.assets[0];
  return {
    id: `legacy-${index}`,
    at,
    before,
    after: index === 20 ? null : before,
    plan: {
      id: `legacy-plan-${index}`,
      snapshotId: before.id,
      daemonId: before.daemonId,
      createdAt: at,
      actions: [
        {
          key: a.key,
          id: a.id,
          name: `legacy-workspace-${index}`,
          kind: a.kind,
          fingerprint: "",
          evidence: [],
          retainedMounts: [],
        },
      ],
      estimate: {
        reported: 100,
        lower: 50,
        upper: null,
        notes: ["Unknown shared size"],
      },
      warnings: [],
      newlyEligible: ["image:dangling"],
      volumes: false,
      cacheScope: false,
    },
    outcomes: [
      {
        key: a.key,
        status: "deleted",
        message: "Selected container removed; unselected data retained.",
      },
      {
        key: "failed-image",
        status: "failed",
        message: "Permission denied for one image.",
      },
      {
        key: "dependent",
        status: "skipped",
        message: "A prerequisite failed.",
      },
    ],
    notes: [
      "After-scan unavailable for some batches. Partial success is not rolled back.",
    ],
    reportedReclaimed: null,
    hostFreeDelta: null,
  };
}

async function stub(
  page: import("@playwright/test").Page,
  records: CleanupResult[],
) {
  const snapshot = makeDemo();
  snapshot.daemonId = "different-daemon";
  await page.addInitScript(
    ({ snapshot, records }) => {
      Object.assign(window, {
        historyTest: { daemon: "different-daemon", executes: 0 },
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request?: { type: string } },
          ) => {
            if (command !== "dispatch") return 1;
            const test = (
              window as unknown as {
                historyTest: { daemon: string; executes: number };
              }
            ).historyTest;
            if (args.request?.type === "scan")
              return { ...snapshot, daemonId: test.daemon };
            if (args.request?.type === "history") return records;
            if (args.request?.type === "execute") {
              test.executes++;
              throw Error("Historical execution forbidden");
            }
          },
        },
      });
    },
    { snapshot, records },
  );
  await page.goto("/");
}

test("history Back preserves filters/order/page and legacy partial results stay readable", async ({
  page,
}) => {
  const records = Array.from({ length: 45 }, (_, i) => legacyResult(i));
  records[20].outcomes.push(
    ...Array.from({ length: 250 }, (_, i) => ({
      key: `long-action-${i}`,
      status: i % 2 ? "failed" : "deleted",
      message: `Synthetic long batch ${i}: ${"details ".repeat(20)}`,
    })),
  );
  await stub(page, records);
  await page.getByRole("button", { name: /Cleanup history/ }).click();
  const history = page.getByRole("region", {
    name: "Cleanup history",
    exact: true,
  });
  await history
    .getByRole("textbox", { name: "Search cleanup history" })
    .fill("legacy");
  await history
    .getByRole("combobox", { name: "History outcome" })
    .selectOption("failed");
  await history
    .getByRole("combobox", { name: "History order" })
    .selectOption("oldest");
  await history
    .getByRole("button", { name: "Next history page", exact: true })
    .click();
  await history
    .getByRole("link", { name: "Open cleanup result legacy-20", exact: true })
    .click();
  const result = page.getByRole("region", {
    name: "Cleanup result",
    exact: true,
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(result).toContainText("Daemon legacy-daemon");
  await expect(result).toContainText("Original estimate");
  await expect(result).toContainText("incomplete");
  await expect(result).toContainText("Unavailable");
  await expect(result).toContainText("Docker reported reclaimed");
  await expect(result).toContainText("Host free-space delta");
  await expect(result.locator(".result-outcomes li")).toHaveCount(253);
  await expect(result).toContainText("Partial success is not rolled back");
  await result.getByRole("button", { name: "← Back", exact: true }).click();
  await expect(
    history.getByRole("textbox", { name: "Search cleanup history" }),
  ).toHaveValue("legacy");
  await expect(
    history.getByRole("combobox", { name: "History outcome" }),
  ).toHaveValue("failed");
  await expect(
    history.getByRole("combobox", { name: "History order" }),
  ).toHaveValue("oldest");
  await expect(history).toContainText("Page 2 of 3");
  await expect(
    history.getByRole("link", {
      name: "Open cleanup result legacy-20",
      exact: true,
    }),
  ).toBeVisible();
  await history
    .getByRole("textbox", { name: "Search cleanup history" })
    .fill("no-such-batch");
  await expect(history).toContainText(
    "No history entries match these filters.",
  );
});

test("historical follow-up is blocked for another daemon and selects only eligible current assets", async ({
  page,
}) => {
  await stub(page, [legacyResult(0)]);
  await page.getByRole("button", { name: "Connect & scan" }).click();
  await page.getByRole("button", { name: /Cleanup history/ }).click();
  await page
    .getByRole("link", { name: "Open cleanup result legacy-0", exact: true })
    .click();
  const followUp = page.getByRole("button", {
    name: "Review newly eligible images →",
    exact: true,
  });
  await expect(followUp).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "Cleanup result", exact: true }),
  ).toContainText("Connect to this result’s daemon");
  await page.getByRole("button", { name: /Storage explorer/ }).click();
  await page.evaluate(() => {
    (
      window as unknown as { historyTest: { daemon: string } }
    ).historyTest.daemon = "legacy-daemon";
  });
  await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
  await page.getByRole("button", { name: /Cleanup history/ }).click();
  await page
    .getByRole("link", { name: "Open cleanup result legacy-0", exact: true })
    .click();
  await expect(followUp).toBeEnabled();
  await followUp.click();
  await expect(
    page.getByRole("checkbox", {
      name: "Select <dangling> old development image",
      exact: true,
    }),
  ).toBeChecked();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { historyTest: { executes: number } }).historyTest
          .executes,
    ),
  ).toBe(0);
});

test("empty history is distinct from a filtered-out collection", async ({
  page,
}) => {
  await stub(page, []);
  await page.getByRole("button", { name: /Cleanup history/ }).click();
  await expect(
    page.getByRole("region", { name: "Cleanup history", exact: true }),
  ).toContainText("No cleanup batches yet.");
});
