# Frontend testing & launch checks

**Deploy matrix, order, and provider URLs:** [../DEPLOYMENT.md](../DEPLOYMENT.md). This file is **commands + manual smoke sequence** only.

## Prerequisites

- Install browsers once: `pnpm exec playwright install chromium` (from `frontend/`). Headless runs fail with “Executable doesn't exist” until this completes (some CI/sandbox environments need network permission for the download).

## Commands

| Command | What runs |
|--------|-----------|
| `pnpm run e2e` | **Recommended default:** `smoke` + `critical-pages` only — green without auth env |
| `pnpm run e2e:smoke` | `e2e/smoke.spec.ts` only |
| `pnpm run e2e:critical` | `e2e/critical-pages.spec.ts` only (public pages, login redirects, optional logged-in crawl) |
| `pnpm run e2e:auth` | Full login → app → logout (`auth-flow.spec.ts`) — requires `frontend/.env.e2e` credentials |
| `pnpm run e2e:all` | Every spec under `e2e/`, including `auth-flow` (needs credentials or those tests skip) |
| `pnpm run e2e:live` | Deployed frontend HTML smoke (`deployed-smoke.spec.ts`) — set `PLAYWRIGHT_BASE_URL` |
| `pnpm run e2e:ui` | Playwright UI mode |

Without `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`, specs that need a real session **`test.skip`** with an explicit reason (intentional — **not** a failure). The skip message points at `frontend/.env.e2e.example` and `pnpm exec playwright install chromium`.

### Live / production smoke (Playwright)

Does **not** log in or assert API calls — only that **your** deployed Clinic AI build renders key pages. The URL must be this frontend (not a random host).

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://your-clinic-ai-frontend-domain.com pnpm run e2e:live
```

When `PLAYWRIGHT_BASE_URL` is set, Playwright does **not** start the Vite dev server.

## Environment

| File | Purpose |
|------|---------|
| `frontend/.env` | Dev/build: **`NEXT_PUBLIC_API_URL`** (required in production builds), **`NEXT_PUBLIC_SITE_URL`** (canonical links, Stripe returns, chat URL in Settings), Supabase keys per `.env.example` |
| `frontend/.env.e2e` | Playwright only: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` |

Copy `frontend/.env.e2e.example` → `frontend/.env.e2e`.

**Avoid localhost in production:** Vercel/Render env vars must use real `https://` API and site URLs. See [../DEPLOYMENT.md](../DEPLOYMENT.md) and [../LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md).

## Test user (auth E2E)

```bash
cd backend && python create_test_user.py
```

Use the printed credentials in `frontend/.env.e2e`.

---

## Manual smoke — production or staging

Run against your **live** frontend URL with backend envs set. Check each row; note pass/fail.

**Training route in app:** `/app/ai-training` (not `/app/training`).

### Live smoke sequence (step-by-step)

Do these in order once per release or after infra changes. Substitute your real origin for `https://clinicaireply.com` and a real clinic slug for `YOUR_SLUG`.

**Public (logged out)**

1. Open `https://clinicaireply.com/` — landing renders.
2. Open `/product`, `/pricing`, `/trust`, `/faq`, `/contact` — each loads a primary heading (no blank screen).
3. Open `/privacy`, `/terms` — legal pages load.
4. Open `/login` — sign-in form; submit only if API + Supabase envs are correct for this host.
5. Open `/register` — registration form.
6. Open `/chat` — patient chat gate; enter slug or use step 7.
7. Open `/chat?slug=YOUR_SLUG` — branding loads or clear error; if clinic not live, expect non-live banner.
8. Open `/chat?slug=bad slug!` — invalid slug message (client-side validation before API).

**Authenticated (same host)**

1. Sign in from `/login` — land on `/app/dashboard` (or `?from=` deep link after login).
2. Open `/app/dashboard` — metrics or empty states.
3. Open `/app/settings` — loads; **Save** → success toast; **Go live** / **Pause** if shown — live state updates.
4. Open `/app/billing` — loads; checkout / portal buttons error with toast if Stripe not configured (no silent failure).
5. Open `/app/inbox`, `/app/leads`, `/app/appointments` — list or empty state.
6. Open `/app/ai-training` — training overview loads.
7. Open `/app/account` — update profile; save feedback.
8. **Logout** — return to `/login`; hit `/app/settings` logged out → redirect to `/login?from=…`.

**Error / edge**

1. Expired JWT — next API **401** clears session; login may show session-expired notice.
2. Wrong or unset `NEXT_PUBLIC_API_URL` — user-visible API errors, not raw HTML.
3. Settings save failure — toast + error banner when applicable.
4. Empty inbox/leads — empty state, not infinite spinner.

---

## Automated vs manual

- **Automated (`pnpm run e2e`):** public routes, protected redirects, `?from=` on settings, smoke headings.
- **Automated auth (`e2e:auth`):** full journey when `.env.e2e` is set.
- **Manual:** Stripe real money, email/SMS, go-live side effects, production-only CORS.

Deep business checklist: [../LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md).
