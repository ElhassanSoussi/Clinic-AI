/**
 * Authenticated E2E exercises the real `/login` flow; the browser calls the API from
 * `NEXT_PUBLIC_API_URL` / `VITE_PUBLIC_API_URL` (see `src/lib/env.ts` and `frontend/.env`).
 *
 * Set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` in `frontend/.env.e2e` (see `.env.e2e.example`).
 * When unset, auth-dependent tests use `test.skip` so the default `pnpm run e2e` stays green.
 */
export const E2E_AUTH_SKIP_REASON =
  "SKIP (auth E2E): Missing E2E_USER_EMAIL / E2E_USER_PASSWORD. Copy frontend/.env.e2e.example → frontend/.env.e2e and fill both. " +
  "Ensure frontend/.env has NEXT_PUBLIC_API_URL pointing at a live API. " +
  "Install browsers once: pnpm exec playwright install chromium (from frontend/). " +
  "Seed credentials: cd backend && python create_test_user.py. " +
  "Run authenticated suite only: pnpm run e2e:auth. Default pnpm run e2e stays green without this file.";

export function hasE2eCredentials(): boolean {
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD?.trim();
  return Boolean(email && password);
}

export function getE2eCredentials(): { email: string; password: string } {
  const email = process.env.E2E_USER_EMAIL?.trim() ?? "";
  const password = process.env.E2E_USER_PASSWORD?.trim() ?? "";
  if (!email || !password) {
    throw new Error(
      "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set (see frontend/.env.e2e.example).",
    );
  }
  return { email, password };
}
