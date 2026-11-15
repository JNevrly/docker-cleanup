import { expect, test } from "@playwright/test";

test("investigate, select, review, simulate deletion and review unlocked images", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("SYNTHETIC DATA", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Storage boundaries" }),
  ).toBeVisible();
  await expect(page.getByText("External bind mount · retained")).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect filesystem changes", exact: true })
    .click();
  await expect(page.locator(".inspection-details")).toContainText(
    "not size measurements",
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Select jolly_poitras", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "Select api-dev", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "Select vscode", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Review cleanup →", exact: true })
    .click();
  const review = page.getByRole("region", { name: "Review cleanup plan" });
  await expect(review).toContainText("not selected automatically");
  await expect(
    review.getByRole("button", { name: "Simulate cleanup" }),
  ).toBeDisabled();
  await review
    .getByRole("checkbox", {
      name: "I understand this changes synthetic demonstration data only.",
    })
    .check();
  await review.getByRole("button", { name: "Simulate cleanup" }).click();
  await expect(
    page.getByRole("region", { name: "Cleanup result", exact: true }),
  ).toContainText("simulated");
  await page
    .getByRole("button", { name: "Review newly eligible images →" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Select ros:humble", exact: true }),
  ).toBeChecked();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/journey-after.png",
    fullPage: true,
  });
});

test("volume cleanup requires a separate data-loss confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("checkbox", {
      name: "Select supabase_db_xc_scanner",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Review cleanup →", exact: true })
    .click();
  const review = page.getByRole("region", { name: "Review cleanup plan" });
  await review
    .getByRole("checkbox", {
      name: "I understand this changes synthetic demonstration data only.",
    })
    .check();
  await expect(
    review.getByRole("button", { name: "Simulate cleanup" }),
  ).toBeDisabled();
  await review
    .getByRole("checkbox", { name: /I explicitly authorize loss/ })
    .check();
  await expect(
    review.getByRole("button", { name: "Simulate cleanup" }),
  ).toBeEnabled();
});

test("project treemap, filters, unknown sizes and pruning previews remain inspectable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "By project", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Inspect vscode/ }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search assets" }).fill("legacy-dev");
  await expect(
    page.getByRole("row").filter({ hasText: "legacy-dev:old" }),
  ).toContainText("Unknown");
  await page.getByRole("textbox", { name: "Search assets" }).clear();
  await page.getByRole("button", { name: /Prune resources/ }).click();
  await page
    .getByRole("button", { name: "Preview prune plan", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Review cleanup plan" }),
  ).toContainText("<dangling>");
});

test("inspector identity, protection and relationship navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  const inspector = page.locator(".inspector");
  await expect(inspector).toContainText("last start");
  await inspector
    .getByRole("textbox", { name: "Friendly name" })
    .fill("Robotics development");
  await inspector
    .getByRole("textbox", { name: "Project / shared / unattributed" })
    .fill("My robotics project");
  await inspector
    .getByRole("button", { name: "Save identity", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Robotics development", exact: true }),
  ).toBeVisible();
  await inspector.getByRole("link", { name: /ros:humble ↗/ }).click();
  await expect(
    inspector.getByRole("heading", { name: "ros:humble", exact: true }),
  ).toBeVisible();
  await inspector.getByRole("link", { name: /objective_bartik ↗/ }).click();
  await page
    .getByRole("button", { name: "Protect objective_bartik", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Select Robotics development",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Select eligible in view", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Select Robotics development",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Select vscode", exact: true }),
  ).not.toBeChecked();
});
