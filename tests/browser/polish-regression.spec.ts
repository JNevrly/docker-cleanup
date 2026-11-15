import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";
for (const [width, height, theme] of [
  [1024, 720, "light"],
  [1440, 900, "dark"],
  [1920, 1080, "system"],
] as const)
  test(`dense independent panes and keyboard focus in ${theme}`, async ({
    page,
  }) => {
    const snapshot = makeDemo();
    snapshot.assets.push(
      ...Array.from({ length: 150 }, (_, i) => ({
        ...snapshot.assets[0],
        key: `container:extra-${i}`,
        id: `extra-${i}`,
        name: `development-workspace-${i}`,
        project: "/home/user/projects/long-workspace-path",
        refs: [],
      })),
    );
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(
      ({ snapshot, theme }) => {
        localStorage.setItem(
          "docker-cleanup.preferences",
          JSON.stringify({
            theme,
            mapCollapsed: true,
            inspectorWidth: 360,
            mapHeight: 420,
          }),
        );
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
      { snapshot, theme },
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Connect & scan" }).click();
    await page
      .getByRole("button", { name: "objective_bartik", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
      .check();
    await page
      .getByRole("textbox", { name: "Friendly name" })
      .fill("Preserved draft");
    await page
      .getByRole("separator", { name: "Inspector width", exact: true })
      .focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("separator", { name: "Inspector width", exact: true }),
    ).toBeFocused();
    const before = await page.locator(".inspector").boundingBox();
    await page.locator(".table-scroll").evaluate((el) => (el.scrollTop = 500));
    expect(
      await page.locator(".table-scroll").evaluate((el) => el.scrollTop),
    ).toBe(500);
    expect(
      await page.locator(".inspector").evaluate((el) => el.scrollTop),
    ).toBe(0);
    await page.locator(".inspector").evaluate((el) => (el.scrollTop = 180));
    expect(
      await page.locator(".table-scroll").evaluate((el) => el.scrollTop),
    ).toBe(500);
    expect((await page.locator(".inspector").boundingBox())!.height).toBe(
      before!.height,
    );
    await page.getByRole("button", { name: /Storage explorer/ }).click();
    await expect(
      page.getByRole("textbox", { name: "Friendly name" }),
    ).toHaveValue("Preserved draft");
    await expect(
      page.getByRole("checkbox", {
        name: "Select objective_bartik",
        exact: true,
      }),
    ).toBeChecked();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `artifacts/m2/dense-${theme}-${width}.png` });
  });
