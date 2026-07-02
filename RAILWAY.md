# Railway setup (fix DATABASE_URL crash)

Your build is fine. The crash:

```
PrismaClientInitializationError: Environment variable not found: DATABASE_URL
```

means **@parity/api has no database URL in its environment**. Postgres exists in the project but is not linked to the API service.

---

## Fix in 5 minutes

### 1. Add Postgres (if you do not have it)

1. Railway project → **+ New** → **Database** → **PostgreSQL**
2. Wait until it shows **Active**

### 2. Link Postgres to @parity/api

1. Click **@parity/api** (your Nest service, not Postgres)
2. Open **Variables** tab
3. Click **+ New Variable** → **Add Reference** (or **Reference Variable**)
4. Select your **Postgres** service
5. Pick **`DATABASE_URL`**
6. Railway creates a reference like `${{Postgres.DATABASE_URL}}`
7. Click **Deploy** (or wait for auto-redeploy)

### 3. Add the rest of the required variables

On **@parity/api** → **Variables**, add manually:

| Variable | Value |
|----------|--------|
| `JWT_SECRET` | run `openssl rand -hex 32` locally, paste result |
| `PORT` | `4000` |
| `DEV_AUTH_ENABLED` | `false` (or `true` for friends-only beta) |
| `WEB_URL` | your Vercel URL, e.g. `https://parity.vercel.app` |
| `API_URL` | your Railway public URL for the API |
| `REDIS_URL` | reference from Redis plugin, or `redis://...` |

**Redis (optional for Phase 1):** add **+ New** → **Database** → **Redis**, then reference `REDIS_URL` on @parity/api the same way as Postgres.

### 4. Seed the database (once)

After API deploys successfully:

1. @parity/api → **Shell** (or **Connect** terminal)
2. Run:

```bash
cd services/api
npx prisma db push
npm run db:seed
```

3. Admin user: `admin@parity.local` (dev login only if `DEV_AUTH_ENABLED=true`)

### 5. Verify

Open in browser:

```
https://YOUR-API.up.railway.app/api/v1/markets
```

You should see JSON like `{"items":[],"page":1,...}` — not a crash loop.

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Postgres added but vars only on Postgres service | References must be on **@parity/api** |
| Typed `DATABASE_URL` manually wrong | Use **Add Reference** from Postgres service |
| Forgot to redeploy after adding vars | Click **Deploy** on @parity/api |
| `WEB_URL` not set | API starts but browser gets CORS errors from Vercel |

---

## Service layout (correct)

```
Railway project "parity"
├── Postgres          ← database plugin
├── Redis             ← optional plugin  
└── @parity/api       ← your app (variables + deploy here)

Vercel
└── parity (apps/web) ← frontend only
```

Delete **@parity/web** on Railway if it still exists.
