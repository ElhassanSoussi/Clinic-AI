import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { getE2eCredentials } from "./credentials";

/**
 * Real login against the running dev server (see `frontend/.env` for `NEXT_PUBLIC_API_URL`).
 * Call only when `hasE2eCredentials()` is true (or after `test.skip`); otherwise `getE2eCredentials` throws.
 */
export async function loginAsE2EUser(
  page: Page,
  creds?: { email: string; password: string },
): Promise<void> {
  const { email, password } = creds ?? getE2eCredentials();

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /log in to your account/i })).toBeVisible();
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
