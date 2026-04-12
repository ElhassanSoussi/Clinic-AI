# Clinic AI — frontend

Vite + React SPA. Local dev: `pnpm run dev` (port **1201**).

## Deploy (Vercel)

- **Root directory:** `frontend`
- **Framework:** Vite (see `vercel.json` — SPA rewrites to `index.html`)
- **Build:** `pnpm install` + `pnpm run build` → output `dist/`

## Env vars

| Var | When |
|-----|------|
| `NEXT_PUBLIC_API_URL` | **Required** in production (e.g. `https://api.example.com/api`). Dev defaults to `http://127.0.0.1:7001/api` if unset. |
| `NEXT_PUBLIC_SITE_URL` | **Strongly recommended** in production — canonical origin for Stripe returns, Settings chat link, embed snippet. |
| `NEXT_PUBLIC_SUPABASE_*` | Per `.env.example` if the app uses Supabase from the client. |

Never set production hosts to `localhost`.

## Docs

- **Manual smoke + Playwright:** [TESTING.md](./TESTING.md)
- **Vercel operator steps:** [RELEASE.md](./RELEASE.md)
- **Backend + DNS:** [../DEPLOYMENT.md](../DEPLOYMENT.md), [../LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md)
