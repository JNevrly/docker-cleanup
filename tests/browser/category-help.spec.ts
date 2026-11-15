import { expect, test } from "@playwright/test";

test("all categories explain ownership, loss and accounting without a modal", async ({
  page,
}) => {
  await page.goto("/");
  const examples = [
    {
      name: /^Containers /,
      text: "separate from its image and mounted storage",
    },
    { name: /^Images /, text: "templates for containers" },
    { name: /^Volumes /, text: "Unreferenced does not mean disposable" },
    { name: /^Build cache /, text: "makes later builds slower" },
    { name: /^Shared layers /, text: "cannot be deleted independently" },
  ];
  for (const example of examples) {
    await page.getByRole("button", { name: example.name }).click();
    await page.locator(".category-help > summary").click();
    const help = page.getByRole("note", {
      name: "Storage category explanation",
    });
    await expect(help).toContainText(example.text);
    expect(
      await help.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(14);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByRole("note")).toContainText(
    "images that reference it",
  );
});

test("treemap category drill-down is keyboard accessible and shows the same help", async ({
  page,
}) => {
  await page.goto("/");
  const category = page.getByRole("button", {
    name: "Explore Volumes",
    exact: true,
  });
  await category.focus();
  await page.keyboard.press("Enter");
  await page.locator(".category-help > summary").click();
  await expect(
    page.getByRole("note", { name: "Storage category explanation" }),
  ).toContainText("databases");
  await expect(page.locator(".breadcrumbs")).toContainText("Volumes");
  await page.getByRole("button", { name: "All storage", exact: true }).click();
  await expect(
    page.getByRole("note", { name: "Storage category explanation" }),
  ).toHaveCount(0);
});
