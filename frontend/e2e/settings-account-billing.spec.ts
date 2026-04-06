import { test, expect } from "@playwright/test";
import { seedAuth } from "./helpers/seed-auth";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("settings page renders", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });
});

test.describe("Account page", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("account page renders profile section", async ({ page }) => {
    await page.goto("/dashboard/account");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/profile/i).first()).toBeVisible();
  });

  test("account page renders password section", async ({ page }) => {
    await page.goto("/dashboard/account");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/change password/i).first()).toBeVisible();
  });
});

test.describe("Billing page", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("billing page renders", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });
});
