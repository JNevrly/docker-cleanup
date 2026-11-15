import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

for (const [width, height] of [
  [1024, 720],
  [1440, 900],
  [1920, 1080],
]) {
  test(`compact workspace fits ${width}x${height} with readable table rows`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Focus asset table", exact: true })
      .click();
    await expect(page.locator("#storage-map")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Review cleanup →", exact: true }),
    ).toBeVisible();
    const metrics = await page.evaluate(() => {
      const footer = document
        .querySelector(".selection-bar")!
        .getBoundingClientRect();
      const table = document
        .querySelector(".table-scroll")!
        .getBoundingClientRect();
      const header = document.querySelector("thead")!.getBoundingClientRect();
      const rows = [...document.querySelectorAll("tbody tr")].filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.top >= header.bottom &&
          r.bottom <= Math.min(footer.top, table.bottom, innerHeight)
        );
      });
      return {
        rows: rows.length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        font: getComputedStyle(document.querySelector("td")!).fontSize,
      };
    });
    expect(metrics.overflow).toBe(false);
    await page.screenshot({ path: `artifacts/layout-${width}.png` });
    expect(metrics.rows).toBeGreaterThanOrEqual(6);
    expect(parseFloat(metrics.font)).toBeGreaterThanOrEqual(14);
    await page.screenshot({ path: `artifacts/layout-${width}.png` });
  });
}

test("treemap and inspector sizing, collapse and keyboard controls persist", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.getByRole("separator", {
    name: "Treemap height",
    exact: true,
  });
  await map.focus();
  await page.keyboard.press("ArrowDown");
  await expect(map).toHaveAttribute("aria-valuenow", "210");
  await expect(page.locator(".map-region")).toHaveCSS("height", "210px");
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  const inspector = page.getByRole("separator", {
    name: "Inspector width",
    exact: true,
  });
  await inspector.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(inspector).toHaveAttribute("aria-valuenow", "360");
  await expect(page.locator(".inspector")).toHaveCSS("width", "360px");
  await page
    .getByRole("button", { name: "Collapse inspector", exact: true })
    .click();
  await expect(page.locator(".inspector")).toBeHidden();
  await page
    .getByRole("button", { name: "Show inspector", exact: true })
    .click();
  await expect(page.locator(".inspector h2")).toHaveText("objective_bartik");
  await page
    .getByRole("button", { name: "Focus asset table", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("#storage-map")).toBeHidden();
  await page
    .getByRole("button", { name: "Show landscape", exact: true })
    .click();
  await expect(map).toHaveAttribute("aria-valuenow", "210");
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  await expect(inspector).toHaveAttribute("aria-valuenow", "360");
  await expect(page.locator(".treemap")).toHaveCSS("height", "210px");
});

test("long asset names do not expand the page and remain inspectable", async ({
  page,
}) => {
  const snapshot = makeDemo();
  const long = "long-workspace-" + "example-".repeat(50);
  snapshot.assets[0].name = long;
  await page.addInitScript(
    ({ snapshot }) => {
      Object.assign(window, {
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request?: { type: string } },
          ) =>
            command === "dispatch" && args.request?.type === "scan"
              ? snapshot
              : 1,
        },
      });
    },
    { snapshot },
  );
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connect & scan", exact: true })
    .click();
  await page.getByRole("button", { name: long, exact: true }).click();
  await expect(page.locator(".inspector h2")).toHaveText(long);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Collapse inspector", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: long, exact: true }),
  ).toHaveAttribute("title", long);
});
