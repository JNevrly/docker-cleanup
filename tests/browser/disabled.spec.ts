import { expect, test } from "@playwright/test";
import { makeDemo } from "../../src/demo";

for (const theme of ["light", "dark"])
  test(`conventional disabled controls remain inert in ${theme}`, async ({
    page,
  }) => {
    const snapshot = makeDemo();
    await page.addInitScript(
      ({ snapshot, theme }) => {
        localStorage.setItem(
          "docker-cleanup.preferences",
          JSON.stringify({ theme }),
        );
        Object.assign(window, {
          disabledTest: { executes: 0, finish: () => {} },
          __TAURI_INTERNALS__: {
            transformCallback: () => 1,
            invoke: async (
              command: string,
              args: { request?: { type: string } },
            ) => {
              if (command !== "dispatch") return 1;
              const state = (
                window as unknown as {
                  disabledTest: { executes: number; finish: () => void };
                }
              ).disabledTest;
              if (args.request?.type === "scan") {
                await new Promise<void>((r) => {
                  state.finish = r;
                });
                return snapshot;
              }
              if (args.request?.type === "plan")
                return {
                  id: "disabled-plan",
                  snapshotId: snapshot.id,
                  daemonId: snapshot.daemonId,
                  createdAt: snapshot.capturedAt,
                  actions: [
                    {
                      ...snapshot.assets[0],
                      retainedMounts: [],
                      fingerprint: "",
                    },
                  ],
                  warnings: [],
                  estimate: { reported: 0, lower: 0, upper: null, notes: [] },
                  newlyEligible: [],
                  volumes: false,
                  cacheScope: false,
                };
              if (args.request?.type === "execute") state.executes++;
            },
          },
        });
      },
      { snapshot, theme },
    );
    await page.goto("/");
    const review = page.getByRole("button", {
      name: "Review cleanup →",
      exact: true,
    });
    await expect(review).toBeDisabled();
    await page.getByRole("button", { name: "Connect & scan" }).click();
    const connect = page.getByRole("button", {
      name: "Connect & scan",
      exact: true,
    });
    await expect(connect).toBeDisabled();
    for (const button of [connect, review]) {
      await expect(button).toHaveCSS("text-decoration-line", "none");
      await expect(button).toHaveCSS("border-top-style", "solid");
      await button.dispatchEvent("click");
    }
    await page.evaluate(() =>
      (
        window as unknown as { disabledTest: { finish: () => void } }
      ).disabledTest.finish(),
    );
    await page
      .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
      .check();
    await review.click();
    const destructive = page.getByRole("button", {
      name: "Delete reviewed assets",
      exact: true,
    });
    await expect(destructive).toBeDisabled();
    await expect(destructive).toHaveCSS("text-decoration-line", "none");
    await expect(destructive).toHaveCSS("border-top-style", "solid");
    await destructive.dispatchEvent("click");
    await page.keyboard.press("Enter");
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { disabledTest: { executes: number } })
            .disabledTest.executes,
      ),
    ).toBe(0);
    await page.screenshot({ path: `artifacts/m2/disabled-${theme}.png` });
    await page.getByRole("button", { name: "← Back", exact: true }).click();
    await page.getByRole("button", { name: /^Shared layers / }).click();
    await expect(
      page.getByRole("button", {
        name: "Select eligible in view",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(page.locator("#selection-scope")).toContainText(
      "No individually eligible",
    );
  });
