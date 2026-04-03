# Launch Checklist — Clinic AI

## Pre-Deploy

- [ ] **Core backend env vars**:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
  - `ENVIRONMENT=production`
  - `CORS_ORIGINS=https://clinicaireply.com`
  - `PYTHON_VERSION=3.11.15`
- [ ] **Frontend env vars** — Set in Vercel/hosting:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL=https://api.clinicaireply.com/api`
- [ ] **Stripe env vars** if billing or deposits are live:
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_PREMIUM`
  - `FRONTEND_APP_URL=https://clinicaireply.com`
- [ ] **Twilio env vars** if SMS is live:
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
- [ ] **Resend env vars** if email notifications are live:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` or `RESEND_FROM_DOMAIN`
- [ ] **Google Sheets credentials** if sheet sync is live:
  - `GOOGLE_CREDENTIALS_B64` or `GOOGLE_CREDENTIALS_JSON` or `GOOGLE_CREDENTIALS_PATH`
- [ ] **Admin secret** only if protected admin routes are intentionally enabled:
  - `ADMIN_SECRET`
- [ ] **Supabase** — Schema applied, Auth configured:
  - Email/password enabled
  - Site URL = `https://clinicaireply.com`
  - Redirect URLs include `https://clinicaireply.com/auth/callback`
  - `www.clinicaireply.com` redirects to `https://clinicaireply.com`
- [ ] **Migrations applied**:
  - `20260331_add_channel_foundation.sql`
  - `20260331_add_frontdesk_automation.sql`
  - `20260331_add_sms_delivery.sql`
  - `20260331_add_sms_threads.sql`
  - `20260331_add_sms_ai_takeover.sql`
  - `20260402_add_appointment_deposits.sql`
- [ ] **Stripe** — Live mode configured:
  - Live secret key set (`sk_live_...`)
  - Two price IDs created (Professional, Premium)
  - Webhook endpoint added: `https://api.clinicaireply.com/api/billing/webhook`
  - Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Webhook signing secret set
- [ ] **Email** — Resend domain verified, API key set
- [ ] **Google Sheets** (if used) — `GOOGLE_CREDENTIALS_B64` set with base64 JSON
- [ ] **Frontend builds** — `npm run build` succeeds locally with production env vars
- [ ] **No localhost** — Grep for `localhost` in production env vars (should be zero)
- [ ] **Readiness surface reviewed** — Operations → System readiness shows only the expected blocked or partial items

## Deploy

1. Push backend to hosting platform (Railway/Render/Fly.io)
2. Push frontend to Vercel
3. Wait for both to be live
4. Attach `api.clinicaireply.com` to the backend service
5. Attach `clinicaireply.com` to the Vercel frontend
6. Confirm the Vercel project `Root Directory` is `frontend`

## Post-Deploy Verification

### Core Health

- [ ] `GET https://api.clinicaireply.com/api/health` → `{"status": "ok"}`
- [ ] `GET https://api.clinicaireply.com/api/frontdesk/system-readiness` reflects the expected launch configuration
- [ ] Frontend loads at `https://clinicaireply.com` (no blank screen)
- [ ] `/api/docs` returns 404 (disabled in production)

### Auth Flow

- [ ] Register a new test account
- [ ] Verify email received (if enabled)
- [ ] Login works, redirects to dashboard
- [ ] Logout works, redirects to login
- [ ] Repeated failed sign-up attempts show a clear rate-limit or confirmation message and do not leave a fake session behind

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

- [ ] Add `<script src="https://clinicaireply.com/widget.js" data-clinic="YOUR_SLUG"></script>` to a test page
- [ ] Widget appears in bottom-right corner
- [ ] Chat works through the widget

### Billing (Real Money!)

- [ ] `/api/billing/plans` returns 3 plans
- [ ] Billing page shows current plan (trial)
- [ ] Click upgrade → Stripe Checkout opens
- [ ] Complete payment with **real card** (small amount test)
- [ ] Webhook fires → plan updates in dashboard
- [ ] Cancel subscription → downgrade works
- [ ] Deposit request for a booked appointment creates a real checkout link
- [ ] Deposit status remains pending until Stripe confirms payment

### Google Sheets Sync

- [ ] Settings page → test sheet connection
- [ ] New lead syncs to Google Sheet

### Email Notifications

- [ ] New lead triggers email notification

### SMS

- [ ] Inbound SMS reaches the inbox
- [ ] AI/manual thread behavior matches clinic settings
- [ ] Outbound delivery is allowed by Twilio account and carrier rules
- [ ] Twilio inbound webhook points to `https://api.clinicaireply.com/api/frontdesk/communications/twilio/inbound`

## Smoke Script

Run:

```bash
cd backend
CLINIC_AI_BACKEND_URL=https://api.clinicaireply.com/api \
CLINIC_AI_FRONTEND_URL=https://clinicaireply.com \
CLINIC_AI_SMOKE_EMAIL=owner@clinic.com \
CLINIC_AI_SMOKE_PASSWORD='your-password' \
python scripts/launch_readiness_smoke.py
```

Known external limitations to account for:

- Supabase sign-up rate limits can temporarily block repeated registration attempts
- US Twilio delivery can be blocked by trial restrictions, sender registration, or carrier filtering

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
