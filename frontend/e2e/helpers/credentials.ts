/**
 * Authenticated E2E uses real `/auth/login` against `VITE_PUBLIC_API_URL` / default API.
 * Set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` in `frontend/.env.e2e` (see `e2e/env.example`).
 * When unset, the auth spec is skipped so `pnpm run e2e` stays green; use real credentials to exercise it.
 */
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
      "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for this test (see frontend/e2e/env.example).",
    );
  }
  return { email, password };
}
