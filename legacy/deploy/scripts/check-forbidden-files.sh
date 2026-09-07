#!/usr/bin/env bash
#
# Fails the build if a known-dangerous script reappears in legacy/.
#
# An rsync --exclude list is silent when it drifts: add a file, forget the
# exclude, and it ships. This turns that into a red build instead. Every name
# below was reachable unauthenticated in production until 2026-09-07;
# reset_admin_password.php set the admin password to a known value on an
# unauthenticated GET.

set -euo pipefail

ROOT="${1:-legacy}"

FORBIDDEN=(
    reset.php
    reset_admin_password.php
    reset_officers.php
    setup.php
    run_migration.php
    add_soft_delete_columns.php
    optimize_database.php
    update_parking_db.php
    update_usernames.php
    update_csv_usernames.php
    update_b9_slots_production.php
    cleanup_files.php
    get_schema.php
    dashboard_new.php
    compare_parking.php
    test_stats.php
    test_stats_v2.php
)

echo "==> Checking $ROOT for forbidden files"
found=0
for name in "${FORBIDDEN[@]}"; do
    while IFS= read -r hit; do
        echo "    FORBIDDEN: $hit"
        found=1
    done < <(find "$ROOT" -type f -name "$name" \
                 -not -path "*/Backup/*" -not -path "*/unuse/*" 2>/dev/null)
done

# Config with real credentials must never be committed.
while IFS= read -r hit; do
    echo "    FORBIDDEN (credentials): $hit"
    found=1
done < <(find "$ROOT" -maxdepth 1 -type f -name 'config.php' 2>/dev/null)

# SQL dumps outside the archive directories.
while IFS= read -r hit; do
    echo "    FORBIDDEN (sql dump): $hit"
    found=1
done < <(find "$ROOT" -maxdepth 1 -type f \( -name '*.sql' -o -name '*.sql.gz' \) 2>/dev/null)

if [ "$found" -ne 0 ]; then
    echo
    echo "These files must not exist in $ROOT. They were removed from production"
    echo "on 2026-09-07 because they were reachable without authentication."
    echo "If one is genuinely needed, gate it behind check_permissions.php and"
    echo "remove it from the FORBIDDEN list in this script deliberately."
    exit 1
fi

echo "    none found"
