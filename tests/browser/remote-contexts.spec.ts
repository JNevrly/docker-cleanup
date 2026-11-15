import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

test("explicit remote discovery, review identity and failed/same-daemon switch isolation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  const source = makeDemo();
  await page.addInitScript(
    ({ source }) => {
      let current = source;
      Object.assign(window, {
        remoteRequests: [],
        __TAURI_INTERNALS__: {
          transformCallback: () => 1,
          invoke: async (
            command: string,
            args: { request: Record<string, unknown> },
          ) => {
            if (command !== "dispatch") return 1;
            const r = args.request;
            (
              window as unknown as { remoteRequests: unknown[] }
            ).remoteRequests.push(r);
            if (r.type === "contexts")
              return [
                {
                  name: "lab",
                  endpoint: "context://lab",
                  target: "ssh://user@lab.example",
                },
                {
                  name: "other",
                  endpoint: "context://other",
                  target: "tcp://other.example:2376",
                },
              ];
            if (r.type === "scan") {
              if (r.endpoint === "context://unavailable")
                throw Error("Docker context connection failed");
              current = structuredClone(source);
              current.endpoint = String(r.endpoint);
              current.capabilities = {
                ...current.capabilities,
                location: "remote",
                target:
                  current.endpoint === "context://lab"
                    ? "ssh://user@lab.example"
                    : "tcp://other.example:2376",
              };
              current.capabilities.connection = JSON.stringify([
                current.endpoint,
                current.capabilities.target,
              ]);
              return current;
            }
            if (r.type === "plan")
              return {
                id: "remote-plan",
                snapshotId: current.id,
                daemonId: current.daemonId,
                endpoint: current.endpoint,
                target: current.capabilities.target,
                createdAt: current.capturedAt,
                actions: current.assets
                  .filter((a) => (r.keys as string[]).includes(a.key))
                  .map((a) => ({
                    ...a,
                    fingerprint: "fixture",
                    retainedMounts: a.mounts,
                  })),
                warnings: [],
                estimate: { reported: 100, lower: 100, upper: 100, notes: [] },
                newlyEligible: [],
                volumes: false,
                cacheScope: false,
              };
            throw Error("Unexpected operation " + r.type);
          },
        },
      });
    },
    { source },
  );
  await page.goto("/");
  await expect(
    page.getByRole("combobox", { name: "Docker context", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Contexts", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Docker context", exact: true })
    .selectOption("context://lab");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1024);
  await page
    .getByRole("button", { name: "Connect & scan", exact: true })
    .click();
  await expect(page.locator(".connection")).toContainText("REMOTE ENGINE");
  await expect(page.locator(".connection")).toContainText(
    "ssh://user@lab.example",
  );
  const asset = source.assets.find(
    (a) => a.kind === "container" && a.state === "exited",
  )!;
  await page
    .getByRole("checkbox", { name: `Select ${asset.name}`, exact: true })
    .check();
  await page
    .getByRole("button", { name: "Review cleanup →", exact: true })
    .click();
  const review = page.getByRole("region", {
    name: "Review cleanup plan",
    exact: true,
  });
  await expect(review).toContainText(
    "REMOTE CLEANUP: context://lab · ssh://user@lab.example",
  );
  await expect(
    review.getByRole("button", { name: "Delete reviewed assets", exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: "artifacts/remote-contexts/review.png" });
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.getByRole("button", { name: "Contexts", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Docker context", exact: true })
    .selectOption("context://other");
  await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: `Select ${asset.name}`, exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Cleanup review", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Docker connection changed. Selection/),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: `Select ${asset.name}`, exact: true })
    .check();
  await page
    .getByLabel("Docker context endpoint", { exact: true })
    .fill("context://unavailable");
  await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("connection failed");
  await expect(page.locator(".connection")).toContainText("NOT CONNECTED");
  await expect(
    page.getByRole("button", { name: "Review cleanup →", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { remoteRequests: { type: string }[] }
      ).remoteRequests.some((r) => r.type === "execute"),
    ),
  ).toBe(false);
});
