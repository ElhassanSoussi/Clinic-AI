# Deployment Guide

Clinic AI deploys as a monorepo with:

- `backend/` on Render as a Python web service
- `frontend/` on Vercel as a Next.js app
- Supabase for database, auth, and storage

This document is the production deployment runbook.

## 1. Render Backend

### Service configuration

- Service type: `Web Service`
- Root directory: `backend`
- Runtime: `Python`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/api/health`

### Backend environment boundaries

Core runtime variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `CORS_ORIGINS`
- `ENVIRONMENT=production`

Feature-specific backend variables:

- Stripe billing and deposits:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_PROFESSIONAL`
  - `STRIPE_PRICE_PREMIUM`
  - `FRONTEND_APP_URL`
- Resend email notifications:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` or `RESEND_FROM_DOMAIN`
- Google Sheets:
  - `GOOGLE_CREDENTIALS_B64` or `GOOGLE_CREDENTIALS_JSON` or `GOOGLE_CREDENTIALS_PATH`
- Twilio SMS:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
- Protected admin tooling:
  - `ADMIN_SECRET`

### Backend production rules

- `CORS_ORIGINS` must contain only real frontend origins in production
- `FRONTEND_APP_URL` should be the canonical frontend URL when billing links or email dashboard links are enabled
- Production startup fails fast only for core runtime configuration
- Production startup also fails if `CORS_ORIGINS` or `FRONTEND_APP_URL` point to localhost or another loopback host
- Missing feature-specific env vars do not block app boot, but those features stay disabled and surface blocked or partial readiness states in the product

Example production values:

```text
FRONTEND_APP_URL=https://clinicaireply.com
CORS_ORIGINS=https://clinicaireply.com
```

## 2. Vercel Frontend

### Project configuration

- Framework preset: `Next.js`
- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave empty

### Required frontend environment variables

Set all of these on Vercel:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional frontend variables:

- `API_INTERNAL_URL`
- `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH`

Example production values:

```text
NEXT_PUBLIC_API_URL=https://api.clinicaireply.com/api
API_INTERNAL_URL=https://api.clinicaireply.com/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH=false
```

### Frontend production rules

- The frontend API client reads `NEXT_PUBLIC_API_URL` only from environment variables
- There is no localhost runtime fallback anymore
- Missing public env vars now fail clearly instead of silently defaulting
- OAuth completion is proxied through a Next.js route, so browser-to-backend CORS is not part of the auth completion path

## 3. Domain and Auth Configuration

Once the first Render and Vercel deployments are live:

1. Set `FRONTEND_APP_URL` on Render to the final frontend URL.
2. Set `CORS_ORIGINS` on Render to the exact Vercel and custom domain origins.
3. In Supabase Auth, set the Site URL to the frontend domain.
4. In Supabase Auth, add redirect URLs for:

- `https://clinicaireply.com/auth/callback`
- any Vercel preview or alternate production domains you intend to support

OAuth redirect consistency requirements:

- Supabase Site URL must match the deployed frontend domain
- Supabase redirect URLs must include `/auth/callback`
- `FRONTEND_APP_URL` and `CORS_ORIGINS` must align with the same domain set

## 4. Supabase Setup

### Required values

Copy these from Supabase project settings:

- Project URL to `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
- Anon key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service role key to `SUPABASE_SERVICE_KEY`

### Database bootstrap

Apply in Supabase SQL Editor:

1. `backend/schema.sql`
2. Every file in `backend/migrations/` in timestamp order

Current launch-critical migrations include:

- `20260331_add_channel_foundation.sql`
- `20260331_add_frontdesk_automation.sql`
- `20260331_add_sms_delivery.sql`
- `20260331_add_sms_threads.sql`
- `20260331_add_sms_ai_takeover.sql`
- `20260402_add_appointment_deposits.sql`

### OAuth providers

- Configure Google in Supabase if Google sign-in is required
- Configure Microsoft only after the Azure tenant and app registration are verified
- If `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH=true`, the Microsoft provider must be fully configured in Supabase and Azure AD

## 5. Stripe Setup

### Backend variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_PREMIUM`

### Webhook endpoint

Point Stripe webhooks to:

```text
https://api.clinicaireply.com/api/billing/webhook
```

Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

If Stripe is only partially configured, the app still runs but billing checkout, deposit requests, or payment status tracking remain blocked until the missing pieces are added.

## 6. Twilio, Resend, and Google Sheets

Twilio inbound SMS:

```text
https://api.clinicaireply.com/api/frontdesk/communications/twilio/inbound
```

Render custom domain:

- attach `api.clinicaireply.com` to the Render backend service
- keep the backend service env using `FRONTEND_APP_URL=https://clinicaireply.com`
- set `CORS_ORIGINS=https://clinicaireply.com`

Vercel custom domain:

- attach `clinicaireply.com` to the Vercel frontend project
- set `NEXT_PUBLIC_API_URL=https://api.clinicaireply.com/api`
- set `API_INTERNAL_URL=https://api.clinicaireply.com/api` unless your server-side networking needs a separate internal URL

Before launch, verify:

- the Twilio sender or messaging service is active
- inbound SMS points to the live backend URL
- carrier and A2P registration requirements are satisfied
- outbound SMS is allowed for your target numbers

Resend:

- verify the sender identity
- confirm `RESEND_API_KEY`
- confirm `RESEND_FROM_EMAIL` or `RESEND_FROM_DOMAIN`

Google Sheets:

- share the spreadsheet with the configured Google identity
- validate the connection from Settings before launch

## 7. Launch Smoke Check

Run the smoke script against the live stack or the final local stack:

```bash
cd backend
CLINIC_AI_BACKEND_URL=https://api.clinicaireply.com/api \
CLINIC_AI_FRONTEND_URL=https://clinicaireply.com \
CLINIC_AI_SMOKE_EMAIL=owner@clinic.com \
CLINIC_AI_SMOKE_PASSWORD='your-password' \
python scripts/launch_readiness_smoke.py
```

## 8. Final Verification Checklist

Verify this exact flow after deployment:

1. Landing page loads without runtime env errors
2. Register works or, if email confirmation is required, the user gets a clear confirmation message and no invalid session is stored
3. Login works
4. Onboarding flow completes
5. Public chat works
6. Dashboard loads
7. Stripe checkout works
8. Stripe webhook updates billing state
9. No browser console errors on core flows
10. `GET /api/health` returns `{ "status": "ok" }`
11. `GET /api/frontdesk/system-readiness` reports only the expected blocked or partial items for your launch setup

## 9. Deployment Order

1. Apply Supabase schema and migrations
2. Deploy backend to Render
3. Verify backend health endpoint
4. Deploy frontend to Vercel
5. Set production domains in Render, Vercel, and Supabase Auth
6. Configure Stripe webhook
7. Run the final verification checklist
