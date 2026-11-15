import { expect, test } from "@playwright/test";
test("home resets exploration, not selection/drafts/layout; Back still restores context", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "objective_bartik", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Friendly name" })
    .fill("Unsaved draft");
  await page
    .getByRole("checkbox", { name: "Select objective_bartik", exact: true })
    .check();
  await page.getByRole("button", { name: "By project", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore robotics-workspace", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Search assets" }).fill("objective");
  await page
    .getByRole("combobox", { name: "Container state" })
    .selectOption("stopped");
  await page
    .getByRole("spinbutton", { name: "Minimum age in days" })
    .fill("10");
  await page
    .getByRole("button", { name: "Review cleanup →", exact: true })
    .click();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Search assets" }),
  ).toHaveValue("objective");
  await expect(
    page.getByRole("navigation", { name: "Storage location" }),
  ).toContainText("robotics-workspace");
  await page.getByRole("button", { name: /Storage explorer/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Search assets" }),
  ).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Container state" }),
  ).toHaveValue("all");
  await expect(
    page.getByRole("spinbutton", { name: "Minimum age in days" }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "By category", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("checkbox", {
      name: "Select objective_bartik",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("textbox", { name: "Friendly name" }),
  ).toHaveValue("Unsaved draft");
  await page.getByRole("button", { name: /^Images / }).click();
  await expect(
    page.getByRole("navigation", { name: "Storage location" }),
  ).toContainText("Images");
  const root = page.getByRole("button", { name: "All storage", exact: true });
  await root.focus();
  await page.keyboard.press("Enter");
  await expect(root).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: /Cleanup history/ }).click();
  await page.getByRole("button", { name: /Storage explorer/ }).click();
  await expect(root).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("textbox", { name: "Friendly name" }),
  ).toHaveValue("Unsaved draft");
});
