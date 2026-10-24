FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache bash curl
COPY package.json package-lock.json* turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

FROM base AS dependencies
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps
RUN npx prisma generate

FROM dependencies AS development
ENV NODE_ENV=development
COPY apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npm", "run", "dev"]

FROM dependencies AS builder
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npm run build

FROM node:22-alpine AS production
RUN apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

RUN addgroup -S appuser && adduser -S appuser -G appuser
USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]