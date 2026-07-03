#!/bin/sh
set -e

cd /app/services/api

echo "[parity] checking database..."
if [ -z "$DATABASE_URL" ]; then
  echo "[parity] ERROR: DATABASE_URL is not set."
  echo "[parity] Railway: @parity/api → Variables → Add Reference → Postgres → DATABASE_URL"
  exit 1
fi

echo "[parity] applying schema (prisma db push)..."
/app/node_modules/.bin/prisma db push --skip-generate

echo "[parity] seeding if needed..."
/app/node_modules/.bin/tsx prisma/seed.ts || echo "[parity] seed skipped or already done"

echo "[parity] starting api..."
exec node dist/main.js
