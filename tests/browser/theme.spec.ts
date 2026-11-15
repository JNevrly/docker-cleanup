import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

test("light is default; theme preferences persist and System follows live changes", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const theme = page.getByRole("combobox", { name: "Theme", exact: true });
  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(theme).toHaveValue("dark");
  await theme.selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(theme).toHaveValue("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("theme changes do not restart or lose an active cleanup", async ({
  page,
}) => {
  const snapshot = makeDemo();
  const asset = snapshot.assets[0];
  const plan = {
    id: "theme-plan",
    snapshotId: snapshot.id,
    daemonId: snapshot.daemonId,
    createdAt: snapshot.capturedAt,
    actions: [
      {
        key: asset.key,
        name: asset.name,
        kind: asset.kind,
        id: asset.id,
        fingerprint: "",
        evidence: [],
        retainedMounts: [],
      },
    ],
    warnings: ["Synthetic IPC test"],
    estimate: { reported: 100, lower: 100, upper: 100, notes: [] },
    newlyEligible: [],
    volumes: false,
    cacheScope: false,
  };
  await page.addInitScript(
    ({ snapshot, plan }) => {
      Object.assign(window, {
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request?: { type: string } },
          ) => {
            if (command !== "dispatch") return 1;
            const kind = args.request?.type;
            if (kind === "scan") return snapshot;
            if (kind === "plan") return plan;
            if (kind === "execute") {
              const w = window as unknown as {
                executeCount: number;
                finishCleanup: () => void;
              };
              w.executeCount = (w.executeCount || 0) + 1;
              await new Promise<void>((resolve) => {
                w.finishCleanup = resolve;
              });
              return {
                id: "theme-result",
                at: snapshot.capturedAt,
                plan,
                before: snapshot,
                after: snapshot,
                outcomes: [
                  {
                    key: plan.actions[0].key,
                    status: "deleted",
                    message: "Synthetic IPC result",
                  },
                ],
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
  await expect(
    page.getByText("Executing reviewed actions.", { exact: false }),
  ).toBeVisible();
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>(
      '[aria-label="Theme"]',
    )!;
    select.value = "dark";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => (window as unknown as { executeCount: number }).executeCount,
    ),
  ).toBe(1);
  await page.evaluate(() =>
    (window as unknown as { finishCleanup: () => void }).finishCleanup(),
  );
  await expect(
    page.getByRole("region", { name: "Cleanup result", exact: true }),
  ).toContainText("Synthetic IPC result");
});

test("theme changes preserve selection, inspector and review state with readable text", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
    .check();
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  const theme = page.getByRole("combobox", { name: "Theme", exact: true });
  for (const choice of ["dark", "light"]) {
    await theme.selectOption(choice);
    await expect(
      page.getByRole("checkbox", {
        name: "Select objective_bartik",
        exact: true,
      }),
    ).toBeChecked();
    await expect(page.locator(".inspector h2")).toHaveText("objective_bartik");
    const sizes = await page.evaluate(() => {
      const size = (selector: string) =>
        [...document.querySelectorAll<HTMLElement>(selector)]
          .filter((el) => el.getClientRects().length)
          .map((el) => parseFloat(getComputedStyle(el).fontSize));
      return {
        primary: size("td,th,.asset-name,button,input,select,.field,.evidence"),
        secondary: size("small,code,.badge"),
      };
    });
    expect(Math.min(...sizes.primary)).toBeGreaterThanOrEqual(14);
    expect(Math.min(...sizes.secondary)).toBeGreaterThanOrEqual(12);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `artifacts/theme-${choice}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Review cleanup →", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Review cleanup plan" }),
  ).toContainText("objective_bartik");
  // A preference update must not replace or authorize the reviewed plan.
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>(
      '[aria-label="Theme"]',
    )!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    )!.set!;
    setter.call(select, "dark");
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(
    page.getByRole("region", { name: "Review cleanup plan" }),
  ).toContainText("objective_bartik");
  await expect(
    page.getByRole("button", { name: "Simulate cleanup", exact: true }),
  ).toBeDisabled();
});
