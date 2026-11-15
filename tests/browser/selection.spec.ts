import { expect, test } from "@playwright/test";

test("header selection is tri-state and deselection preserves assets outside the filtered view", async ({
  page,
}) => {
  await page.goto("/");
  const all = page.getByRole("checkbox", {
    name: "Select all eligible assets in this view",
    exact: true,
  });
  await expect(all).not.toBeChecked();
  await page
    .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
    .check();
  await expect(all).toBeChecked({ indeterminate: true });
  await all.check();
  await expect(all).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Select api-dev", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Select vscode", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("textbox", { name: "Search assets" }).fill("objective");
  await expect(page.locator("#selection-scope")).toContainText(
    "1 eligible in view · 1 selected in view",
  );
  await all.uncheck();
  await expect(
    page.getByRole("checkbox", {
      name: "Select objective_bartik",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(page.locator("#selection-scope")).toContainText(
    "10 selected outside",
  );
  await page.getByRole("textbox", { name: "Search assets" }).clear();
  await expect(
    page.getByRole("checkbox", { name: "Select jolly_poitras", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect(all).not.toBeChecked();
});

test("empty and accounting-only views disable bulk actions with readable reasons", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Shared layers / }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "Select all eligible assets in this view",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Select eligible in view", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".eligibility-reason")).toContainText(
    "cannot delete independently",
  );
  await expect(page.locator("#selection-scope")).toContainText(
    "No individually eligible assets",
  );
  await page.getByRole("button", { name: /^Build cache / }).click();
  await expect(page.locator("#selection-scope")).toContainText(
    "Clear Engine build cache",
  );
});
