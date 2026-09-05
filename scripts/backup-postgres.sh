#!/bin/sh
# Daily PostgreSQL backup (custom format + gzip).
# Usage: BACKUP_DIR=/var/backups/wdbpi RETENTION_DAYS=14 ./scripts/backup-postgres.sh
# Recommended: cron daily 02:00 + offsite copy (see docs/prod-runbook.md).
# Env required: DATABASE_URL (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE)
set -eu

BACKUP_DIR="${BACKUP_DIR:-/var/backups/wdbpi}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/wdbpi-$STAMP.dump.gz"

echo "==> pg_dump -> $OUT"
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump --dbname="$DATABASE_URL" --format=custom --compress=9 | gzip > "$OUT"
else
  pg_dump --format=custom --compress=9 | gzip > "$OUT"
fi

echo "==> verify dump"
gzip -t "$OUT"
ls -lh "$OUT"

echo "==> prune backups older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'wdbpi-*.dump.gz' -mtime +"$RETENTION_DAYS" -delete

echo "==> done: $OUT"
