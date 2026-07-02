# Beta launch checklist

## Pre-deploy

- [ ] Purchase domain (parity.markets or getparity.com)
- [ ] Provision Postgres (Railway/Neon/Supabase)
- [ ] Provision Redis (Railway/Upstash)
- [ ] Set production env vars (see below)
- [ ] Configure Google OAuth credentials with production callback URL
- [ ] Configure Apple OAuth (optional for beta)

## Deploy API (Railway/Fly)

1. Connect repo, set root to `services/api` or use Dockerfile
2. Set environment:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET` (strong random)
   - `WEB_URL` (Vercel URL)
   - `API_URL` (Railway URL)
   - `DEV_AUTH_ENABLED=false`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
3. Run `npx prisma db push` and `npm run db:seed`
4. Promote admin user via seed or DB

## Deploy Web (Vercel)

1. Import repo, set root to `apps/web`
2. Set environment:
   - `NEXT_PUBLIC_API_URL=https://your-api.railway.app/api/v1`
   - `NEXT_PUBLIC_WS_URL=https://your-api.railway.app`

## Post-deploy smoke tests

- [ ] Guest can browse markets and leaderboard
- [ ] OAuth / dev auth disabled in prod
- [ ] Admin can create and publish market
- [ ] User can trade YES/NO
- [ ] Odds update via WebSocket
- [ ] Admin can resolve market
- [ ] Wallet ledger accurate
- [ ] CEO creates launch markets via admin dashboard

## CEO: create launch markets

Sign in as admin → `/admin` → New market → fill question, resolution criteria, category, dates → Create draft → Publish
