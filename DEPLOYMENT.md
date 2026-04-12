# Deployment Guide

Clinic AI runs as:

- `backend/` on Render
- `frontend/` on Vercel
- Supabase for database and auth

Production domains (examples — substitute yours everywhere):

- frontend: `https://clinicaireply.com`
- backend API: `https://api.clinicaireply.com`

## Configuration matrix (authoritative)

Values are **case-sensitive** where providers say so. **R** = required for that layer to behave correctly; **O** = optional (feature degrades gracefully or is off).

### Backend — always required to boot

| Name | R/O | Example | If wrong / missing |
|------|-----|---------|-------------------|
| `SUPABASE_URL` | R | `https://xxxx.supabase.co` | Process exits at startup (`ValidationError`). |
| `SUPABASE_SERVICE_ROLE_KEY` | R | service_role JWT | Same; alias `SUPABASE_SERVICE_KEY` also accepted in code. |
| `OPENAI_API_KEY` | R | `sk-…` | Same. |
| `CORS_ORIGINS` | R | `https://clinicaireply.com` or comma-separated list | Empty → exit; wrong origin → browser CORS errors, no API from SPA. |
| `ENVIRONMENT` | R | `production` or `development` | Must be one of these literals; production tightens URL validation (no loopback in `CORS_ORIGINS` / `FRONTEND_APP_URL`). |

### Backend — required for correct production links (warns if missing)

| Name | R/O | Example | If wrong / missing |
|------|-----|---------|-------------------|
| `FRONTEND_APP_URL` | Strongly recommended | `https://clinicaireply.com` (no trailing slash) | Deposit Stripe return URLs, “View in Dashboard” email links, Sheets/Excel OAuth return paths break or point wrong. |

### Backend — optional by feature

| Name | Feature | If missing |
|------|---------|------------|
| `STRIPE_*` (secret, webhook secret, both price IDs) | Paid plans, webhooks | Checkout/portal/deposits disabled or incomplete; warnings in logs. |
| `TWILIO_*` | SMS | Inbound/outbound SMS disabled. |
| `RESEND_*` | Transactional email | Email notifications disabled. |
| `GOOGLE_CREDENTIALS_*` / `GOOGLE_OAUTH_*` | Sheets | Sync / quick connect disabled. |
| `MICROSOFT_OAUTH_*` | Excel | Quick connect disabled. |
| `ADMIN_SECRET` | Admin routes | Admin tools unavailable. |
| `SENTRY_DSN` | Error reporting | Sentry not initialized. |

### Frontend (Vite — all `NEXT_PUBLIC_*` baked at build)

| Name | R/O | Example | If wrong / missing |
|------|-----|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | R for client | Supabase project URL | Auth/client integration fails. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | R for client | anon key | Same. |
| `NEXT_PUBLIC_API_URL` | **R in production** | `https://api.example.com/api` (no trailing slash; must include `/api`) | **Production:** empty base → API calls fail (`getApiBaseUrl()`). **Dev:** defaults to `http://127.0.0.1:7001/api` if unset. |
| `NEXT_PUBLIC_SITE_URL` | Strongly recommended | `https://clinicaireply.com` | Billing return URLs, Settings chat links, canonical OG use `window.location.origin` fallback in browser if unset. |
| `VITE_PUBLIC_API_URL` | O | same as API URL | Alternate name read by `getApiBaseUrl()`. |
| `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH` / `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH` | O | `true` / `false` | Hides provider buttons when false. |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_VERCEL_ENV` | O | per Sentry/Vercel | Observability only. |

`API_INTERNAL_URL` in `frontend/.env.example` is **not read** by the current Vite SPA; the browser uses `NEXT_PUBLIC_API_URL` only.

### Provider / DNS (configure in dashboards, not always “env”)

| What | Where | Notes |
|------|-------|------|
| API public URL | DNS → backend host | Must match `NEXT_PUBLIC_API_URL` origin + `/api` path. |
| Stripe webhook | Stripe dashboard | `POST https://<api-host>/api/billing/webhook` |
| Twilio inbound | Twilio webhook URL | `https://<api-host>/api/frontdesk/communications/twilio/inbound` |
| Supabase Auth Site URL | Supabase | Production frontend origin (e.g. `https://clinicaireply.com`). |
| Google Sheets OAuth redirect | Google Cloud | `https://<api-host>/api/clinics/google-sheets/callback` |
| Microsoft Excel OAuth redirect | Entra | `https://<api-host>/api/clinics/microsoft-excel/callback` |

### Database migration order

1. **Greenfield:** apply `backend/schema.sql`, then **every** file in `backend/migrations/*.sql` sorted by **filename** (timestamp prefix).
2. **Existing Supabase:** apply only **new** migration files, same sort order, that are not yet applied.

### SPA / hosting (frontend)

