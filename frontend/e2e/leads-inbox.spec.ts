import { test, expect } from "@playwright/test";
import { seedAuth } from "./helpers/seed-auth";

test.describe("Leads page", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("leads page renders with page header", async ({ page }) => {
    await page.goto("/dashboard/leads");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    const heading = page.getByRole("heading", { name: /leads|booking pipeline/i }).first();
    await expect(heading).toBeVisible();
  });

  test("leads page has request status cards", async ({ page }) => {
    await page.goto("/dashboard/leads");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("All requests").first()).toBeVisible();
    await expect(page.getByText("New").first()).toBeVisible();
  });
});

test.describe("Inbox page", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("inbox page renders", async ({ page }) => {
    await page.goto("/dashboard/inbox");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    const heading = page.getByRole("heading", { name: /inbox/i }).first();
    await expect(heading).toBeVisible();
  });

  test("inbox has conversation status cards", async ({ page }) => {
    await page.goto("/dashboard/inbox");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Open").first()).toBeVisible();
    await expect(page.getByText("Follow-up").first()).toBeVisible();
  });
});
