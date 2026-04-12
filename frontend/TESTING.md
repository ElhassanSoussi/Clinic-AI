# Frontend testing & launch checks

## Prerequisites

- Install browsers once: `pnpm exec playwright install chromium` (from `frontend/`). Headless runs fail with “Executable doesn't exist” until this completes (some CI/sandbox environments need network permission for the download).

## Commands

| Command | What runs |
|--------|-----------|
| `pnpm run e2e` | Smoke + critical routes (default CI/local green run; **no** `auth-flow`) |
| `pnpm run e2e:smoke` | `e2e/smoke.spec.ts` only |
| `pnpm run e2e:critical` | Public pages, login redirects, optional session crawl |
| `pnpm run e2e:auth` | Full login → app → logout (`auth-flow.spec.ts`) — needs `frontend/.env.e2e` |
| `pnpm run e2e:all` | Every spec including auth-flow |
| `pnpm run e2e:live` | Deployed frontend HTML smoke — needs `PLAYWRIGHT_BASE_URL` |
| `pnpm run e2e:ui` | Playwright UI mode |

Without `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`, auth specs **skip** (not fail).

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

**Avoid localhost in production:** Vercel/Render env vars must use real `https://` API and site URLs. See [LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md).

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

**Authenticated**

1. Sign in from `/login` — land on `/app/dashboard` (or `?from=` deep link after login).
2. Open `/app/dashboard` — metrics or empty states.
3. Open `/app/settings` — loads; **Save** → success toast; **Go live** / **Pause** if shown — live state updates.
4. Open `/app/billing` — loads; checkout / portal buttons error with toast if Stripe not configured (no silent failure).
5. Open `/app/inbox`, `/app/leads`, `/app/appointments` — list or empty state.
6. Open `/app/ai-training` — training overview loads.
7. Open `/app/account` — update profile; save feedback.
8. **Logout** — return to `/login`; hit `/app/settings` logged out → redirect to `/login?from=…`.

**Error / edge**

1. With app logged in, expire or clear token (or wait for expiry) — next API 401 should clear session; login page shows session-expired style notice if implemented.
2. Unset or wrong `NEXT_PUBLIC_API_URL` on a test build — API errors should be user-visible strings, not raw HTML.
3. Settings save failure (e.g. offline) — toast + error banner when applicable.
4. Empty inbox/leads — empty state, not infinite spinner.

### Public (logged out)

| Route | What to verify |
|-------|----------------|
| `/` | Home renders; no blank screen |
| `/product`, `/pricing`, `/trust`, `/faq`, `/contact` | Primary content and headings load |
| `/login` | Form renders; sign-in works when API is correct |
| `/register` | Form renders; registration or confirmation message as expected |
| `/chat` | Slug prompt; **invalid slug** shows validation message |
| `/chat?slug=YOUR_SLUG` | Branding loads; **not live** shows banner; send message if backend allows |

### Authenticated

| Route | What to verify |
|-------|----------------|
| Login | Dashboard after success; **`/login?from=…`** returns to deep link after sign-in |
| `/app/dashboard` | Loads metrics/lists or sensible empty states |
| `/app/settings` | Loads; **Save** shows success toast; **Go live** / **Pause** update live pill |
| `/app/billing` | Loads; checkout/portal buttons show **error toast** if Stripe URL missing (no silent blank redirect) |
| `/app/inbox`, `/app/leads`, `/app/appointments` | Lists load or empty state |
| `/app/ai-training` | Overview loads |
| `/app/account` | Profile save and feedback |
| Logout | Returns to `/login`; `/app/*` redirects to login with **`from`** query |

### Error / edge

| Scenario | Expected |
|----------|----------|
| Wrong `NEXT_PUBLIC_API_URL` / offline API | User-visible error (not raw HTML dump); console error in prod if URL unset |
| Expired JWT | Next authenticated API **401** clears session; **login shows amber “session expired” notice** |
| Bad chat slug | Validation before API; unknown slug → branding error + “Try another slug” |
| Empty inbox/leads | Empty state or “no data”, not infinite spinner |
| Billing failure | Toast + inline error on billing page |
| Settings save failure | Toast + `saveError` banner |

---

## Automated vs manual

- **Automated (`pnpm run e2e`):** public routes, protected redirects, `?from=` on settings, smoke headings.
- **Automated auth (`e2e:auth`):** full journey when `.env.e2e` is set.
- **Manual:** Stripe real money, email/SMS, go-live side effects, production-only CORS.

See also [../LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md) for org-wide env and DNS.
