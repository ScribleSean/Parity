# Parity

Fake-money prediction market platform. Phase 1 web MVP.

## Stack

- **Web:** Next.js 15 (`apps/web`)
- **API:** NestJS + Prisma (`services/api`)
- **Shared:** Zod schemas + LMSR engine (`packages/shared`)
- **Infra:** Postgres 16 + Redis 7 (Docker)

## Quick start

### One-command setup (no Docker required)

```bash
cd /Users/sarackal/parity
npm install
cp services/api/.env.example services/api/.env   # first time only
cp apps/web/.env.local.example apps/web/.env.local

npm run setup    # starts Postgres (Docker or Homebrew), migrates, seeds
npm run dev      # API :4000, Web :3000
```

If `npm run dev` fails with a Turbo workspace error, use:

```bash
npm run dev:apps
```

### Manual setup (Docker)

```bash
docker compose -f infra/docker-compose.yml up -d
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1

## Dev auth

With `DEV_AUTH_ENABLED=true`, use **Dev login** on the sign-in page or visit:
`http://localhost:4000/api/v1/auth/dev/login`

Admin seed user: `admin@parity.local` (run seed)

## Deploy (beta)

See **[DEPLOY.md](./DEPLOY.md)** for Vercel + Railway step-by-step.

- **Web:** Vercel — root `apps/web`, set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- **API:** Railway — root `services/api`, set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `WEB_URL`

## Git

Use lowercase commit messages. Enable the co-author hook:

```bash
git config core.hooksPath scripts/git-hooks
```

Disable **Cursor Settings → Agent → Attribution** so commits stay attributed to you only.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in dev mode |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run db:seed` | Seed admin + demo market |
