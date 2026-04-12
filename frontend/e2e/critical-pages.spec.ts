import { test, expect } from "@playwright/test";
import { E2E_AUTH_SKIP_REASON, hasE2eCredentials } from "./helpers/credentials";
import { loginAsE2EUser } from "./helpers/login";

/** Marketing + auth entry routes — must render primary heading. */
const PUBLIC_CRITICAL: { path: string; heading: RegExp }[] = [
  { path: "/", heading: /front desk operating system for modern clinics/i },
  { path: "/product", heading: /front desk os for modern clinics/i },
  { path: "/pricing", heading: /simple, transparent pricing/i },
  { path: "/trust", heading: /built for trust/i },
  { path: "/faq", heading: /frequently asked questions/i },
  { path: "/privacy", heading: /privacy policy/i },
  { path: "/terms", heading: /terms of service/i },
  { path: "/contact", heading: /get in touch/i },
  { path: "/login", heading: /log in to your account/i },
  { path: "/register", heading: /create your account/i },
  { path: "/chat", heading: /patient chat/i },
];

/**
 * Authenticated area paths (detail routes use a placeholder UUID for “page loads” coverage).
 * Keep in sync with `src/app/routes.tsx`.
 */
const APP_CRITICAL_PATHS = [
  "/app",
  "/app/dashboard",
  "/app/onboarding",
  "/app/inbox",
  "/app/inbox/00000000-0000-0000-0000-000000000001",
  "/app/leads",
  "/app/leads/00000000-0000-0000-0000-000000000001",
  "/app/appointments",
  "/app/customers",
  "/app/customers/00000000-0000-0000-0000-000000000001",
  "/app/opportunities",
  "/app/operations",
  "/app/activity",
  "/app/ai-training",
  "/app/billing",
  "/app/settings",
  "/app/account",
] as const;

test.describe("e2e-critical: public pages", () => {
  for (const { path, heading } of PUBLIC_CRITICAL) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 20_000 });
    });
  }
});

test.describe("e2e-critical: app routes require login", () => {
  for (const path of APP_CRITICAL_PATHS) {
    test(`unauthenticated ${path} redirects to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    });
  }

  test("unauthenticated /app/settings sends ?from= for post-login return", async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/\/login\?from=%2Fapp%2Fsettings/, { timeout: 20_000 });
  });
});

test.describe("e2e-critical: app routes with session", () => {
  test("all app paths render main shell after login", async ({ page }) => {
    test.skip(!hasE2eCredentials(), E2E_AUTH_SKIP_REASON);

    await loginAsE2EUser(page);

    for (const path of APP_CRITICAL_PATHS) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
      await expect(page.locator("main")).toBeVisible({ timeout: 25_000 });
    }
  });
});
