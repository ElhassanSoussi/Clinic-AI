import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with headline and CTAs", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /start free/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /try live demo/i }).first()).toBeVisible();
  });

  test("sticky nav contains all section anchors", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.getByRole("link", { name: "Product" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Trust" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "FAQ" })).toBeVisible();
  });

  test("nav sign-in link goes to /login", async ({ page }) => {
    const signIn = page.locator("nav").getByRole("link", { name: "Sign in" });
    await expect(signIn).toHaveAttribute("href", "/login");
  });

  test("nav start-free link goes to /register", async ({ page }) => {
    const cta = page.locator("nav").getByRole("link", { name: /start free/i });
    await expect(cta).toHaveAttribute("href", "/register");
  });

  test("pricing section displays plans", async ({ page }) => {
    const pricing = page.locator("#pricing");
    await expect(pricing).toBeVisible();
    await expect(page.getByText(/Starter Trial/i).first()).toBeVisible();
  });

  test("FAQ section is present", async ({ page }) => {
    const faq = page.locator("#faq");
    await expect(faq).toBeVisible();
  });

  test("footer renders with links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(footer.getByRole("link", { name: /start free/i }).first()).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Privacy", exact: true }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Terms", exact: true }),
    ).toBeVisible();
  });

  test("page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });
});
