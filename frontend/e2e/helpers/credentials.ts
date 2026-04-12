/**
 * Authenticated E2E uses real `/auth/login` against `VITE_PUBLIC_API_URL` / default API.
 * Set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` in `frontend/.env.e2e` (see `e2e/env.example`).
 * Tests do not skip when these are missing — they fail with a clear error so CI/local always exercises the full suite.
 */
export function getE2eCredentials(): { email: string; password: string } {
  const email = process.env.E2E_USER_EMAIL?.trim() ?? "";
  const password = process.env.E2E_USER_PASSWORD?.trim() ?? "";
  if (!email || !password) {
    throw new Error(
      "Authenticated E2E requires E2E_USER_EMAIL and E2E_USER_PASSWORD. Copy frontend/e2e/env.example to frontend/.env.e2e and set both values. Create a user with backend/create_test_user.py if needed.",
    );
  }
  return { email, password };
}
