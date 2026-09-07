#!/usr/bin/env bash
#
# Post-deploy smoke test.
#
#   smoke-test.sh https://staging.wdbpi.pcsiot.com [user:pass]
#
# Verifies the deploy did not break the app and did not reintroduce anything
# that should be blocked. Exits non-zero on the first failure so the workflow
# surfaces it rather than reporting a green deploy over a broken site.

set -uo pipefail

BASE="${1:?usage: smoke-test.sh <base-url> [basic-auth-user:pass]}"
BASIC="${2:-}"

CURL=(curl -sS --max-time 15 -o /dev/null)
[ -n "$BASIC" ] && CURL+=(-u "$BASIC")

fails=0

# expect <description> <expected-code> <path>
expect() {
    local desc="$1" want="$2" path="$3"
    local got
    got=$("${CURL[@]}" -w '%{http_code}' "$BASE$path" 2>/dev/null || echo 000)
    if [ "$got" = "$want" ]; then
        printf '  ok    %-46s %s\n' "$desc" "$got"
    else
        printf '  FAIL  %-46s got %s, want %s\n' "$desc" "$got" "$want"
        fails=$((fails + 1))
    fi
}

echo "==> Smoke testing $BASE"

# The app is up and serving PHP, not a 500 from a syntax error or a bad config.
expect "login page renders"            200 /login.php
expect "index redirects to login"      302 /index.php

# Files the hardening removed must stay gone. If a deploy reintroduced one,
# nginx should still deny it - this checks both layers at once.
expect "reset_admin_password.php blocked" 404 /reset_admin_password.php
expect "setup.php blocked"                404 /setup.php
expect "run_migration.php blocked"        404 /run_migration.php
expect "config.php blocked"               404 /config.php

# Admin pages that are legitimately in use must still be reachable. They
# redirect to login when unauthenticated, which is the correct behaviour.
expect "import_officers.php reachable"    302 /import_officers.php
expect "manage_officers.php reachable"    302 /manage_officers.php

# Dotfiles and dumps must never be served.
expect "dotfile blocked"                  404 /.bash_history
expect "sql dump blocked"                 404 /wddump.sql

# A PHP fatal renders as a 200 with an error string, so check the body too.
body=$(curl -sS --max-time 15 ${BASIC:+-u "$BASIC"} "$BASE/login.php" 2>/dev/null || true)
if printf '%s' "$body" | grep -qiE 'fatal error|parse error|uncaught exception'; then
    echo "  FAIL  login.php contains a PHP error"
    fails=$((fails + 1))
else
    echo "  ok    login.php has no PHP errors in output"
fi

echo
if [ "$fails" -ne 0 ]; then
    echo "$fails check(s) failed."
    exit 1
fi
echo "All checks passed."
