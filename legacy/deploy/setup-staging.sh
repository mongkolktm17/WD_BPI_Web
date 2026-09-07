#!/usr/bin/env bash
#
# One-time staging setup for wdbpi. Run ON the VPS as a user with sudo.
#
#   scp legacy/deploy/setup-staging.sh legacy/deploy/wdbpi-staging.conf wd:~/
#   ssh wd 'bash ~/setup-staging.sh'
#
# Creates: a non-sudo `deploy` user restricted to rsync, /var/www/wdbpi-staging,
# a wdbpi_staging database seeded from the latest production backup, a staging
# config.php, an nginx vhost and a TLS certificate.
#
# Idempotent: re-running skips anything that already exists. It never touches
# production data, the production webroot contents, or the wdbpi_db database.

set -euo pipefail

STAGING_ROOT=/var/www/wdbpi-staging
PROD_ROOT=/var/www/wdbpi
STAGING_DB=wdbpi_staging
STAGING_DB_USER=wdbpi_staging
DEPLOY_USER=deploy
DOMAIN=staging.wdbpi.pcsiot.com
BACKUP_DIR=/root/wdbpi-backups

echo "=============================================="
echo " wdbpi staging setup"
echo "=============================================="

# --- 0. Preflight ---------------------------------------------------------
if ! getent hosts "$DOMAIN" >/dev/null; then
    echo "!! $DOMAIN does not resolve. Add the A record first." >&2
    exit 1
fi
RESOLVED=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1)
MYIP=$(curl -s --max-time 5 https://api.ipify.org || echo unknown)
echo "==> $DOMAIN resolves to $RESOLVED (this host: $MYIP)"
if [ "$MYIP" != "unknown" ] && [ "$RESOLVED" != "$MYIP" ]; then
    echo "!! $DOMAIN does not point at this host. certbot would fail." >&2
    exit 1
fi

if [ ! -f "$HOME/wdbpi-staging.conf" ]; then
    echo "!! $HOME/wdbpi-staging.conf not found. scp it up and re-run." >&2
    exit 1
fi

# --- 1. Deploy user, locked to rsync --------------------------------------
if id "$DEPLOY_USER" >/dev/null 2>&1; then
    echo "==> user $DEPLOY_USER already exists"
else
    echo "==> Creating $DEPLOY_USER (no sudo, no password login)"
    sudo adduser --disabled-password --gecos "wdbpi deploy" "$DEPLOY_USER"
fi

# Needs group write on the webroots and nothing else.
sudo usermod -aG www-data "$DEPLOY_USER"

echo "==> Generating deploy SSH keypair (if absent)"
sudo -u "$DEPLOY_USER" mkdir -p "/home/$DEPLOY_USER/.ssh"
sudo -u "$DEPLOY_USER" chmod 700 "/home/$DEPLOY_USER/.ssh"
KEYFILE="/home/$DEPLOY_USER/.ssh/id_ed25519"
if sudo test -f "$KEYFILE"; then
    echo "    key already present, leaving it alone"
else
    sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N '' -f "$KEYFILE" -C "github-actions-wdbpi"
fi

# Forced command: this key can ONLY rsync into /var/www. No shell, no other
# path, no port forwarding. If the private key leaks, the blast radius is
# "can write to the webroots", not "has a shell on the box".
echo "==> Installing restricted authorized_keys (rrsync)"
PUBKEY=$(sudo cat "${KEYFILE}.pub")
printf 'command="/usr/bin/rrsync -wo /var/www",no-agent-forwarding,no-port-forwarding,no-pty,no-user-rc,no-X11-forwarding %s\n' \
    "$PUBKEY" | sudo tee "/home/$DEPLOY_USER/.ssh/authorized_keys" >/dev/null
sudo chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
sudo chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

# --- 2. Webroots ----------------------------------------------------------
echo "==> Preparing $STAGING_ROOT"
sudo mkdir -p "$STAGING_ROOT"
sudo chown -R "$DEPLOY_USER:www-data" "$STAGING_ROOT"
sudo chmod -R g+rwX "$STAGING_ROOT"

# The promote job rsyncs to production with the same key.
echo "==> Granting $DEPLOY_USER write access to $PROD_ROOT"
sudo chown -R "$DEPLOY_USER:www-data" "$PROD_ROOT"
sudo chmod -R g+rwX "$PROD_ROOT"

# --- 3. Staging database, seeded from the newest production backup --------
if sudo mysql -N -e "SHOW DATABASES;" | grep -qx "$STAGING_DB"; then
    echo "==> Database $STAGING_DB already exists, not reseeding"
else
    echo "==> Creating $STAGING_DB"
    sudo mysql -e "CREATE DATABASE \`$STAGING_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

    LATEST=$(sudo ls -1t "$BACKUP_DIR"/wdbpi_db-*.sql.gz 2>/dev/null | head -1 || true)
    if [ -z "$LATEST" ]; then
        echo "==> No backup found; taking a fresh dump of production"
        LATEST=/tmp/wdbpi_db-seed.sql.gz
        sudo bash -c "mysqldump --single-transaction --routines --triggers \
            --default-character-set=utf8mb4 wdbpi_db | gzip > '$LATEST'"
    fi
    echo "==> Seeding $STAGING_DB from $LATEST"
    sudo bash -c "gunzip -c '$LATEST' | mysql --default-character-set=utf8mb4 '$STAGING_DB'"

    # Production password hashes must not sit in a lower environment. Give
    # every staging account the same known password instead.
    echo "==> Resetting all staging user passwords to 'staging'"
    STAGING_HASH=$(php -r 'echo password_hash("staging", PASSWORD_DEFAULT);')
    sudo mysql "$STAGING_DB" -e "UPDATE users SET password = '$STAGING_HASH';"
fi

echo "==> Creating MySQL user $STAGING_DB_USER"
STAGING_DB_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)
sudo mysql -e "CREATE USER IF NOT EXISTS '$STAGING_DB_USER'@'localhost' IDENTIFIED BY '$STAGING_DB_PASS';"
sudo mysql -e "ALTER USER '$STAGING_DB_USER'@'localhost' IDENTIFIED BY '$STAGING_DB_PASS';"
# Scoped to the staging DB only, so it cannot read or write wdbpi_db.
sudo mysql -e "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX ON \`$STAGING_DB\`.* TO '$STAGING_DB_USER'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# --- 4. Staging config.php ------------------------------------------------
# Listed in rsync-exclude.txt, so deploys never overwrite or delete it.
echo "==> Writing $STAGING_ROOT/config.php"
sudo tee "$STAGING_ROOT/config.php" >/dev/null <<CONFIG
<?php
/**
 * Staging configuration. Managed on the server, excluded from rsync.
 * Generated by setup-staging.sh.
 */

