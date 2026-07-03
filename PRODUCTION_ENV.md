# Production env vars (Parity live)

Use these exact values for your current deploy.

## Vercel (`parity-coral`)

Project → **Settings** → **Environment Variables** → Production **and** Preview:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://parity-api.up.railway.app/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `https://parity-api.up.railway.app` |

No trailing slashes. Must include `/api/v1` on the API URL only.

After saving → **Redeploy** the Vercel project.

---

## Railway (`@parity/api`)

Service → **Variables**:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Reference → Postgres → `DATABASE_URL` |
| `JWT_SECRET` | your random secret (keep existing) |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `DEV_AUTH_ENABLED` | `true` |
| `API_URL` | `https://parity-api.up.railway.app` |
| `WEB_URL` | `https://parity-coral.vercel.app` |

No trailing slashes on `API_URL` or `WEB_URL`.

After saving → **Redeploy** the API.

---

## Test URLs

| What | URL |
|------|-----|
| API markets JSON | https://parity-api.up.railway.app/api/v1/markets |
| Admin login | https://parity-api.up.railway.app/api/v1/auth/dev/login?admin=1 |
| Website | https://parity-coral.vercel.app |

---

## Wrong URLs (404)

| Wrong | Why |
|-------|-----|
| `parityapi-production.up.railway.app` | Old domain — use `parity-api.up.railway.app` |
| `https://parity-api.up.railway.app` (no path) | No route at root — use `/api/v1/...` |
| `NEXT_PUBLIC_API_URL` without `/api/v1` | Web app calls wrong paths |
