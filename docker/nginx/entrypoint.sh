#!/bin/sh
# nginx entrypoint for prod.
# Picks full HTTPS config when a cert exists, otherwise HTTP-only bootstrap
# config so the first `certbot certonly --webroot` can succeed.
# Requires: DOMAIN env (e.g. DOMAIN=security.example.com)
set -eu

DOMAIN="${DOMAIN:?DOMAIN is required (e.g. DOMAIN=security.example.com)}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

mkdir -p /etc/nginx/conf.d /var/www/certbot

export DOMAIN
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
  echo "[entrypoint] Cert found for ${DOMAIN} - using HTTPS config."
  envsubst '${DOMAIN}' < /etc/nginx/templates/prod.https.conf > /etc/nginx/conf.d/default.conf
else
  echo "[entrypoint] No cert for ${DOMAIN} yet - using HTTP bootstrap config."
  echo "[entrypoint] After DNS points here, run:"
  echo "  docker compose -f docker-compose.prod.yml run --rm certbot \\"
  echo "    certonly --webroot -w /var/www/certbot -d ${DOMAIN} --agree-tos -m admin@${DOMAIN}"
  echo "[entrypoint] Then: docker compose -f docker-compose.prod.yml restart nginx"
  envsubst '${DOMAIN}' < /etc/nginx/templates/prod.bootstrap.conf > /etc/nginx/conf.d/default.conf
fi

nginx -t
exec nginx -g 'daemon off;'
