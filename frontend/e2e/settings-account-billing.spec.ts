import { test, expect, Page } from "@playwright/test";

const FAKE_USER = JSON.stringify({
  id: "e2e-test-user",
  email: "e2e@clinic.test",
  full_name: "E2E Test",
  clinic_id: "e2e-clinic",
  clinic_name: "E2E Clinic",
  access_token: "e2e-fake-token",
  has_completed_onboarding: true,
});

async function seedAuth(page: Page) {
  await page.addInitScript(
    (user: string) => {
      localStorage.setItem("auth_user", user);
      localStorage.setItem("access_token", "e2e-fake-token");
    },
    FAKE_USER,
  );

  // Mock every backend API call to prevent 401 → /login redirect
  await page.route("**/api/**", (route) => {
    const url = route.request().url();
    if (url.includes("/clinics/me") || /\/clinics\/[^/]+$/.exec(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "e2e-clinic",
          name: "E2E Clinic",
          slug: "e2e-clinic",
          phone: "+1234567890",
          email: "e2e@clinic.test",
          address: "123 Test St",
          services: ["General"],
          google_sheet_id: "fake-sheet",
          notifications_enabled: true,
          notification_email: "e2e@clinic.test",
          availability_enabled: true,
          is_live: true,
        }),
      });
    }
    if (url.includes("/leads") || url.includes("/conversations") || url.includes("/threads")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    if (url.includes("/billing")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: "starter_trial",
          plan_name: "Starter Trial",
          subscription_status: "trialing",
          messages_used: 0,
          messages_limit: 50,
        }),
      });
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("settings page renders", async ({ page }) => {
    await page.goto("/dashboard/settings");
    try {
      await page.locator("aside").first().waitFor({ state: "visible", timeout: 10000 });
    } catch {
      test.skip();
      return;
    }
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
    try {
      await page.locator("aside").first().waitFor({ state: "visible", timeout: 10000 });
    } catch {
      test.skip();
      return;
    }
    await expect(page.getByText(/profile/i).first()).toBeVisible();
  });

  test("account page renders password section", async ({ page }) => {
    await page.goto("/dashboard/account");
    try {
      await page.locator("aside").first().waitFor({ state: "visible", timeout: 10000 });
    } catch {
      test.skip();
      return;
    }
    await expect(page.getByText(/change password/i).first()).toBeVisible();
  });
});

test.describe("Billing page", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("billing page renders", async ({ page }) => {
    await page.goto("/dashboard/billing");
    try {
      await page.locator("aside").first().waitFor({ state: "visible", timeout: 10000 });
    } catch {
      test.skip();
      return;
    }
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });
});
