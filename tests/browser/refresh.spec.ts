import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";
for (const [width, height] of [
  [1024, 720],
  [1440, 900],
  [1920, 1080],
])
  test(`periodic scan has no layout or scroll shift at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.clock.install();
    const snapshot = makeDemo();
    await page.addInitScript(
      ({ snapshot }) => {
        let callback: (event: unknown) => void = () => {};
        let scans = 0;
        const state = { finish: () => {}, fail: () => {} };
        Object.assign(window, {
          refreshTest: state,
          __TAURI_INTERNALS__: {
            transformCallback: (fn: (event: unknown) => void) => {
              callback = fn;
              return 1;
            },
            invoke: async (
              command: string,
              args: { request?: { type: string } },
            ) => {
              if (command !== "dispatch") return 1;
              if (args.request?.type === "scan") {
                if (scans++ > 0) {
                  callback({
                    payload: {
                      message:
                        "Reading inventory " +
                        "long status message ".repeat(30),
                    },
                  });
                  await new Promise<void>((resolve, reject) => {
                    state.finish = resolve;
                    state.fail = () =>
                      reject(Error("Permission denied during refresh"));
                  });
                }
                return snapshot;
              }
            },
          },
        });
      },
      { snapshot },
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Connect & scan" }).click();
    await page
      .getByRole("button", { name: "objective_bartik", exact: true })
      .click();
    await page.evaluate(() => {
      document.querySelector(".table-scroll")!.scrollTop = 90;
      document.querySelector(".inspector")!.scrollTop = 100;
    });
    const geometry = () =>
      page.evaluate(() =>
        Object.fromEntries(
          [
            ".explorer-header",
            ".explorer-grid",
            ".table-header",
            ".inspector",
            ".table-scroll",
          ].map((selector) => {
            const el = document.querySelector(selector)!,
              r = el.getBoundingClientRect();
            return [selector, [r.x, r.y, r.width, r.height, el.scrollTop]];
          }),
        ),
      );
    const before = await geometry();
    await page.clock.fastForward(60001);
    await expect(page.locator("header .scan-status")).toContainText(
      "Reading inventory",
    );
    expect(await geometry()).toEqual(before);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() =>
      (
        window as unknown as { refreshTest: { finish: () => void } }
      ).refreshTest.finish(),
    );
    await expect(page.locator(".scan-status .spinner")).toHaveCount(0);
    expect(await geometry()).toEqual(before);
    await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
    await page.evaluate(() =>
      (
        window as unknown as { refreshTest: { fail: () => void } }
      ).refreshTest.fail(),
    );
    await expect(page.getByRole("alert")).toContainText("Permission denied");
  });
