#!/usr/bin/env sh
#
# Syntax-checks the nginx vhosts inside an nginx container.
#
#   docker run --rm -v "$PWD/legacy/deploy:/cfg:ro" \
#     -v "$PWD/legacy/deploy/scripts/check-nginx-configs.sh:/check.sh:ro" \
#     nginx:1.24-alpine sh /check.sh
#
# `nginx -t` genuinely opens the files a config references, so a bare image
# fails on the Debian fastcgi snippet and the TLS certificates long before it
# reaches anything we wrote. Those get stubbed here so the check exercises our
# actual directives - the deny regexes, ssl_reject_handshake, the location
# ordering - rather than the container's missing furniture.

set -e

apk add --no-cache openssl >/dev/null 2>&1

mkdir -p /etc/nginx/snippets
cat > /etc/nginx/snippets/fastcgi-php.conf <<'EOF'
fastcgi_split_path_info ^(.+?\.php)(/.*)$;
try_files $fastcgi_script_name =404;
set $path_info $fastcgi_path_info;
fastcgi_param PATH_INFO $path_info;
fastcgi_index index.php;
include fastcgi.conf;
EOF

for d in wdbpi.pcsiot.com staging.wdbpi.pcsiot.com; do
    mkdir -p "/etc/letsencrypt/live/$d"
    openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$d" \
        -keyout "/etc/letsencrypt/live/$d/privkey.pem" \
        -out    "/etc/letsencrypt/live/$d/fullchain.pem" 2>/dev/null
done

touch /etc/nginx/.htpasswd-staging

rc=0
for f in /cfg/wdbpi.conf /cfg/wdbpi-staging.conf; do
    cp "$f" /etc/nginx/conf.d/check.conf
    if nginx -t 2>/tmp/err; then
        echo "  OK     $(basename "$f")"
    else
        echo "  FAILED $(basename "$f")"
        sed 's/^/         /' /tmp/err
        rc=1
    fi
    rm -f /etc/nginx/conf.d/check.conf
done

exit $rc
