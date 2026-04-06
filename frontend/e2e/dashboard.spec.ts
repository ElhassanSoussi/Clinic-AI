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

/**
 * Seed localStorage and intercept backend API calls so the 401
 * interceptor in api.ts doesn't redirect us back to /login.
 */
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
    // Clinic endpoint — return a fully-configured clinic to pass setup checks
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
    // Return arrays for endpoints that expect them
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
    // Analytics — dashboard page accesses many numeric fields directly
    if (url.includes("/frontdesk/analytics")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          conversations_total: 0,
          leads_created: 0,
          booked_requests: 0,
          unresolved_count: 0,
          follow_up_needed_count: 0,
          potential_lost_patients: 0,
          recovered_opportunities: 0,
          estimated_value_recovered_cents: 0,
          estimated_value_recovered_label: "$0",
          lead_capture_rate: 0,
          ai_resolution_estimate: 0,
          ai_resolution_estimate_label: "0%",
          ai_auto_handled_count: 0,
          human_review_required_count: 0,
          manual_takeover_threads: 0,
          suggested_replies_sent_count: 0,
          blocked_for_review_count: 0,
          deposit_requested_count: 0,
          deposit_paid_count: 0,
          deposit_waiting_count: 0,
          busiest_contact_hours: [],
        }),
      });
    }
    // Activity feed
    if (url.includes("/activity")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    // Operations, opportunities, appointments, follow-ups, customers, training, knowledge
    if (
      url.includes("/frontdesk/operations") ||
      url.includes("/frontdesk/opportunities") ||
      url.includes("/frontdesk/follow-ups") ||
      url.includes("/frontdesk/appointments") ||
      url.includes("/frontdesk/customers") ||
      url.includes("/frontdesk/reminders") ||
      url.includes("/frontdesk/channels") ||
      url.includes("/frontdesk/communications")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    if (url.includes("/frontdesk/training")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          assistant_name: "AI Assistant",
          knowledge_score: 0,
          knowledge_status: "needs_work",
          readiness_items: [],
          knowledge_gaps: [],
          custom_sources: [],
        }),
      });
    }
    // Default fallback — safe empty object
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

test.describe("Dashboard structure (seeded auth)", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("dashboard page loads without crash", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|onboarding)/);
  });

  test("sidebar renders all navigation links", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for main dashboard layout to stabilize
    await page.waitForLoadState("networkidle");

    // Wait for the sidebar <aside> with nav links inside
    const aside = page.locator("aside").filter({ has: page.locator("nav") }).first();
    await aside.waitFor({ state: "visible", timeout: 15000 });

    const navLinks = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/inbox", label: "Inbox" },
      { href: "/dashboard/leads", label: "Leads" },
      { href: "/dashboard/appointments", label: "Appointments" },
      { href: "/dashboard/customers", label: "Customers" },
      { href: "/dashboard/opportunities", label: "Opportunities" },
      { href: "/dashboard/operations", label: "Operations" },
      { href: "/dashboard/activity", label: "Activity" },
      { href: "/dashboard/training", label: /ai training/i },
    ];

    for (const { href, label } of navLinks) {
      const link = aside.getByRole("link", { name: label });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
    }
  });

  test("all dashboard sub-pages render without crash", async ({ page }) => {
    const routes = [
      "/dashboard",
      "/dashboard/inbox",
      "/dashboard/leads",
      "/dashboard/appointments",
      "/dashboard/customers",
      "/dashboard/opportunities",
      "/dashboard/operations",
      "/dashboard/activity",
      "/dashboard/training",
      "/dashboard/settings",
      "/dashboard/account",
      "/dashboard/billing",
    ];

    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });

      if (response) {
        expect(response.status()).toBeLessThan(500);
      }

      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
