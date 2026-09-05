#!/bin/sh
# Production migration runner: apply Prisma migrations, then idempotent seed.
# Usage (on the prod host, with prod .env loaded):
#   ./scripts/migrate-prod.sh
# Env required: DATABASE_URL
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "==> seed roles (idempotent)"
npx ts-node prisma/seed.ts

echo "==> done"
