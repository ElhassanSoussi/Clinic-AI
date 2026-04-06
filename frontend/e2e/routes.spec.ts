import { test, expect } from "@playwright/test";

test.describe("Public routes return 200", () => {
  const publicRoutes = [
    { path: "/", name: "Landing" },
    { path: "/login", name: "Login" },
    { path: "/register", name: "Register" },
    { path: "/onboarding", name: "Onboarding" },
    { path: "/chat/test-clinic", name: "Chat (dynamic slug)" },
    { path: "/privacy", name: "Privacy" },
    { path: "/terms", name: "Terms" },
    { path: "/contact", name: "Contact" },
    { path: "/auth/complete", name: "OAuth complete" },
  ];

  for (const { path, name } of publicRoutes) {
    test(`${name} (${path}) returns 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe("Static assets", () => {
  test("widget.js loads", async ({ page }) => {
    const response = await page.goto("/widget.js");
    expect(response?.status()).toBe(200);
  });

  test("test-embed.html loads", async ({ page }) => {
    const response = await page.goto("/test-embed.html");
    expect(response?.status()).toBe(200);
  });
});

test.describe("404 handling", () => {
  test("unknown route returns 404 page", async ({ page }) => {
    const response = await page.goto("/this-definitely-does-not-exist");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Chat widget page", () => {
  test("renders chat interface for arbitrary slug", async ({ page }) => {
    await page.goto("/chat/demo");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/chat/demo");
  });
});
