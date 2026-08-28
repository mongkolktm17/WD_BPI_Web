FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache bash curl
COPY package.json package-lock.json* turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

FROM base AS dependencies
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps
RUN npx prisma generate

FROM dependencies AS development
ENV NODE_ENV=development
COPY apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM node:22-alpine AS production
RUN apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/.next/static ./.next/static

RUN addgroup -S appuser && adduser -S appuser -G appuser
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

STOPSIGNAL SIGTERM

CMD ["node", "apps/web/server.js"]
