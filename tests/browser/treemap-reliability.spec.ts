import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";
import type { Snapshot } from "../../src/types";

export async function stubInventory(
  page: import("@playwright/test").Page,
  snapshot: Snapshot,
) {
  await page.addInitScript(
    ({ snapshot }) => {
      Object.assign(window, {
        mapRequests: [] as string[],
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request?: { type: string } },
          ) => {
            if (command !== "dispatch") return 1;
            (window as unknown as { mapRequests: string[] }).mapRequests.push(
              args.request!.type,
            );
            if (args.request?.type === "scan") return snapshot;
            throw Error("Unexpected operation " + args.request?.type);
          },
        },
      });
    },
    { snapshot },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connect & scan", exact: true })
    .click();
}

test("reported multi-tag image keeps its repository name and full identity", async ({
  page,
}) => {
  const snapshot = makeDemo(),
    image = snapshot.assets.find((a) => a.kind === "image")!;
  const reported =
    "gitext.alps.cz:5000/mmwave-radar/idec/idec-ros2-log-replay-ws/idec_ros2_log_replay_ws_devcontainer:v0";
  image.name = reported + ", " + reported.replace(":v0", ":latest");
  image.project = "Unattributed";
  image.bytes = 40 * 1024 ** 3;
  image.shared = 0;
  snapshot.assets = [image];
  await page.setViewportSize({ width: 1024, height: 900 });
  await stubInventory(page, snapshot);
  const tile = page.getByRole("button", {
    name: `Inspect ${image.name}`,
    exact: false,
  });
  await expect(tile.locator(".map-asset-label")).toContainText([
    "idec_ros2_log_replay_ws_devcontainer",
  ]);
  await tile.hover();
  await expect(page.getByRole("tooltip")).toContainText(reported);
  await expect(page.getByRole("tooltip")).toContainText(":latest");
  await tile.click();
  await expect(page.locator(".inspector h2")).toHaveText(image.name);
  await expect(
    page.getByRole("checkbox", { name: `Select ${image.name}`, exact: true }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => (window as unknown as { mapRequests: string[] }).mapRequests,
    ),
  ).toEqual(["scan"]);
  await page.screenshot({ path: "artifacts/m3/name-first.png" });
});

test("project header whitespace discloses full names and tiny projects have a real pointer fallback", async ({
  page,
}) => {
  const snapshot = makeDemo(),
    template = snapshot.assets[0];
  const project = "/workspaces/a-long-project-directory/descriptive-project",
    tiny = "/workspaces/tiny-project-with-no-visible-leaf";
  snapshot.assets = [
    {
      ...template,
      key: "container:large",
      id: "large",
      name: "Large workspace",
      project,
      bytes: 20 * 1024 ** 3,
      refs: [],
      mounts: [],
    },
    {
      ...template,
      key: "container:other",
      id: "other",
      name: "Other workspace",
      project: "/workspaces/other",
      bytes: 5 * 1024 ** 3,
      refs: [],
      mounts: [],
    },
    {
      ...template,
      key: "container:tiny",
      id: "tiny",
      name: "Tiny workspace",
      project: tiny,
      bytes: 1,
      refs: [],
      mounts: [],
    },
    ...Array.from({ length: 20 }, (_, i) => ({
      ...template,
      key: `container:small-${i}`,
      id: `small-${i}`,
      name: `Small workspace ${i}`,
      project: `/workspaces/many-long-project-directories/project-${i}`,
      bytes: 1024 ** 2,
      refs: [],
      mounts: [],
    })),
  ];
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubInventory(page, snapshot);
  await page
    .getByRole("checkbox", { name: "Select Large workspace", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Large workspace", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Friendly name" })
    .fill("Draft remains");
  await page.getByRole("button", { name: "By project", exact: true }).click();
  const header = page.getByRole("button", {
      name: `Explore ${project}`,
      exact: true,
    }),
    hit = header.locator(".map-group-hit");
  const hoverWhitespace = async () => {
    const r = (await hit.boundingBox())!;
    await page.mouse.move(r.x + r.width - 3, r.y + 3);
    await expect(page.getByRole("tooltip")).toContainText(project);
    await expect(page.getByRole("tooltip")).toContainText("20.0 GiB");
  };
  await hoverWhitespace();
  await header.focus();
  await expect(page.getByRole("tooltip")).toContainText(project);
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await hoverWhitespace();
  await page
    .getByRole("separator", { name: "Treemap height", exact: true })
    .focus();
  await page.keyboard.press("Home");
  await expect
    .poll(() =>
      page
        .locator(".treemap")
        .evaluate((el) => (el as SVGSVGElement).viewBox.baseVal.height),
    )
    .toBe(40);
  await hoverWhitespace();
  const tip = (await page.getByRole("tooltip").boundingBox())!;
  expect(tip.x).toBeGreaterThanOrEqual(0);
  expect(tip.y + tip.height).toBeLessThanOrEqual(900);
  const tinyHeader = page.getByRole("button", {
    name: `Explore ${tiny}`,
    exact: true,
  });
  await expect(tinyHeader.locator(".map-group-label")).toHaveCount(0);
  await tinyHeader.focus();
  await expect(page.getByRole("tooltip")).toContainText(tiny);
  await page.getByLabel("Browse all projects", { exact: true }).click();
  const fallback = page.getByRole("button", {
    name: `Explore project ${tiny}`,
    exact: true,
  });
  await expect(fallback).toBeVisible();
  await fallback.hover();
  await expect(fallback).toContainText("1 B");
  await page.screenshot({ path: "artifacts/m3/project-fallback.png" });
  await fallback.click();
  await expect(
    page.getByRole("navigation", { name: "Storage location" }),
  ).toContainText(tiny);
  await expect(
    page.getByRole("textbox", { name: "Friendly name" }),
  ).toHaveValue("Draft remains");
  await expect(page.locator("#selection-scope")).toContainText(
    "1 selected outside",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { mapRequests: string[] }).mapRequests,
    ),
  ).toEqual(["scan"]);
});

