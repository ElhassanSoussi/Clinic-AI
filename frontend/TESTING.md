# Frontend testing & launch checks

## Prerequisites

- Install browsers once: `pnpm exec playwright install chromium` (from `frontend/`).

## Commands

| Command | What runs |
|--------|-----------|
| `pnpm run e2e` | Smoke + critical routes (default CI/local green run; **no** `auth-flow`) |
| `pnpm run e2e:smoke` | `e2e/smoke.spec.ts` only |
| `pnpm run e2e:critical` | Public pages, login redirects, optional session crawl |
| `pnpm run e2e:auth` | Full login → app → logout (`auth-flow.spec.ts`) |
| `pnpm run e2e:all` | Every spec including auth-flow |
| `pnpm run e2e:live` | Deployed frontend only (needs `PLAYWRIGHT_BASE_URL`) |
| `pnpm run e2e:ui` | Playwright UI mode |

Without `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`, auth specs **skip** with a clear reason (not a failure).

### Live / production smoke (Playwright)

Point at a **real** deployed origin (no local `pnpm run dev`):

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://your-production-domain.com pnpm run e2e:live
```

When `PLAYWRIGHT_BASE_URL` is set, `playwright.config.ts` does **not** start the Vite dev server. Use this after deploy to confirm HTML routes load; it does not log in or call your API from Node.

## Environment

| File | Purpose |
|------|---------|
| `frontend/.env` | Dev server: `NEXT_PUBLIC_API_URL`, Supabase keys, etc. |
| `frontend/.env.e2e` | Playwright only: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` |

Copy `frontend/.env.e2e.example` → `frontend/.env.e2e`.

## Test user

From repo root (backend env / Supabase service role required):

```bash
cd backend && python create_test_user.py
```

Use the printed email/password in `frontend/.env.e2e` (or set `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` before running the script).

## Launch verification (manual)

**Production:** set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` on the host (see `LAUNCH_CHECKLIST.md`). Without `NEXT_PUBLIC_API_URL`, production builds log an error and API calls fail fast.

Run `pnpm run dev` (local) or open the live URL and confirm:

1. **Boot** — app opens (local: `http://127.0.0.1:1201`).
2. **Auth** — login works; expired session → next API 401 clears session (re-login).
3. **Dashboard** — `/app/dashboard` loads after login.
4. **Settings** — `/app/settings` loads; save shows feedback; go-live / pause; patient link uses `getPublicOrigin()` — set `NEXT_PUBLIC_SITE_URL` so embed/snippet URLs match production.
5. **Billing** — `/app/billing` loads; checkout/portal URLs must be non-empty or UI shows an error (no silent blank redirect).
6. **Chat** — `/chat?slug=your-clinic-slug` (public branding + messages; not-live shows a banner).
7. **Protected routes** — logged out, `/app/*` redirects to `/login?from=…` so return after login works.
8. **Save feedback** — account/settings saves show toast or inline confirmation (see `e2e/auth-flow.spec.ts`).

Automated coverage: `pnpm run e2e`, `pnpm run e2e:auth` when credentials exist, `pnpm run e2e:live` after deploy.
