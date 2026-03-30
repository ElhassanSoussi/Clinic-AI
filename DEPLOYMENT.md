# Deployment Guide

This repository is structured as a small monorepo:

- `frontend/` -> Next.js app -> deploy to Vercel
- `backend/` -> FastAPI app -> deploy to Render
- Supabase -> database, auth, storage

Use this guide after the code is pushed to GitHub.

## 1. Frontend on Vercel

### Project setup

- Import the GitHub repository into Vercel
- Framework preset: `Next.js`
- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: leave blank, Vercel will detect `.next`

### Required frontend environment variables

Set these in the Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

Optional:

- `API_INTERNAL_URL`
- `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH`

Recommended values:

- `NEXT_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`
- `API_INTERNAL_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`

### Domain notes

- Add your production domain in Vercel after the first successful deploy
- If you add a custom domain later, update:
  - Supabase Auth Site URL
  - Supabase Auth Redirect URLs
  - backend `CORS_ORIGINS`
  - backend `FRONTEND_APP_URL`

## 2. Backend on Render

### Service setup

- Service type: `Web Service`
- Root directory: `backend`
- Runtime: `Python`
- Build command:

```bash
pip install -r requirements.txt
```

- Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

- Health check path:

```text
/api/health
```

### Required backend environment variables

Always set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `ENVIRONMENT=production`
- `CORS_ORIGINS`
- `FRONTEND_APP_URL`

Billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_PREMIUM`

Email:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Optional / advanced:

- `RESEND_FROM_DOMAIN`
- `GOOGLE_CREDENTIALS_B64`
- `GOOGLE_CREDENTIALS_JSON`
- `GOOGLE_CREDENTIALS_PATH`
- `ADMIN_SECRET`

### Production notes

- `CORS_ORIGINS` must contain only real public frontend origins in production
- Do not leave `localhost` or `127.0.0.1` in `CORS_ORIGINS` for production
- `FRONTEND_APP_URL` should be your canonical frontend URL, for example:

```text
https://your-app.vercel.app
```

- API docs are disabled automatically when `ENVIRONMENT=production`
- For hosted deployments, prefer `GOOGLE_CREDENTIALS_B64` instead of `GOOGLE_CREDENTIALS_PATH`

## 3. Supabase

### Required project values

Copy these from Supabase project settings:

- Project URL -> `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
- Anon key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service role key -> `SUPABASE_SERVICE_KEY`

### Schema and migrations

Run these in Supabase SQL Editor:

1. `backend/schema.sql`
2. every file in `backend/migrations/` in timestamp order:
   - `20260326_add_slot_columns.sql`
   - `20260327_add_billing.sql`
   - `20260327_add_onboarding_branding.sql`
   - `20260328_add_increment_leads_rpc.sql`
   - `20260328_add_sheets_notifications_availability.sql`
   - `20260329_add_events_and_sales_leads.sql`
   - `20260329_add_is_live.sql`

### Auth configuration

In Supabase Auth:

- Site URL:

```text
https://YOUR-FRONTEND-DOMAIN
```

- Redirect URLs should include:

```text
https://YOUR-FRONTEND-DOMAIN/auth/callback
```

Add both the Vercel preview/default domain and the final custom domain if you use both.

If you use Google or Microsoft OAuth:

- configure the provider in Supabase
- make sure the provider callback returns to Supabase, and Supabase redirects to `/auth/callback`
- keep redirect URLs aligned with the Vercel domain you actually use

## 4. Stripe

### Required Stripe variables

For test mode or live mode, set the matching values on Render:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_PREMIUM`
- `STRIPE_WEBHOOK_SECRET`

### Webhook setup

Create a Stripe webhook endpoint pointing to:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/billing/webhook
```

Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## 5. Google Sheets / Resend

### Google Sheets

If you want availability sync or lead sync:

- create a Google Cloud service account
- enable Google Sheets API
- share the target sheet with the service account email
- store credentials using one of:
  - `GOOGLE_CREDENTIALS_B64`
  - `GOOGLE_CREDENTIALS_JSON`
  - `GOOGLE_CREDENTIALS_PATH` (local/dev only)

### Resend

If you want email notifications:

- verify a sender domain in Resend
- set:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`

Recommended sender format:

```text
notifications@yourdomain.com
```

## 6. Deployment Order

1. Push repository to GitHub
2. Deploy backend to Render
3. Confirm `GET /api/health` is healthy
4. Deploy frontend to Vercel
5. Update Supabase Auth URLs to the Vercel URL
6. Configure Stripe webhook to the Render backend
7. Add custom domains
8. Update:
   - Vercel env vars if domain-related
   - Render `CORS_ORIGINS`
   - Render `FRONTEND_APP_URL`
   - Supabase Site URL / Redirect URLs

## 7. Post-deploy verification

Run these checks in order:

1. Open the frontend landing page
2. Register a new clinic account
3. Complete onboarding
4. Open the public chat route for the clinic slug
5. Create a lead and confirm it appears in the dashboard
6. Test Stripe checkout from the dashboard billing page
7. Confirm Stripe webhook events update the plan in Supabase
8. If enabled, test:
   - Google Sheets sync
   - email notifications
   - OAuth sign-in

## 8. Known manual items

These are not code changes and must still be done manually:

- create the Supabase project
- apply the SQL schema and migrations
- configure Supabase Auth providers
- create Stripe products/prices/webhook
- configure Render environment variables
- configure Vercel environment variables
- connect custom domains
