FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared ./packages/shared
COPY services/api ./services/api
RUN npm ci
RUN npm run build -w @parity/shared
RUN npm run build -w @parity/api
RUN cd services/api && npx prisma generate

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/prisma ./services/api/prisma
COPY --from=builder /app/services/api/package.json ./services/api/
ENV NODE_ENV=production
WORKDIR /app/services/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
