import { test, expect } from "@playwright/test";
import { E2E_AUTH_SKIP_REASON, hasE2eCredentials } from "./helpers/credentials";
import { loginAsE2EUser } from "./helpers/login";

test.describe("authenticated user journey", () => {
  test("logs in, covers onboarding, settings, billing, leads, inbox, account, logs out", async ({ page }) => {
    test.skip(!hasE2eCredentials(), E2E_AUTH_SKIP_REASON);

    await test.step("Login via real /login form", async () => {
      await loginAsE2EUser(page);
    });

    await test.step("Onboarding shell loads (may already be completed for user)", async () => {
      await page.goto("/app/onboarding");
      await expect(page.getByRole("heading", { name: /let's get you set up/i })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/clinic profile|hours|review & go live/i).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Settings round-trip save", async () => {
      await page.goto("/app/settings");
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 30_000 });
      const clinicNameInput = page.getByTestId("settings-clinic-name");
      await expect(clinicNameInput).toBeVisible({ timeout: 15_000 });
      const clinicNameBefore = await clinicNameInput.inputValue();
      const clinicMarked = clinicNameBefore.endsWith(" E2E") ? clinicNameBefore : `${clinicNameBefore} E2E`;
      await clinicNameInput.fill(clinicMarked);
      await page.getByTestId("settings-save-changes").first().click();
      await expect(page.getByText("Settings saved").first()).toBeVisible({ timeout: 20_000 });
      await clinicNameInput.fill(clinicNameBefore);
      await page.getByTestId("settings-save-changes").first().click();
      await expect(page.getByText("Settings saved").first()).toBeVisible({ timeout: 20_000 });
    });

    await test.step("Billing page", async () => {
      await page.goto("/app/billing");
      await expect(page.getByRole("heading", { name: /billing/i })).toBeVisible({ timeout: 30_000 });
    });

    await test.step("Leads list or detail / error path", async () => {
      await page.goto("/app/leads");
      await expect(page.getByRole("heading", { name: /leads/i })).toBeVisible({ timeout: 30_000 });

      const leadLink = page.locator('a[href^="/app/leads/"]').first();
      if ((await leadLink.count()) > 0) {
        await leadLink.click();
        await expect(page).toHaveURL(/\/app\/leads\/[^/]+/);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
      } else {
        await page.goto("/app/leads/00000000-0000-0000-0000-000000000001");
        await expect(page.getByText(/lead not found|^not found|failed|error/i).first()).toBeVisible({
          timeout: 20_000,
        });
      }
    });

    await test.step("Inbox list or thread / error path", async () => {
      await page.goto("/app/inbox");
      await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible({ timeout: 30_000 });

      const threadLink = page.locator('a[href^="/app/inbox/"]').first();
      if ((await threadLink.count()) > 0) {
        await threadLink.click();
        await expect(page).toHaveURL(/\/app\/inbox\/[^/]+/);
        await expect(page.getByText(/back to inbox/i)).toBeVisible({ timeout: 15_000 });
      } else {
        await page.goto("/app/inbox/00000000-0000-0000-0000-000000000001");
        await expect(page.getByText(/conversation not found|^not found|failed|error/i).first()).toBeVisible({
          timeout: 20_000,
        });
      }
    });

    await test.step("Account profile round-trip", async () => {
      await page.goto("/app/account");
      await expect(page.getByRole("heading", { name: "Account" })).toBeVisible({ timeout: 30_000 });

      const nameInput = page.getByTestId("account-full-name");
      const original = await nameInput.inputValue();
      const marker = " (e2e)";
      const withMarker = original.endsWith(marker) ? original : `${original}${marker}`;
      await nameInput.fill(withMarker);
      await page.getByTestId("account-save-profile").click();
      await expect(page.getByText("Profile updated").first()).toBeVisible({ timeout: 15_000 });

      await nameInput.fill(original);
      await page.getByTestId("account-save-profile").click();
      await expect(page.getByText("Profile updated").first()).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Logout", async () => {
      await page.getByTestId("app-logout").click();
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  });
});
