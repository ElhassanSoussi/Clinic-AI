# Clinic AI Front Desk

Clinic AI is a SaaS front desk assistant for clinics. The product includes:

- a marketing site and authenticated dashboard built with Next.js
- a FastAPI backend for auth, clinic settings, leads, chat, billing, and events
- Supabase for database/auth
- Stripe for subscriptions
- optional Resend and Google Sheets integrations

## Deployment Target

- Frontend: Vercel
- Backend: Render
- Database/Auth/Storage: Supabase

For full production setup, use [DEPLOYMENT.md](DEPLOYMENT.md). Frontend-only release steps: [frontend/RELEASE.md](frontend/RELEASE.md).

## Repo Structure

```text
Clinic-AI/
├── backend/
│   ├── app/                 # FastAPI application
│   ├── migrations/          # SQL migrations to run in Supabase
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── DEPLOYMENT.md
└── README.md
```

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
./venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 7001
```

API docs are available locally at `http://127.0.0.1:7001/api/docs`.

### Frontend Environment

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev -- -p 1201
```

Frontend runs at `http://localhost:1201`.

## Environment Variables

### Frontend

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

Strongly recommended (production):

- `NEXT_PUBLIC_SITE_URL` — canonical `https://` origin for metadata and Open Graph (see `frontend/src/lib/env.ts`)

Optional:

- `API_INTERNAL_URL` — server-side API base override
- `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH`, `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH`
- Sentry: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`; build-time `SENTRY_AUTH_TOKEN` / org / project for source maps

Details: [frontend/.env.example](frontend/.env.example), [frontend/RELEASE.md](frontend/RELEASE.md).

### Backend Environment

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ENVIRONMENT`
- `CORS_ORIGINS`

Common production variables:

- `FRONTEND_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_PREMIUM`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `GOOGLE_CREDENTIALS_B64`
- `ADMIN_SECRET`

See [frontend/.env.example](frontend/.env.example) and [backend/.env.example](backend/.env.example) for the full expected structure.

## Supabase Setup

1. Create a Supabase project.
2. Run [backend/schema.sql](backend/schema.sql).
3. Run each SQL file in [backend/migrations](backend/migrations) in timestamp order.
4. Copy:
   - project URL
   - anon key
   - service role key
5. Configure Auth providers and redirect URLs before testing OAuth.

## Verification Checklist

- frontend production build passes with `npm run build`
- backend starts with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `GET /api/health` returns `{ "status": "ok" }`
- frontend points to the deployed backend URL through `NEXT_PUBLIC_API_URL`
- backend `CORS_ORIGINS` contains only real frontend domains in production
- production startup fails fast if required deployment env vars are missing

## Notes

- Production docs are disabled automatically when `ENVIRONMENT=production`.
- The frontend intentionally fails clearly in production if critical public env vars are missing.
- The backend validates production CORS and rejects loopback origins in production.
- The widget script is served from the frontend and derives its base URL from the deployed script origin.
