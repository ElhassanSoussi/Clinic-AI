import { test, expect } from "@playwright/test";

const deployedBase = Boolean(process.env.PLAYWRIGHT_BASE_URL?.trim());

/**
 * Run against a real deployed frontend (no local dev server):
 *   PLAYWRIGHT_BASE_URL=https://your-domain.com pnpm exec playwright test e2e/deployed-smoke.spec.ts
 */
test.describe("deployed frontend smoke", () => {
  test.skip(!deployedBase, "Set PLAYWRIGHT_BASE_URL to a live origin (e.g. https://clinicaireply.com)");

  test("landing and login page render", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /log in to your account/i })).toBeVisible({ timeout: 20_000 });
  });

  test("public chat route accepts slug query", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: /patient chat/i })).toBeVisible({ timeout: 15_000 });
  });
});