| Item | Value (this repo) |
|------|-------------------|
| Build | `pnpm install` → `pnpm run build` (see `frontend/vercel.json`) |
| Output | `frontend/dist` |
| SPA fallback | `vercel.json` rewrites `/(.*)` → `/index.html` |
| Dev server | `pnpm run dev` — `127.0.0.1:1201` (see `package.json`) |

**Auth (current code):** login/register call backend `/api/auth/login` and `/api/auth/register`; JWT stored client-side; protected routes under `/app/*`. **Billing:** SPA sends `success_url` / `cancel_url` to checkout API using `getPublicOrigin()` + `/app/billing?…`. **Public chat:** route `/chat`, query `?slug=` (validated in `PatientChatPage`).

## Recommended deploy order

1. **Supabase:** project live; note URL, anon key, service role key.
2. **Database:** run `schema.sql` (if new) + all `migrations/*.sql` in filename order.
3. **Supabase Auth:** Site URL = production frontend origin; enable email/password as needed.
4. **Backend env:** set all **backend — always required** vars + `FRONTEND_APP_URL` + feature vars you need.
5. **Deploy backend** (e.g. Render: root `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check path **`/api/health`**).
6. **Verify:** `GET https://<api>/api/health` → `{"status":"ok"}`.
7. **DNS:** point API hostname to backend; confirm HTTPS.
8. **Frontend env (Vercel):** `NEXT_PUBLIC_*` as in matrix; production **`NEXT_PUBLIC_API_URL`** must match deployed API (`…/api`).
9. **Deploy frontend:** root `frontend`, framework **Vite**, output `dist`.
10. **DNS:** apex (and `www` → apex if used); add every live frontend origin to **`CORS_ORIGINS`** on the backend.
11. **Stripe / Twilio / Resend:** webhooks and keys as in provider table.
12. **Manual smoke:** [frontend/TESTING.md](frontend/TESTING.md) (sequence + commands).
13. **Optional:** `cd frontend && PLAYWRIGHT_BASE_URL=https://<frontend> pnpm run e2e:live`.

## Commands (local before deploy)

From repo root:

```bash
python3 -m py_compile backend/app/main.py backend/app/routers/*.py backend/app/services/*.py backend/app/schemas/*.py backend/create_test_user.py backend/scripts/launch_readiness_smoke.py
cd frontend && pnpm run lint && pnpm run typecheck && pnpm run build && pnpm run e2e
```

(`e2e` starts the dev server unless `PLAYWRIGHT_BASE_URL` is set; install browsers once: `pnpm exec playwright install chromium`.)

## Commands (after deploy)

```bash
# Backend + frontend HTTP smoke (optional creds)
cd backend
CLINIC_AI_BACKEND_URL=https://<api-host>/api \
CLINIC_AI_FRONTEND_URL=https://<frontend-host> \
CLINIC_AI_SMOKE_EMAIL=... CLINIC_AI_SMOKE_PASSWORD=... \
python scripts/launch_readiness_smoke.py
```

```bash
# Deployed UI smoke only
cd frontend && PLAYWRIGHT_BASE_URL=https://<frontend-host> pnpm run e2e:live
```

Further operator notes: [frontend/RELEASE.md](frontend/RELEASE.md). Human checklist (business flows): [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## Render

1. Create a new Render web service from this repo.
2. Set the root directory to `backend`.
3. Use:
   - build command: `pip install -r requirements.txt`
   - start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - health check path: `/api/health`
4. Add the required backend env vars:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `ENVIRONMENT=production`
   - `CORS_ORIGINS` — comma-separated list of allowed **browser origins** (scheme + host + port). Production example: `https://clinicaireply.com`. Add `https://www.clinicaireply.com` or preview origins if those hits will talk to this API.
   - `PYTHON_VERSION=3.11.15`
5. Add production app URL env:
   - `FRONTEND_APP_URL=https://clinicaireply.com` (no trailing slash; used for email links, deposit checkout returns, and Sheets/Excel OAuth redirects into the Vite app at `/app/...`)
6. Attach the custom domain:
   - `api.clinicaireply.com`
7. Verify:
   - `https://api.clinicaireply.com/api/health`

Feature-specific backend env vars:

- Stripe:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_PROFESSIONAL`
  - `STRIPE_PRICE_PREMIUM`
- Twilio:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
- Resend:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` or `RESEND_FROM_DOMAIN`
- Google Sheets:
  - `GOOGLE_CREDENTIALS_B64` or `GOOGLE_CREDENTIALS_JSON` or `GOOGLE_CREDENTIALS_PATH`
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
- Microsoft Excel:
  - `MICROSOFT_OAUTH_CLIENT_ID`
  - `MICROSOFT_OAUTH_CLIENT_SECRET`
  - `MICROSOFT_OAUTH_TENANT=common`
- Admin:
  - `ADMIN_SECRET`

## Vercel

1. Create a new Vercel project from this repo.
2. Set the root directory to `frontend`.
3. Set the **Framework Preset** to **Vite** (Project → Settings → General → Framework). The repo includes `frontend/vercel.json` with `"framework": "vite"`; if the preset is left on **Next.js**, the build fails with “No Next.js version detected” because the app is Vite, not Next.
4. Add the **required** frontend env vars (see `frontend/.env.example`):
   - `NEXT_PUBLIC_API_URL=https://api.clinicaireply.com/api`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
5. Add **production**-recommended vars:
   - `NEXT_PUBLIC_SITE_URL=https://clinicaireply.com` — canonical URL for metadata/Open Graph (omit on preview if you are OK with `*.vercel.app` URLs in link previews; required for correct production sharing cards).
6. OAuth UI flags (align with Supabase providers):
   - `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=true`
   - `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH=true` only after Microsoft auth is configured in Supabase
7. **Sentry (optional):**
   - If you add Sentry to this Vite SPA: set `NEXT_PUBLIC_SENTRY_DSN` and follow Sentry’s Vite/browser SDK setup (this repo does not ship `instrumentation.ts` like Next.js).
   - For source maps in CI: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` per Sentry docs.
   - `NEXT_PUBLIC_VERCEL_ENV` — optional env tag for the browser SDK.
8. Attach the custom domain:
   - `clinicaireply.com`
9. Verify the site loads and can reach the backend API.
10. Keep `clinicaireply.com` as the canonical frontend host. If `www.clinicaireply.com` is attached, it should redirect to the apex domain.

**Preview deployments:** Vercel sets `VERCEL_URL` automatically. Point `NEXT_PUBLIC_API_URL` at a non-production API unless you intentionally want previews to hit production data.

If Vercel shows `No fastapi entrypoint found`, the project is building the repo root instead of `frontend`. Update the Vercel project `Root Directory` to `frontend` and redeploy.

If Vercel shows **No Next.js version detected**, the Framework Preset is still Next.js. Switch it to **Vite** (or redeploy after pulling `frontend/vercel.json`).

After first deploy, follow **Recommended deploy order** steps 12–13 and [frontend/TESTING.md](frontend/TESTING.md).

## Supabase

1. Set Auth Site URL to:
   - `https://clinicaireply.com`
2. **Redirect URLs:** The current SPA signs in via the **backend** (`POST /api/auth/login`, `POST /api/auth/register`); there is no `/auth/callback` route in the Vite app. Add `https://clinicaireply.com/auth/callback` (and preview URLs if needed) **when** you enable Supabase OAuth (Google/Microsoft) in the browser; required for those providers, not for email/password-only via API.
3. Apply:
   - `backend/schema.sql`
   - every file in `backend/migrations/` in timestamp order
4. Copy env values into Render and Vercel (`NEXT_PUBLIC_*` from Supabase settings):
   - project URL
   - anon key
   - service role key
5. If Google sign-in is live:
   - enable the Google provider in Supabase Auth
   - add callback URL:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - add site URL / redirect URL for:
     - `https://clinicaireply.com/auth/callback`
6. If Google Sheets quick connect is live:
   - create a Google OAuth web app
   - add backend callback URL:
     - `https://api.clinicaireply.com/api/clinics/google-sheets/callback`
   - set Render env vars:
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `GOOGLE_OAUTH_CLIENT_SECRET`
   - keep a service account configured too, because Clinic AI still uses it for ongoing sheet sync after setup
7. If Microsoft Excel quick connect is live:
   - create a Microsoft Entra app registration
   - add backend callback URL:
     - `https://api.clinicaireply.com/api/clinics/microsoft-excel/callback`
   - set Render env vars:
     - `MICROSOFT_OAUTH_CLIENT_ID`
     - `MICROSOFT_OAUTH_CLIENT_SECRET`
     - `MICROSOFT_OAUTH_TENANT=common`
   - make sure the app registration allows OneDrive / Microsoft Graph file access for workbook creation
8. If Microsoft sign-in is live:
   - enable the Azure provider in Supabase Auth
   - use the Supabase callback URL in the Azure app registration:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - set the Azure redirect URI for web auth to that callback URL
   - enable `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH=true` in Vercel only after the provider is working
   - if Azure accounts do not always return email, enable `Allow users without an email` in the Supabase Azure provider settings

## Stripe

1. Set backend Stripe env vars on Render.
2. Point the Stripe webhook to:
   - `https://api.clinicaireply.com/api/billing/webhook`
3. Subscribe at minimum to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

## Twilio

1. Set backend Twilio env vars on Render.
2. Point inbound SMS to:
   - `https://api.clinicaireply.com/api/frontdesk/communications/twilio/inbound`
3. Confirm the sender or messaging service is active and compliant for production sending.

## Pre-deploy / smoke quick reference

Use **Commands (local before deploy)** and **Commands (after deploy)** above. Confirm: `GET /api/health` → `{"status":"ok"}`, `NEXT_PUBLIC_API_URL` ends with `/api`, `CORS_ORIGINS` lists your real frontend origin(s), Render `PYTHON_VERSION=3.11.15`.
