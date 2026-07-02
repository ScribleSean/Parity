# Deploy Parity to production (Phase 1 beta)

Phase 1 is **web + API**. Mobile is Phase 2. You can ship a live beta with fake-money trading before Phase 1.5/2 polish.

## Architecture

| Service | Host | Notes |
|---------|------|-------|
| Web (`apps/web`) | **Vercel** | Next.js 15, static + SSR |
| API (`services/api`) | **Railway** or **Fly.io** | NestJS, Postgres, Redis |
| Database | **Neon**, **Supabase**, or Railway Postgres | Same connection string as API |
| Redis | **Upstash** or Railway Redis | Required for jobs / realtime scaling |

---

## Step 1 — Database & Redis

1. Create a **Postgres 16** database. Copy `DATABASE_URL`.
2. Create **Redis**. Copy `REDIS_URL` (e.g. `rediss://...` for Upstash).
3. Keep credentials out of git.

---

## Step 2 — Deploy API (Railway)

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → select `Parity`.
2. Set **Root Directory** to `services/api`.
3. Railway will use `Dockerfile` + `railway.toml`.
4. Add **environment variables**:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<openssl rand -hex 32>
WEB_URL=https://your-app.vercel.app
API_URL=https://your-api.up.railway.app
DEV_AUTH_ENABLED=false
PORT=4000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

5. After first deploy, open Railway **Shell** or run locally against prod DB:

```bash
cd services/api
npx prisma db push
npm run db:seed
```

6. Note your public API URL, e.g. `https://parity-api-production.up.railway.app`.

**Health check:** `GET https://your-api.../api/v1/markets` should return JSON.

---

## Step 3 — Deploy Web (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → import `ScribleSean/Parity`.
2. **Root Directory:** `apps/web`
3. Framework: **Next.js** (auto-detected). `vercel.json` handles monorepo install/build.
4. **Environment variables** (Production):

```env
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=https://your-api.up.railway.app
```

5. Deploy. Copy the Vercel URL (e.g. `https://parity.vercel.app`).
6. Go back to Railway and set `WEB_URL` to that exact URL (no trailing slash). Redeploy API so CORS allows your frontend.

---

## Step 4 — OAuth (optional for beta)

- **Google:** Console → OAuth client → authorized redirect:  
  `https://your-api.../api/v1/auth/google/callback`
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the API.
- For a friends-only beta, you can temporarily keep `DEV_AUTH_ENABLED=true` **only** if you accept the security risk — not recommended for public URL.

---

## Step 5 — Smoke test before sharing

- [ ] Landing and markets load on Vercel URL
- [ ] Sign in works (OAuth or dev login if enabled)
- [ ] Trade YES/NO — balance updates
- [ ] Admin `/admin` — create draft market → publish
- [ ] WebSocket odds update on market page (check browser network WS)
- [ ] Resolve market — winners paid in Notional

---

## Git — commit style & Cursor attribution

**Commit messages:** all lowercase, high-level summary of what changed.

```bash
git config core.hooksPath scripts/git-hooks
```

The `prepare-commit-msg` hook strips `Co-authored-by: Cursor` lines. Also disable **Cursor Settings → Agent → Attribution**.

---

## What ships in Phase 1 vs later

| Phase 1 (now) | Phase 1.5 / 2 |
|---------------|----------------|
| Web markets, trade, wallet, portfolio | Mobile app (Expo) |
| LMSR AMM | Order book |
| Google/Apple OAuth + dev login | Email auth, ad refills |
| Admin market CRUD + resolve | Premium, advanced analytics |
| Leaderboard | Production hardening, domains |

You do **not** need Phase 2 to go live for a closed beta. Ship Phase 1 when smoke tests pass, create 3–5 launch markets as admin, invite testers.

---

## Custom domain (when ready)

- **Vercel:** Project → Domains → add `parity.yourdomain.com`
- **API:** Railway → Settings → Custom Domain → `api.yourdomain.com`
- Update `WEB_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, and OAuth redirect URLs.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | `WEB_URL` on API must exactly match Vercel URL |
| WebSocket fails | Use `wss://` via `NEXT_PUBLIC_WS_URL` (same host as API) |
| CI test glob error | Fixed — tests use explicit file paths |
| Build fails on Vercel | Ensure Root Directory is `apps/web`; build runs from monorepo root |

See also `BETA.md` for CEO launch checklist.