for (const [width, height, theme] of [
  [1024, 720, "light"],
  [1440, 900, "dark"],
  [1920, 1080, "system"],
] as const)
  test(`every category header supports real pointer and keyboard drill-down at ${width}`, async ({
    page,
  }) => {
    const snapshot = makeDemo(),
      template = snapshot.assets[0];
    const categories = [
      {
        kind: "container",
        name: "Workspace",
        title: "Writable layers",
        bytes: 20 * 1024 ** 3,
      },
      {
        kind: "image",
        name: "registry/team/image:v0",
        title: "Images · unique data",
        bytes: 12 * 1024 ** 3,
      },
      {
        kind: "volume",
        name: "Database storage",
        title: "Volumes",
        bytes: 8 * 1024 ** 3,
      },
      {
        kind: "shared",
        name: "Shared image data",
        title: "Shared image storage",
        bytes: 4 * 1024 ** 3,
      },
      { kind: "cache", name: "Tiny cache", title: "Build cache", bytes: 1 },
    ];
    snapshot.assets = categories.map((c, i) => ({
      ...template,
      key: `${c.kind}:fixture-${i}`,
      id: `fixture-${i}`,
      kind: c.kind,
      name: c.name,
      bytes: c.bytes,
      shared: 0,
      refs: [],
      mounts: [],
      state: c.kind === "container" ? "exited" : "unused",
      project: "/workspaces/category-fixture",
    }));
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(
      (theme) =>
        localStorage.setItem(
          "docker-cleanup.preferences",
          JSON.stringify({ theme }),
        ),
      theme,
    );
    await stubInventory(page, snapshot);
    await page
      .getByRole("checkbox", { name: "Select Workspace", exact: true })
      .check();
    await page.getByRole("button", { name: "Workspace", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Friendly name" })
      .fill("Category navigation draft");
    await page.getByRole("button", { name: "By project", exact: true }).click();
    const project = page.getByRole("button", {
      name: "Explore /workspaces/category-fixture",
      exact: true,
    });
    const projectHit = (await project.locator(".map-group-hit").boundingBox())!;
    await page.mouse.move(
      projectHit.x + projectHit.width - 3,
      projectHit.y + 3,
    );
    await expect(page.getByRole("tooltip")).toContainText(
      "/workspaces/category-fixture",
    );
    await project.focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("navigation", { name: "Storage location" }),
    ).toContainText("/workspaces/category-fixture");
    await page
      .getByRole("button", { name: "All storage", exact: true })
      .click();
    const map = page.getByRole("separator", {
      name: "Treemap height",
      exact: true,
    });
    await map.focus();
    await page.keyboard.press("Home");
    await expect
      .poll(() =>
        page
          .locator(".treemap")
          .evaluate((el) => (el as SVGSVGElement).viewBox.baseVal.height),
      )
      .toBe(40);
    for (const category of categories.slice(0, 4)) {
      await page
        .getByRole("button", { name: "All storage", exact: true })
        .click();
      const header = page.getByRole("button", {
        name: `Explore ${category.title}`,
        exact: true,
      });
      const r = (await header.locator(".map-group-hit").boundingBox())!;
      await page.mouse.click(
        r.x + Math.max(0.5, r.width - 3),
        r.y + Math.min(3, r.height / 2),
      );
      await expect(
        page.getByRole("navigation", { name: "Storage location" }),
      ).toContainText(category.title);
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await expect(page.locator("tbody")).toContainText(category.name);
      await expect(
        page.getByRole("textbox", { name: "Friendly name" }),
      ).toHaveValue("Category navigation draft");
    }
    await page
      .getByRole("button", { name: "All storage", exact: true })
      .click();
    for (const key of ["Enter", "Space"]) {
      await page
        .getByRole("button", { name: "Explore Volumes", exact: true })
        .focus();
      await page.keyboard.press(key);
      await expect(
        page.getByRole("navigation", { name: "Storage location" }),
      ).toContainText("Volumes");
      await page
        .getByRole("button", { name: "All storage", exact: true })
        .click();
    }
    // A normal leaf below the header still inspects the asset rather than drilling.
    await map.focus();
    await page.keyboard.press("End");
    const leaf = page.getByRole("button", {
      name: "Inspect Database storage",
      exact: false,
    });
    await leaf.click();
    await expect(page.locator(".inspector h2")).toHaveText("Database storage");
    await expect(
      page.getByRole("navigation", { name: "Storage location" }),
    ).not.toContainText("Volumes");
    await page.getByLabel("Browse all categories", { exact: true }).click();
    await page
      .getByRole("button", {
        name: "Explore category Build cache",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("navigation", { name: "Storage location" }),
    ).toContainText("Build cache");
    await expect(page.locator("#selection-scope")).toContainText(
      "1 selected outside",
    );
    expect(
      await page.evaluate(
        () => (window as unknown as { mapRequests: string[] }).mapRequests,
      ),
    ).toEqual(["scan"]);
    await page.screenshot({
      path: `artifacts/m3/category-pointer-${width}.png`,
    });
  });
