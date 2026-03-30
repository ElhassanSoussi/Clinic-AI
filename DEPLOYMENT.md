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

### Required backend environment variables

Set all of these on Render:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_PREMIUM`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `FRONTEND_APP_URL`
- `CORS_ORIGINS`
- `ENVIRONMENT=production`

Optional backend variables:

- `RESEND_FROM_DOMAIN`
- `GOOGLE_CREDENTIALS_B64`
- `GOOGLE_CREDENTIALS_JSON`
- `GOOGLE_CREDENTIALS_PATH`
- `ADMIN_SECRET`

### Backend production rules

- `CORS_ORIGINS` must contain only real frontend origins in production
- `FRONTEND_APP_URL` must be the canonical Vercel or custom domain URL
- Production startup now fails fast if required production variables are missing
- Production startup also fails if `CORS_ORIGINS` or `FRONTEND_APP_URL` point to localhost or another loopback host

Example production values:

```text
FRONTEND_APP_URL=https://clinic-ai.vercel.app
CORS_ORIGINS=https://clinic-ai.vercel.app,https://www.clinic-ai.com
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
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com/api
API_INTERNAL_URL=https://your-render-service.onrender.com/api
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
  - `https://your-frontend-domain/auth/callback`
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
https://your-render-service.onrender.com/api/billing/webhook
```

Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## 6. Final Verification Checklist

Verify this exact flow after deployment:

1. Landing page loads without runtime env errors
2. Register works
3. Login works
4. Onboarding flow completes
5. Public chat works
6. Dashboard loads
7. Stripe checkout works
8. Stripe webhook updates billing state
9. No browser console errors on core flows
10. `GET /api/health` returns `{ "status": "ok" }`

## 7. Deployment Order

1. Apply Supabase schema and migrations
2. Deploy backend to Render
3. Verify backend health endpoint
4. Deploy frontend to Vercel
5. Set production domains in Render, Vercel, and Supabase Auth
6. Configure Stripe webhook
7. Run the final verification checklist
