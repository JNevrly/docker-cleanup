import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

for (const font of ["system-ui", "Arial"])
  test(`compact treemap keeps header and leaf targets separate with ${font}`, async ({
    page,
  }, testInfo) => {
    const snapshot = makeDemo();
    const template = snapshot.assets[0];
    snapshot.assets = (
      [
        ["container", "Workspace", 20],
        ["image", "registry/team/image:v0", 12],
        ["volume", "Database storage", 8],
        ["shared", "Shared image data", 4],
        ["cache", "Tiny cache", 1 / 1024 ** 3],
      ] as const
    ).map(([kind, name, gib], i) => ({
      ...template,
      key: `${kind}:fixture-${i}`,
      id: `fixture-${i}`,
      kind,
      name,
      bytes: gib * 1024 ** 3,
      shared: 0,
      refs: [],
      mounts: [],
      state: kind === "container" ? "exited" : "unused",
      project: "/workspaces/category-fixture",
    }));
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.addInitScript(
      (snapshot) =>
        Object.assign(window, {
          __TAURI_INTERNALS__: {
            transformCallback: () => 1,
            invoke: async (
              command: string,
              args: { request?: { type: string } },
            ) => {
              if (command === "dispatch" && args.request?.type === "scan")
                return snapshot;
              return 1;
            },
          },
        }),
      snapshot,
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: "Connect & scan", exact: true })
      .click();
    const selected = page.getByRole("checkbox", {
      name: "Select Workspace",
      exact: true,
    });
    await selected.check();
    await page.getByRole("button", { name: "Workspace", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Friendly name" })
      .fill("Keep draft");
    // Control the SVG's actual height independently of platform font metrics.
    // These are supported compact sizes, not a larger map to avoid the bug.
    const style = await page.addStyleTag({
      content: `.app { font-family: ${font}; }`,
    });
    for (const height of [40, 50, 60, 80, 120]) {
      await style.evaluate((el, css) => {
        el.textContent = css;
      }, `.app { font-family: ${font}; } .map-region { height: ${height}px !important; }`);
      await expect
        .poll(() => page.locator(".treemap").getAttribute("viewBox"))
        .toMatch(new RegExp(` ${height}$`));
      const leaf = page.getByRole("button", {
        name: "Inspect Database storage",
        exact: false,
      });
      const header = page.getByRole("button", {
        name: "Explore Volumes",
        exact: true,
      });
      const geometry = await leaf.evaluate((el) => {
        const leaf = el.getBoundingClientRect();
        const header = document
          .querySelector(
            '.map-group-target[data-group="volume"] .map-group-hit',
          )!
          .getBoundingClientRect();
        return {
          leaf: {
            x: leaf.x,
            y: leaf.y,
            width: leaf.width,
            height: leaf.height,
          },
          header: {
            x: header.x,
            y: header.y,
            width: header.width,
            height: header.height,
          },
          ownsCenter: el.contains(
            document.elementFromPoint(
              leaf.x + leaf.width / 2,
              leaf.y + leaf.height / 2,
            ),
          ),
        };
      });
      await testInfo.attach(`targets-${height}`, {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
      expect(geometry.leaf.height).toBeGreaterThan(8);
      expect(geometry.leaf.y).toBeGreaterThanOrEqual(
        geometry.header.y + geometry.header.height,
      );
      expect(geometry.ownsCenter).toBe(true);
      await expect(
        page.getByRole("button", { name: "Inspect Tiny cache", exact: false }),
      ).toHaveCount(0);
      await header.click();
      await expect(
        page.getByRole("navigation", { name: "Storage location" }),
      ).toContainText("Volumes");
      await expect(
        page.getByRole("textbox", { name: "Friendly name" }),
      ).toHaveValue("Keep draft");
      await expect(selected).toHaveCount(0);
      await page
        .getByRole("button", { name: "All storage", exact: true })
        .click();
      await leaf.click();
      await expect(page.locator(".inspector h2")).toHaveText(
        "Database storage",
      );
      await expect(
        page.getByRole("navigation", { name: "Storage location" }),
      ).not.toContainText("Volumes");
      await expect(selected).toBeChecked();
      await expect
        .poll(() =>
          page.locator(".table-scroll").evaluate((el) => el.clientHeight),
        )
        .toBeGreaterThanOrEqual(100);
      await page
        .getByRole("button", { name: "Workspace", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Friendly name" })
        .fill("Keep draft");
    }
  });