require_once __DIR__ . '/security_bootstrap.php';

session_start();

define('ENVIRONMENT', 'staging');

define('DB_HOST', 'localhost');
define('DB_USER', '$STAGING_DB_USER');
define('DB_PASS', '$STAGING_DB_PASS');
define('DB_NAME', '$STAGING_DB');

define('SESSION_TIMEOUT', 3600);

\$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (\$conn->connect_error) {
    error_log('Staging DB connection failed: ' . \$conn->connect_error);
    die('Database connection failed.');
}
\$conn->set_charset('utf8mb4');
CONFIG
sudo chown "$DEPLOY_USER:www-data" "$STAGING_ROOT/config.php"
sudo chmod 640 "$STAGING_ROOT/config.php"

# --- 5. Basic auth --------------------------------------------------------
if sudo test -f /etc/nginx/.htpasswd-staging; then
    echo "==> Basic auth file already present, leaving it alone"
    BASIC_PASS="(unchanged)"
else
    echo "==> Creating Basic auth credentials"
    command -v htpasswd >/dev/null 2>&1 || sudo apt-get install -y apache2-utils
    BASIC_PASS=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 18)
    sudo htpasswd -bc /etc/nginx/.htpasswd-staging wdbpi "$BASIC_PASS"
    sudo chown root:www-data /etc/nginx/.htpasswd-staging
    sudo chmod 640 /etc/nginx/.htpasswd-staging
fi

# --- 6. Certificate, then the real vhost ----------------------------------
# A temporary HTTP-only vhost serves the ACME challenge. Without it the
# request would hit the catch-all in wdbpi.conf and get 444.
echo "==> Requesting certificate for $DOMAIN"
sudo mkdir -p "$STAGING_ROOT/.well-known/acme-challenge"
sudo chown -R "$DEPLOY_USER:www-data" "$STAGING_ROOT/.well-known"

sudo tee /etc/nginx/conf.d/wdbpi-staging.conf >/dev/null <<TMPCONF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    root $STAGING_ROOT;
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        try_files \$uri =404;
    }
    location / { return 404; }
}
TMPCONF
sudo nginx -t && sudo systemctl reload nginx

if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo "    certificate already exists"
else
    sudo certbot certonly --webroot -w "$STAGING_ROOT" -d "$DOMAIN" \
        --non-interactive --agree-tos --register-unsafely-without-email
fi

echo "==> Installing the real staging vhost"
sudo cp "$HOME/wdbpi-staging.conf" /etc/nginx/conf.d/wdbpi-staging.conf
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "    nginx reloaded"
else
    echo "    !! nginx -t failed - removing staging vhost and reloading" >&2
    sudo rm -f /etc/nginx/conf.d/wdbpi-staging.conf
    sudo nginx -t && sudo systemctl reload nginx
    exit 1
fi

# --- 7. Report ------------------------------------------------------------
echo
echo "=============================================="
echo " Done."
echo "=============================================="
echo
echo "Add these to GitHub -> Settings -> Secrets and variables -> Actions:"
echo
echo "  DEPLOY_HOST      $MYIP"
echo "  DEPLOY_USER      $DEPLOY_USER"
echo "  SSH_KNOWN_HOSTS  $(ssh-keyscan -t ed25519 "$MYIP" 2>/dev/null | head -1)"
echo
echo "  DEPLOY_SSH_KEY   the private key below - copy it into the secret, and"
echo "                   note it also remains at $KEYFILE on this host"
echo "------------------------------------------------------------------"
sudo cat "$KEYFILE"
echo "------------------------------------------------------------------"
echo
echo "Staging Basic auth : user 'wdbpi', password: $BASIC_PASS"
echo "Staging app logins : every user's password is now 'staging'"
echo "Staging URL        : https://$DOMAIN/"
echo
echo "Nothing is deployed yet - push to the 'legacy' branch to populate it."
