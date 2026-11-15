import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";
test("long image/path labels fit, preserve suffixes and disclose full names on hover and focus", async ({
  page,
}) => {
  const snapshot = makeDemo();
  const image = snapshot.assets.find((a) => a.kind === "image")!;
  image.name =
    "registry.example:5000/organisation/" +
    "a-long-namespace-".repeat(12) +
    "/useful-image:dev";
  image.bytes = 40 * 1024 ** 3;
  image.shared = 0;
  image.project = "/home/user/workspaces/a-long-project-path/useful-project";
  snapshot.assets = snapshot.assets.filter(
    (a) => a.kind !== "image" || a.key === image.key,
  );
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
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Connect & scan" }).click();
  const tile = page.getByRole("button", {
    name: `Inspect ${image.name}`,
    exact: false,
  });
  await expect(tile.locator(".map-asset-label")).toContainText([
    "useful-image",
  ]);
  await tile.hover();
  await expect(page.getByRole("tooltip")).toContainText(image.name);
  await page.mouse.move(0, 0);
  await tile.focus();
  await expect(page.getByRole("tooltip")).toContainText(image.name);
  await page.getByRole("button", { name: "By project", exact: true }).click();
  const group = page.getByRole("button", {
    name: `Explore ${image.project}`,
    exact: true,
  });
  await group.focus();
  await expect(page.getByRole("tooltip")).toContainText(image.project);
  await expect(group).toContainText("useful-project");
  for (const width of [1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.locator(".treemap text").evaluateAll((elements) =>
          elements.every((el) => {
            if (!el.textContent?.trim()) return true;
            const text = el as SVGTextElement,
              clipId = (
                text.getAttribute("clip-path") ??
                text.parentElement?.getAttribute("clip-path") ??
                ""
              ).match(/url\(#(.+)\)/)?.[1];
            if (!clipId) return true;
            const clip = document
              .getElementById(clipId)!
              .querySelector("rect")!;
            const x = Number(clip.getAttribute("x")),
              w = Number(clip.getAttribute("width")),
              bounds = text.getBBox();
            return bounds.x >= x - 1 && bounds.x + bounds.width <= x + w + 1;
          }),
        ),
      )
      .toBe(true);
  }
  await page.screenshot({ path: "artifacts/m2/treemap-labels.png" });
});
