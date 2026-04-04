# Deployment Guide

Clinic AI runs as:

- `backend/` on Render
- `frontend/` on Vercel
- Supabase for database and auth

Production domains:

- frontend: `https://clinicaireply.com`
- backend API: `https://api.clinicaireply.com`

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
   - `CORS_ORIGINS=https://clinicaireply.com`
   - `PYTHON_VERSION=3.11.15`
5. Add production app URL env:
   - `FRONTEND_APP_URL=https://clinicaireply.com`
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
- Admin:
  - `ADMIN_SECRET`

## Vercel

1. Create a new Vercel project from this repo.
2. Set the root directory to `frontend`.
3. Add the frontend env vars:
   - `NEXT_PUBLIC_API_URL=https://api.clinicaireply.com/api`
   - `API_INTERNAL_URL=https://api.clinicaireply.com/api`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=true`
   - `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH=true` only after Microsoft auth is configured in Supabase
4. Attach the custom domain:
   - `clinicaireply.com`
5. Verify the site loads and can reach the backend API.
6. Keep `clinicaireply.com` as the canonical frontend host. If `www.clinicaireply.com` is attached, it should redirect to the apex domain.

If Vercel shows `No fastapi entrypoint found`, the project is building the repo root instead of `frontend`. Update the Vercel project `Root Directory` to `frontend` and redeploy.

## Supabase

1. Set Auth Site URL to:
   - `https://clinicaireply.com`
2. Add Auth Redirect URL:
   - `https://clinicaireply.com/auth/callback`
3. Apply:
   - `backend/schema.sql`
   - every file in `backend/migrations/` in timestamp order
4. Copy env values into Render and Vercel:
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
7. If Microsoft sign-in is live:
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

## Pre-Deploy Checks

- `python3 -m py_compile backend/app/main.py backend/app/routers/*.py backend/app/services/*.py backend/app/schemas/*.py backend/create_test_user.py backend/scripts/launch_readiness_smoke.py`
- `cd frontend && npm run build`
- `GET /api/health` returns `{"status":"ok"}`
- required env vars are present
- `NEXT_PUBLIC_API_URL` points to `https://api.clinicaireply.com/api`
- Render backend uses Python `3.11.15`

## Smoke Check

```bash
cd backend
CLINIC_AI_BACKEND_URL=https://api.clinicaireply.com/api \
CLINIC_AI_FRONTEND_URL=https://clinicaireply.com \
CLINIC_AI_SMOKE_EMAIL=owner@clinic.com \
CLINIC_AI_SMOKE_PASSWORD='your-password' \
python scripts/launch_readiness_smoke.py
```
