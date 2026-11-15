import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

test("inspection is on-demand; keyboard related links and Back preserve selection and views", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
    .check();
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  const inspector = page.locator(".inspector");
  await inspector.getByRole("button", { name: "Files", exact: true }).click();
  await expect(inspector).toContainText("Not collected yet");
  await inspector
    .getByRole("button", { name: "Load inspection", exact: true })
    .click();
  await expect(
    inspector.getByRole("cell", { name: "/root/.cache", exact: true }),
  ).toBeVisible();
  await expect(inspector).toContainText("Container writable layer");
  await inspector
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  const link = inspector.getByRole("link", { name: /ros:humble ↗/ });
  await expect(link).toContainText("image");
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(inspector.locator("h2")).toHaveText("ros:humble");
  await inspector
    .getByRole("button", { name: "← Back to previous asset", exact: true })
    .click();
  await expect(inspector.locator("h2")).toHaveText("objective_bartik");
  await inspector.getByRole("button", { name: "Files", exact: true }).click();
  await expect(
    inspector.getByRole("cell", { name: "/root/.cache", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", {
      name: "Select objective_bartik",
      exact: true,
    }),
  ).toBeChecked();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/inspector-files.png" });
});

test("structured process evidence, permission errors and daemon isolation", async ({
  page,
}) => {
  const snapshot = makeDemo();
  await page.addInitScript(
    ({ snapshot }) => {
      const state = { calls: [] as string[], daemon: "first" };
      Object.assign(window, {
        inspectionTest: state,
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request?: { type: string } },
          ) => {
            if (command !== "dispatch") return 1;
            const type = args.request!.type;
            state.calls.push(type);
            if (type === "scan") return { ...snapshot, daemonId: state.daemon };
            if (type === "diff")
              throw Error("Permission denied: filesystem changes unavailable.");
            if (type === "processes")
              return {
                observedAt: "2026-11-15",
                container: {
                  Titles: ["PID", "COMMAND"],
                  Processes: [["42", "python3"]],
                },
                host: [
                  {
                    pid: 73,
                    program: "editor",
                    evidence: ["Same working directory"],
                  },
                ],
                notes: ["Host namespaces restrict correlation."],
              };
            throw Error(`Unexpected mutation ${type}`);
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
  const inspector = page.locator(".inspector");
  await inspector.getByRole("button", { name: "Files", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { inspectionTest: { calls: string[] } })
          .inspectionTest.calls,
    ),
  ).toEqual(["scan"]);
  await inspector
    .getByRole("button", { name: "Load inspection", exact: true })
    .click();
  await expect(inspector.getByRole("alert")).toContainText("Permission denied");
  await inspector
    .getByRole("button", { name: "Processes", exact: true })
    .click();
  await inspector
    .getByRole("button", { name: "Load inspection", exact: true })
    .click();
  await expect(
    inspector.getByRole("cell", { name: "python3", exact: true }),
  ).toBeVisible();
  await expect(inspector).toContainText("PID 73");
  await expect(inspector).toContainText("Same working directory");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => {
    (
      window as unknown as { inspectionTest: { daemon: string } }
    ).inspectionTest.daemon = "second";
  });
  await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  await inspector
    .getByRole("button", { name: "Processes", exact: true })
    .click();
  await expect(inspector).toContainText("Not collected yet");
});
