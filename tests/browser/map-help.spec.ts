import { expect, test } from "@playwright/test";
test("map has no persistent instructions and legends follow rendered categories", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Tile area = attributed bytes", { exact: false }),
  ).toHaveCount(0);
  await expect(page.locator(".map-note,.map-hint")).toHaveCount(0);
  await expect(page.locator(".legend")).toBeVisible();
  await expect(page.locator(".legend")).not.toContainText("Build cache");
  await page.getByRole("button", { name: /^Images / }).click();
  await expect(page.locator(".legend")).toHaveCount(0);
  await page.getByRole("button", { name: "All storage", exact: true }).click();
  await page.getByRole("button", { name: "By project", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore robotics-workspace", exact: true })
    .click();
  await expect(page.locator(".legend")).toContainText("Writable layers");
  await expect(page.locator(".legend")).toContainText("Images");
  await expect(page.locator(".legend")).not.toContainText("Volumes");
  await page
    .getByRole("textbox", { name: "Search assets" })
    .fill("no-assets-match");
  await expect(page.locator(".legend")).toHaveCount(0);
  await expect(
    page.getByText("No measured storage in this view.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All storage", exact: true }).click();
  await page.getByRole("textbox", { name: "Search assets" }).fill("legacy-dev");
  await expect(
    page.getByRole("row").filter({ hasText: "legacy-dev:old" }),
  ).toContainText("Unknown");
  await expect(page.locator(".legend")).toHaveCount(0);
});
