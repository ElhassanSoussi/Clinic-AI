# Frontend

This folder contains the Next.js application for Clinic AI.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev -- -p 1201
```

## Production deployment

- Platform: Vercel
- Root directory: `frontend`
- Build command: `npm run build`

**Release checklist (env, domains, smoke):** [RELEASE.md](RELEASE.md).  
Full stack: [../README.md](../README.md), [../DEPLOYMENT.md](../DEPLOYMENT.md).

### Verify before shipping

```bash
npm run lint
npm run build
npm run e2e
```
