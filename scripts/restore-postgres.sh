#!/bin/sh
# Restore a backup created by backup-postgres.sh into an EMPTY database.
# Usage: ./scripts/restore-postgres.sh /var/backups/wdbpi/wdbpi-YYYYMMDD-HHMMSS.dump.gz
# Env required: DATABASE_URL (must point at the target/empty database)
# WARNING: wipes the target database first (DROP + recreate public schema).
set -eu

FILE="${1:?usage: restore-postgres.sh <backup.dump.gz>}"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "==> restoring $FILE (target WILL BE WIPED)"
printf 'Type YES to continue: '
read -r CONFIRM
[ "$CONFIRM" = "YES" ] || { echo "aborted"; exit 1; }

gunzip -c "$FILE" | pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner

echo "==> restore done - run app smoke test: curl /api/health/ready"
