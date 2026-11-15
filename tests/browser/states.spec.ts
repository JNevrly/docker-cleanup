import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";
import type { Snapshot } from "../../src/types";

async function stubDesktop(
  page: import("@playwright/test").Page,
  snapshots: Snapshot[],
) {
  await page.addInitScript(
    ({ snapshots }) => {
      let scan = 0;
      Object.assign(window, {
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request?: { type: string } },
          ) => {
            if (command === "dispatch" && args.request?.type === "scan") {
              await new Promise((resolve) => setTimeout(resolve, 300));
              const next = snapshots[Math.min(scan++, snapshots.length - 1)];
              if (!next)
                throw Error(
                  "permission-denied: socket inaccessible; check group membership",
                );
              return next;
            }
            return 1;
          },
        },
      });
    },
    { snapshots },
  );
}

test("loading, partial accounting, empty filters and keyboard selection", async ({
  page,
}) => {
  const snapshot = makeDemo();
  snapshot.warnings.push("Volume accounting unavailable: permission-denied");
  await stubDesktop(page, [snapshot]);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your Docker storage, explained." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Connect & scan" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await expect(
    page.getByRole("checkbox", {
      name: "Select objective_bartik",
      exact: true,
    }),
  ).toBeVisible();
  const checkbox = page.getByRole("checkbox", {
    name: "Select objective_bartik",
    exact: true,
  });
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await page
    .getByRole("textbox", { name: "Search assets" })
    .fill("no-such-project");
  await expect(
    page.getByText("No assets match this view.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("#selection-scope")).toContainText(
    "1 selected outside this view",
  );
  await page
    .getByRole("button", { name: "Show selection", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Select objective_bartik",
      exact: true,
    }),
  ).toBeChecked();
  await page.getByText(/Accounting, capability & observation notes/).click();
  await expect(
    page.getByText("Volume accounting unavailable: permission-denied"),
  ).toBeVisible();
});

test("disappeared assets and daemon changes clear unsafe selections with an explanation", async ({
  page,
}) => {
  const first = makeDemo();
  const second = structuredClone(first);
  second.assets = second.assets.filter((a) => a.id !== "objective");
  const third = structuredClone(second);
  third.daemonId = "different-daemon";
  await stubDesktop(page, [first, second, third]);
  await page.goto("/");
  await page.getByRole("button", { name: "Connect & scan" }).click();
  await page
    .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
    .check();
  await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
  await expect(page.getByText(/selected asset\(s\) disappeared/)).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Select jolly_poitras", exact: true })
    .check();
  await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
  await expect(
    page.getByText(/Docker daemon changed. Selection/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review cleanup →", exact: true }),
  ).toBeDisabled();
});

test("connection errors are visible and do not create a fake inventory", async ({
  page,
}) => {
  await stubDesktop(page, []);
  await page.goto("/");
  await page.getByRole("button", { name: "Connect & scan" }).click();
  await expect(page.getByRole("alert")).toContainText("permission-denied");
  await expect(
    page.getByRole("heading", { name: "Your Docker storage, explained." }),
  ).toBeVisible();
});

test("a large synthetic inventory remains searchable and sortable", async ({
  page,
}) => {
  const snapshot = makeDemo();
  const template = snapshot.assets[0];
  for (let i = 0; i < 1000; i++)
    snapshot.assets.push({
      ...template,
      id: `large-${i}`,
      key: `container:large-${i}`,
      name: `large-workspace-${i}`,
      project: `project-${i % 12}`,
      bytes: (i + 1) * 1024,
      refs: [],
      mounts: [],
    });
  await stubDesktop(page, [snapshot]);
  await page.goto("/");
  await page.getByRole("button", { name: "Connect & scan" }).click();
  await expect(
    page.locator('.asset-name[title="large-workspace-999"]'),
  ).toBeAttached();
  await page
    .getByRole("textbox", { name: "Search assets" })
    .fill("large-workspace-999");
  await expect(
    page.getByRole("row").filter({ hasText: "large-workspace-999" }),
  ).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Sort assets" })
    .selectOption("name");
  await expect(
    page.getByRole("button", { name: "large-workspace-999", exact: true }),
  ).toBeVisible();
});
