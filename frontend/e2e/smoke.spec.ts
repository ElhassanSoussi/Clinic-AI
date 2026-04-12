import { test, expect } from "@playwright/test";

test.describe("public smoke", () => {
  test("landing loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in|log in/i })).toBeVisible();
  });

  test("patient chat page loads", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.locator("body")).toBeVisible();
  });
});
