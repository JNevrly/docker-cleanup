import { expect, test } from "@playwright/test";

for (const font of ["system-ui", "Arial"])
  test(`classic scrollbars preserve table content with ${font}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.goto("/");
    // Exercise non-overlay platform scrollbars. Their height is outside
    // clientHeight and must not consume the asset table's reserved content area.
    await page.addStyleTag({
      content: `
        .app { font-family: ${font}, sans-serif; }
        .table-scroll table { min-width: 1500px; }
        .table-scroll::-webkit-scrollbar { height: 21px; width: 21px; }
        .table-scroll::-webkit-scrollbar-thumb { background: #888; }
      `,
    });
    await page
      .getByRole("button", { name: "objective_bartik", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Friendly name" })
      .fill("Keep draft");
    const inspector = page.getByRole("separator", {
      name: "Inspector width",
      exact: true,
    });
    await inspector.focus();
    await page.keyboard.press("Home");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
    const map = page.getByRole("separator", {
      name: "Treemap height",
      exact: true,
    });
    await map.focus();
    await page.keyboard.press("End");
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const table = page.locator(".table-scroll");
    try {
      await expect
        .poll(() => table.evaluate((el) => el.offsetHeight - el.clientHeight))
        .toBeGreaterThanOrEqual(21);
      await expect
        .poll(() => table.evaluate((el) => el.clientHeight))
        .toBeGreaterThanOrEqual(100);
      await table.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page
        .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
        .check();
      await expect(
        page.getByRole("textbox", { name: "Friendly name" }),
      ).toHaveValue("Keep draft");
      await expect(
        page.getByRole("checkbox", {
          name: "Select objective_bartik",
          exact: true,
        }),
      ).toBeChecked();
      // Extra wrapping/open help can exceed the minimum-map budget. The pane
      // must scroll controls rather than clipping away the asset viewport.
      await page.locator(".scan-notes > summary").click();
      await expect(page.locator(".scan-notes")).toHaveAttribute("open", "");
      await expect
        .poll(() => table.evaluate((el) => el.clientHeight))
        .toBeGreaterThanOrEqual(100);
      await table.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page
        .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
        .uncheck();
      await expect(
        page.getByRole("textbox", { name: "Friendly name" }),
      ).toHaveValue("Keep draft");
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
    } finally {
      await testInfo.attach("workspace-geometry", {
        contentType: "application/json",
        body: JSON.stringify(
          await page.evaluate(() => {
            const pane = document.querySelector(".explorer") as HTMLElement;
            const table = document.querySelector(
              ".table-scroll",
            ) as HTMLElement;
            return {
              pane: { height: pane.clientHeight, width: pane.clientWidth },
              table: {
                outer: table.offsetHeight,
                client: table.clientHeight,
                scrollTop: table.scrollTop,
              },
              children: [...pane.children].map((el) => ({
                name: el.id || el.className,
                height: el.getBoundingClientRect().height,
              })),
              legend: document.querySelector(".legend")?.getBoundingClientRect()
                .height,
            };
          }),
          null,
          2,
        ),
      });
    }
  });
