import { test, expect } from "@playwright/test";

test.describe("Auth pages render", () => {
  test("login page renders form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /start free trial/i })).toHaveAttribute("href", /\/register/);
  });

  test("login page has back link to home", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /back/i })).toHaveAttribute("href", "/");
  });

  test("register page renders form fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("#full_name")).toBeVisible();
    await expect(page.locator("#clinic_name")).toBeVisible();
    await expect(page.locator("#reg_email")).toBeVisible();
    await expect(page.locator("#reg_password")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("register with plan query shows checkout label", async ({ page }) => {
    await page.goto("/register?plan=professional");
    await expect(page.getByRole("button", { name: /continue to checkout/i })).toBeVisible();
  });

  test("login shows error on empty submit", async ({ page }) => {
    await page.goto("/login");
    // HTML5 validation prevents submit, so fill email only
    await page.locator("#email").fill("test@example.com");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Password field should show HTML5 required tooltip — page stays on /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("register shows error on short password", async ({ page }) => {
    await page.goto("/register");
    await page.locator("#full_name").fill("Test User");
    await page.locator("#clinic_name").fill("Test Clinic");
    await page.locator("#reg_email").fill("test@example.com");
    await page.locator("#reg_password").fill("12345");
    await page.getByRole("button", { name: /create account/i }).click();
    // minLength=6 validation keeps page on /register
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Auth redirect", () => {
  test("dashboard redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    // Client-side auth check — redirects to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
