import { test, expect } from "@playwright/test";
import { seedAuth } from "./helpers/seed-auth";

test.describe("Dashboard structure (seeded auth)", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("dashboard page loads without crash", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|onboarding)/);
  });

  test("sidebar renders all navigation links", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

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
      { href: "/dashboard/billing", label: "Billing" },
      { href: "/dashboard/settings", label: "Settings" },
    ];

    for (const { href, label } of navLinks) {
      const link = aside.getByRole("link", { name: label });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
    }
  });

  test("all dashboard sub-pages render without crash", async ({ page }) => {
    test.setTimeout(90_000);

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
      // Dev server can abort navigations when previous page resources are still
      // loading (HMR chunks, etc). Retry once on ERR_ABORTED.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await page.goto(route, { waitUntil: "domcontentloaded", timeout: 15000 });
          break;
        } catch (err: unknown) {
          const isAborted = err instanceof Error && err.message.includes("ERR_ABORTED");
          if (!isAborted || attempt === 1) throw err;
        }
      }
      await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
      await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    }
  });
});
