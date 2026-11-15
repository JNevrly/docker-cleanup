import { expect, test } from "@playwright/test";
for (const [width, height] of [
  [1024, 720],
  [1440, 900],
  [1920, 1080],
])
  test(`map/table splitter retains usable panes at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const map = page.getByRole("separator", {
      name: "Treemap height",
      exact: true,
    });
    await expect
      .poll(async () => Number(await map.getAttribute("aria-valuenow")))
      .toBeGreaterThan(40);
    const start = Number(await map.getAttribute("aria-valuenow")),
      r = (await map.boundingBox())!;
    await page.mouse.move(r.x + 50, r.y + 5);
    await page.mouse.down();
    await page.mouse.move(r.x + 100, r.y - 25, { steps: 4 });
    await page.mouse.up();
    await expect
      .poll(async () => Number(await map.getAttribute("aria-valuenow")))
      .toBeLessThan(start);
    await map.focus();
    await page.keyboard.press("Home");
    await expect(map).toHaveAttribute("aria-valuenow", "40");
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowUp");
    const saved = await map.getAttribute("aria-valuenow");
    await page.reload();
    await expect(map).toHaveAttribute("aria-valuenow", saved!);
    await page.getByRole("button", { name: "By project", exact: true }).click();
    await page
      .getByRole("button", { name: "objective_bartik", exact: true })
      .click();
    const inspector = page.locator(".inspector"),
      before = await inspector.boundingBox();
    await map.focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    const after = await inspector.boundingBox();
    expect(after!.height).toBe(before!.height);
    expect(
      await page.locator(".table-scroll").evaluate((el) => el.clientHeight),
    ).toBeGreaterThanOrEqual(100);
    await page
      .getByRole("separator", { name: "Inspector width", exact: true })
      .focus();
    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(() =>
        page.locator(".table-scroll").evaluate((el) => el.clientHeight),
      )
      .toBeGreaterThanOrEqual(100);
    await expect(
      page.getByRole("button", { name: "Review cleanup →", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Focus asset table", exact: true })
      .click();
    await expect(map).toHaveCount(0);
    await page
      .getByRole("button", { name: "Show landscape", exact: true })
      .click();
    await expect(map).toBeVisible();
    await page.screenshot({ path: `artifacts/m2/map-split-${width}.png` });
  });
for (const [width, height] of [
  [1024, 720],
  [1440, 900],
  [1920, 1080],
])
  test(`inspector splitter and scroll independence at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Focus asset table", exact: true })
      .click();
    await page
      .getByRole("button", { name: "objective_bartik", exact: true })
      .click();
    const inspector = page.locator(".inspector"),
      split = page.getByRole("separator", {
        name: "Inspector width",
        exact: true,
      });
    await page
      .getByRole("textbox", { name: "Friendly name" })
      .fill("Draft survives collapse");
    const before = await inspector.boundingBox();
    const rect = (await split.boundingBox())!;
    await page.mouse.move(rect.x + rect.width / 2, rect.y + 50);
    await page.mouse.down();
    await page.mouse.move(rect.x - 30, rect.y + height + 100, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(() => inspector.evaluate((el) => el.getBoundingClientRect().width))
      .toBeGreaterThan(before!.width);
    await split.focus();
    await page.keyboard.press("Home");
    await expect(split).toHaveAttribute("aria-valuenow", "280");
    await page.keyboard.press("ArrowLeft");
    await expect(split).toHaveAttribute("aria-valuenow", "300");
    await page.evaluate(() => {
      document.querySelector(".table-scroll")!.scrollTop = 80;
      document.querySelector(".inspector")!.scrollTop = 140;
    });
    const geometry = await page.evaluate(() => {
      const i = document.querySelector(".inspector")!,
        t = document.querySelector(".table-scroll")!;
      return {
        tableScroll: t.scrollTop,
        canScrollTable: t.scrollHeight > t.clientHeight,
        inspectorScroll: i.scrollTop,
        height: i.clientHeight,
        y: i.getBoundingClientRect().y,
        overflow:
          document.documentElement.scrollHeight > innerHeight ||
          document.documentElement.scrollWidth > innerWidth,
      };
    });
    if (geometry.canScrollTable)
      expect(geometry.tableScroll).toBeGreaterThan(0);
    else expect(geometry.tableScroll).toBe(0);
    expect(geometry.inspectorScroll).toBeGreaterThan(0);
    expect(geometry.overflow).toBe(false);
    await page
      .getByRole("textbox", { name: "Search assets" })
      .fill("objective");
    expect(await inspector.evaluate((el) => el.clientHeight)).toBe(
      geometry.height,
    );
    expect(await inspector.evaluate((el) => el.scrollTop)).toBe(
      geometry.inspectorScroll,
    );
    await inspector.evaluate((el) => (el.scrollTop = 0));
    await page
      .getByRole("button", { name: "Collapse inspector", exact: true })
      .click();
    await expect(inspector).toBeHidden();
    await page
      .getByRole("button", { name: "Show inspector", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Friendly name" }),
    ).toHaveValue("Draft survives collapse");
    await page.reload();
    await page
      .getByRole("button", { name: "objective_bartik", exact: true })
      .click();
    await expect(split).toHaveAttribute("aria-valuenow", "300");
    await expect(
      page.getByRole("button", { name: "Review cleanup →", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/m2/inspector-split-${width}.png`,
    });
  });
