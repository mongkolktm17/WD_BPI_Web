#!/usr/bin/env bash
#
# Production hardening for wdbpi.pcsiot.com. Run ON the VPS as a user with sudo.
#
#   scp legacy/deploy/harden-production.sh wd:~/
#   ssh wd 'bash ~/harden-production.sh'
#
# Everything is quarantined to a timestamped directory outside the webroot
# rather than deleted, so any step can be undone. Nothing here touches the
# database schema or application data.

set -euo pipefail

WEBROOT=/var/www/wdbpi
STAMP=$(date +%Y%m%d-%H%M%S)
QUARANTINE="/root/wdbpi-quarantine-$STAMP"
BACKUP_DIR="/root/wdbpi-backups"

echo "==> Quarantine: $QUARANTINE"
sudo mkdir -p "$QUARANTINE"
sudo mkdir -p "$BACKUP_DIR"

# ─── 0. Database backup first ─────────────────────────────────────────────
# There is currently no backup automation on this host at all.
echo "==> Backing up wdbpi_db before touching anything"
sudo mysqldump --single-transaction --routines --triggers \
    --default-character-set=utf8mb4 wdbpi_db \
    | gzip > "/tmp/wdbpi_db-$STAMP.sql.gz"
sudo mv "/tmp/wdbpi_db-$STAMP.sql.gz" "$BACKUP_DIR/"
echo "    saved: $BACKUP_DIR/wdbpi_db-$STAMP.sql.gz"

# ─── 1. Unauthenticated maintenance scripts ───────────────────────────────
# All of these are reachable over HTTPS with no session check. Most connect
# with real production credentials via config.php.
#
# reset_admin_password.php is the critical one: an unauthenticated GET sets
# the admin password to a known value and prints the hash.
# Every entry below was verified as: no auth gate, no inbound reference from
# any page or JS, and no HTTP hits in the retained nginx logs.
#
# Deliberately NOT listed (checked and kept):
#   import_officers.php        - admin page, check_permissions + CSRF. In use.
#   sync_officers_from_csv.php - admin page, check_permissions + CSRF. In use.
#   save_cctv_report.php       - live endpoint (cctv_angle_check.php:780);
#                                fixed by adding an auth gate instead.
#   import_camera_names.php    - real feature; fixed with an admin gate plus a
#                                confirmation step before it truncates.
#   save_angle_check.php       - already has an auth gate.
DANGEROUS=(
    reset_admin_password.php     # sets admin password to admin123, no auth
    setup.php                    # creates tables + seeds default admin
    run_migration.php            # one-off UPDATEs, already applied
    add_soft_delete_columns.php  # ALTERs tables (also has a syntax error)
    optimize_database.php        # OPTIMIZE TABLE
    update_parking_db.php
    reset_officers.php
    update_usernames.php
    update_csv_usernames.php
    update_b9_slots_production.php
    cleanup_files.php            # renames files in the webroot, NO auth gate
    reset.php                    # drops tables; targets a DB that no longer
                                 # exists, so it currently fails at connect
    get_schema.php               # CLI-only ($argv), useless over HTTP
    dashboard_new.php            # stale duplicate of dashboard.php
)

echo "==> Quarantining unauthenticated maintenance scripts"
for f in "${DANGEROUS[@]}"; do
    if [ -f "$WEBROOT/$f" ]; then
        sudo mv "$WEBROOT/$f" "$QUARANTINE/"
        echo "    moved: $f"
    fi
done

# ─── 2. Dotfiles sitting inside the webroot ───────────────────────────────
# .ssh, .bash_history, .mysql_history and .gnupg are currently inside the
# document root. nginx's `location ~ /\.` rule blocks them today, so this is
# not presently exposed — but it is one config edit away from serving SSH keys.
echo "==> Quarantining dotfiles from the webroot"
for f in .ssh .bash_history .mysql_history .gnupg .config .cache .viminfo \
         .bashrc .profile .bash_logout .sudo_as_admin_successful; do
    if [ -e "$WEBROOT/$f" ]; then
        sudo mv "$WEBROOT/$f" "$QUARANTINE/"
        echo "    moved: $f"
    fi
done

# ─── 3. Stale duplicate JS ────────────────────────────────────────────────
# dashboard.php loads public/js/dashboard-all.js; the other two copies are
# stale and only add confusion about which file is live.
for f in dashboard-all.js public/dashboard-all.js; do
    if [ -f "$WEBROOT/$f" ]; then
        sudo mv "$WEBROOT/$f" "$QUARANTINE/"
        echo "    moved stale copy: $f"
    fi
done

# ─── 4. nginx config ──────────────────────────────────────────────────────
# Moves the site from the Debian sites-available/sites-enabled symlink pair to
# conf.d/, which is what upstream nginx and containers use. Both must not be
# active at once: nginx.conf includes conf.d/*.conf AND sites-enabled/*, so
# leaving both in place loads the server block twice ("conflicting server
# name" warnings, second one ignored).
if [ -f "$HOME/wdbpi.conf" ]; then
    echo "==> Installing hardened nginx config to conf.d/"

    # Preserve whatever is live today so this is reversible.
    if [ -f /etc/nginx/sites-available/wdbpi ]; then
        sudo cp /etc/nginx/sites-available/wdbpi "$QUARANTINE/nginx-wdbpi.sites-available.previous"
    fi

    sudo cp "$HOME/wdbpi.conf" /etc/nginx/conf.d/wdbpi.conf
    # Drop the old symlink so the block is not defined twice.
    sudo rm -f /etc/nginx/sites-enabled/wdbpi

    # Remove the stock default site. wdbpi.conf now declares the catch-all
    # default_server itself; leaving `default` in place would collide on
    # [::]:80 (duplicate default_server) and nginx would refuse to start.
    DEFAULT_WAS_ENABLED=0
    if [ -L /etc/nginx/sites-enabled/default ] || [ -f /etc/nginx/sites-enabled/default ]; then
        DEFAULT_WAS_ENABLED=1
        sudo rm -f /etc/nginx/sites-enabled/default
        echo "    unlinked stock default site"
    fi

    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "    nginx reloaded; site now served from /etc/nginx/conf.d/wdbpi.conf"
        echo "    unmatched hosts now get 444 (HTTP) / TLS handshake reject (HTTPS)"
        echo "    (originals still at /etc/nginx/sites-available/, just unlinked)"
    else
        echo "    !! nginx -t FAILED - rolling back"
        sudo rm -f /etc/nginx/conf.d/wdbpi.conf
        sudo ln -sf /etc/nginx/sites-available/wdbpi /etc/nginx/sites-enabled/wdbpi
        if [ "$DEFAULT_WAS_ENABLED" = "1" ]; then
            sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
        fi
        sudo nginx -t && sudo systemctl reload nginx
        exit 1
    fi
else
    echo "==> Skipping nginx (upload wdbpi.conf to \$HOME first)"
fi

echo
echo "==> Done. Quarantined to $QUARANTINE"
echo "    Undo any item with: sudo mv $QUARANTINE/<file> $WEBROOT/"
echo
echo "    Still to do by hand:"
echo "      - Add 'require_once __DIR__ . \"/security_bootstrap.php\";' as the"
echo "        FIRST line of $WEBROOT/config.php, before session_start()."
echo "      - Deploy the updated login.php, update_profile.php,"
echo "        save_cctv_report.php, import_camera_names.php,"
echo "        security_bootstrap.php and public/js/dashboard-all.js."
echo "      - Rotate the admin password (reset_admin_password.php was public)."
echo "      - Schedule this backup step in cron; there is no backup job today."
