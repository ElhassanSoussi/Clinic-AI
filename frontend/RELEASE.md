# Frontend release & deployment (Vercel)

Operator-focused steps for shipping the Next.js app. For full-stack context see [../DEPLOYMENT.md](../DEPLOYMENT.md) and [../LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md).

## 1. Vercel project

| Setting | Value |
|--------|--------|
| Root Directory | `frontend` |
| Framework | Vite (SPA) |
| Build Command | `npm run build` → `dist/` |
| Output | `dist` (static); configure SPA fallback to `index.html` |

If the build looks for Python/FastAPI, the root directory is wrong.

## 2. Environment variables

Copy [`.env.example`](.env.example) as a checklist. Summary:

**Required everywhere**

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `NEXT_PUBLIC_API_URL` — backend API base (must end with `/api`, e.g. `https://api.clinicaireply.com/api`)

**Strongly recommended for production**

- `NEXT_PUBLIC_SITE_URL` — public https origin, e.g. `https://clinicaireply.com`  
  - Without it on Vercel, metadata/Open Graph use `https://${VERCEL_URL}` (fine for previews; production should set the real marketing domain).
  - Resolution order is documented in `src/lib/env.ts` (`getSiteMetadataBaseUrl`).

**Optional**

- `API_INTERNAL_URL` — if server-side calls must use a different base than the browser
- `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH` / `NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH` — hide or show provider buttons (defaults true; align with Supabase provider setup)
- Sentry: `NEXT_PUBLIC_SENTRY_DSN`, optional `SENTRY_DSN` for server, optional `NEXT_PUBLIC_VERCEL_ENV` for client environment tags

**CI / source maps (optional)**

- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — see [Sentry Next.js source maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

**Preview vs production**

- Vercel sets `VERCEL_URL` and `VERCEL_ENV` automatically (server/edge).
- Previews should point `NEXT_PUBLIC_API_URL` at a backend that is safe for that preview (staging or shared dev API — not production unless intentional).
- Production `NEXT_PUBLIC_API_URL` must match the live API; backend `CORS_ORIGINS` must include the production frontend origin.

## 3. Before merge / before promote

```bash
cd frontend
npm run lint
npm run build
npm run e2e
```

`e2e` runs smoke + critical routes (no full login journey). For authenticated E2E, configure `frontend/.env.e2e` and run `npm run e2e:auth` — see [TESTING.md](./TESTING.md).

Use real-shaped values in `.env.local` for a local production build when validating.

## 4. After deploy (frontend smoke)

1. Open the deployment URL (preview or production).
2. Hard refresh; confirm no blank root layout.
3. **Marketing** — `/` loads; “Try live demo” goes to `/chat/demo` (public chat slug `demo`).
4. **Auth** — `/login`, `/register` render; sign-in with a test account if backend is live.
5. **API** — dashboard data loads (network tab: API calls succeed, not CORS errors).
6. **Observability** — if Sentry is configured, trigger a test error in a safe environment and confirm the event (optional).

## 5. Domains

- Primary: apex `clinicaireply.com` (example — substitute your domain).
- `www` should redirect to apex (see `src/proxy.ts` / Vercel redirects).
- Set `NEXT_PUBLIC_SITE_URL` on **production** to the canonical https URL.

## 6. Rollback

In Vercel: **Deployments** → select last known good deployment → **Promote to Production** (or redeploy that git ref).

## 7. Stripe / billing from the browser

Checkout and Customer Portal are driven by the **backend** API; the frontend does **not** use `NEXT_PUBLIC_STRIPE_*`. Ensure production backend Stripe and `FRONTEND_APP_URL` are set per [DEPLOYMENT.md](../DEPLOYMENT.md).

## 8. Widget and embed

- Script URL: `{YOUR_FRONTEND_ORIGIN}/widget.js`
- Demo chat path: `/chat/demo` (same app, dynamic `[slug]` route).
