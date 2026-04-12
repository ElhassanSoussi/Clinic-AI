# Frontend testing & launch checks

## Prerequisites

- Install browsers once: `pnpm exec playwright install chromium` (from `frontend/`).

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
