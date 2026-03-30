# Launch Checklist — Clinic AI

## Pre-Deploy

- [ ] **Backend env vars** — All required vars set in hosting platform:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`
  - `ENVIRONMENT=production`
  - `CORS_ORIGINS=https://your-frontend-domain.com`
- [ ] **Frontend env vars** — Set in Vercel/hosting:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api`
- [ ] **Supabase** — Schema applied, Auth configured:
  - Email/password enabled
  - Site URL = production frontend URL
  - Redirect URLs include production frontend
- [ ] **Stripe** — Live mode configured:
  - Live secret key set (`sk_live_...`)
  - Two price IDs created (Professional, Premium)
  - Webhook endpoint added: `https://backend/api/billing/webhook`
  - Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Webhook signing secret set
- [ ] **Email** — Resend domain verified, API key set
- [ ] **Google Sheets** (if used) — `GOOGLE_CREDENTIALS_B64` set with base64 JSON
- [ ] **Frontend builds** — `npm run build` succeeds locally with production env vars
- [ ] **No localhost** — Grep for `localhost` in production env vars (should be zero)

## Deploy

1. Push backend to hosting platform (Railway/Render/Fly.io)
2. Push frontend to Vercel
3. Wait for both to be live

## Post-Deploy Verification

### Core Health

- [ ] `GET https://backend/api/health` → `{"status": "healthy"}`
- [ ] Frontend loads at production URL (no blank screen)
- [ ] `/api/docs` returns 404 (disabled in production)

### Auth Flow

- [ ] Register a new test account
- [ ] Verify email received (if enabled)
- [ ] Login works, redirects to dashboard
- [ ] Logout works, redirects to login

### Onboarding

- [ ] New user sees onboarding flow
- [ ] Complete all onboarding steps
- [ ] Dashboard loads after onboarding

### Chat Widget

- [ ] Visit `/chat/YOUR_SLUG` — chat loads
- [ ] Send a message — AI responds
- [ ] Lead capture triggers (name/email/phone collection)
- [ ] New lead appears in dashboard

### Widget Embed

- [ ] Add `<script src="https://frontend/widget.js" data-clinic="YOUR_SLUG"></script>` to a test page
- [ ] Widget appears in bottom-right corner
- [ ] Chat works through the widget

### Billing (Real Money!)

- [ ] `/api/billing/plans` returns 3 plans
- [ ] Billing page shows current plan (trial)
- [ ] Click upgrade → Stripe Checkout opens
- [ ] Complete payment with **real card** (small amount test)
- [ ] Webhook fires → plan updates in dashboard
- [ ] Cancel subscription → downgrade works

### Google Sheets Sync

- [ ] Settings page → test sheet connection
- [ ] New lead syncs to Google Sheet

### Email Notifications

- [ ] New lead triggers email notification

## Demo Flow (for presentations)

1. Visit landing page → clean, professional
2. Click "Try Live Demo" → chat with Bright Smile Dental AI
3. Register → complete onboarding in < 2 minutes
4. Dashboard → leads, conversations, settings visible
5. Widget → embed on external page, live chat
6. Billing → upgrade flow with Stripe

## First Real Customer

- [ ] Customer registers via landing page
- [ ] Completes onboarding (clinic name, services, hours)
- [ ] AI assistant is customized to their clinic
- [ ] Embed widget on their website
- [ ] Leads flow into their dashboard
- [ ] Upgrade to Professional plan
- [ ] Google Sheets sync connected (if needed)
- [ ] Email notifications configured (if needed)
