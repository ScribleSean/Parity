FROM node:20-alpine AS builder
WORKDIR /app

# Monorepo root manifests
COPY package.json package-lock.json ./

# Only workspaces required for the API image
COPY packages/shared ./packages/shared
COPY services/api ./services/api

# apps/web is in the lockfile workspace graph — stub so npm ci resolves
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --workspace=@parity/shared --workspace=@parity/api
RUN npm run build -w @parity/shared
RUN npm run db:generate -w @parity/api
RUN npm run build -w @parity/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/prisma ./services/api/prisma
COPY --from=builder /app/services/api/package.json ./services/api/package.json

WORKDIR /app/services/api
RUN chmod +x scripts/start.sh
EXPOSE 4000
CMD ["./scripts/start.sh"]
