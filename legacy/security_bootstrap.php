<?php
/**
 * security_bootstrap.php
 *
 * Hardening that must run BEFORE session_start(). Include this as the very
 * first statement in config.php:
 *
 *     require_once __DIR__ . '/security_bootstrap.php';
 *
 * Production config.php currently calls session_start() with no cookie
 * hardening at all, so session cookies go out without Secure, HttpOnly or
 * SameSite. This file fixes that centrally rather than per-page.
 */

// ─── Session cookie hardening (must precede session_start) ────────────────
if (session_status() === PHP_SESSION_NONE) {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    ini_set('session.cookie_httponly', '1');   // no JS access to the cookie
    ini_set('session.cookie_secure', $https ? '1' : '0');
    ini_set('session.use_strict_mode', '1');   // reject attacker-supplied ids
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_samesite', 'Lax'); // Strict breaks the login redirect
}

// Never render PHP errors to the browser in production.
if (!defined('APP_DEBUG') || !APP_DEBUG) {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('log_errors', '1');
}

// ─── Login throttling ─────────────────────────────────────────────────────
// File-backed so it survives the attacker discarding cookies. Stored outside
// the webroot; the directory is created on first use.

function security_throttle_dir(): string
{
    $dir = getenv('WDBPI_THROTTLE_DIR') ?: (sys_get_temp_dir() . '/wdbpi_throttle');
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function security_client_ip(): string
{
    // Behind nginx on the same host; X-Forwarded-For is set by our own proxy.
    $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($fwd !== '') {
        $first = trim(explode(',', $fwd)[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) {
            return $first;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function security_throttle_file(string $key): string
{
    return security_throttle_dir() . '/' . hash('sha256', $key) . '.json';
}

/**
 * Returns the number of seconds the caller must wait, or 0 if allowed.
 */
function security_login_retry_after(string $key, int $maxAttempts = 10, int $windowSeconds = 900): int
{
    $file = security_throttle_file($key);
    if (!is_file($file)) {
        return 0;
    }
    $data = json_decode((string) @file_get_contents($file), true);
    if (!is_array($data) || !isset($data['count'], $data['first'])) {
        return 0;
    }
    $elapsed = time() - (int) $data['first'];
    if ($elapsed >= $windowSeconds) {
        @unlink($file);
        return 0;
    }
    if ((int) $data['count'] < $maxAttempts) {
        return 0;
    }
    return $windowSeconds - $elapsed;
}

function security_login_record_failure(string $key, int $windowSeconds = 900): void
{
    $file = security_throttle_file($key);
    $data = ['count' => 0, 'first' => time()];
    if (is_file($file)) {
        $existing = json_decode((string) @file_get_contents($file), true);
        if (is_array($existing) && isset($existing['count'], $existing['first'])
            && (time() - (int) $existing['first']) < $windowSeconds) {
            $data = $existing;
        }
    }
    $data['count'] = (int) $data['count'] + 1;
    @file_put_contents($file, json_encode($data), LOCK_EX);
}

function security_login_clear(string $key): void
{
    @unlink(security_throttle_file($key));
}

// ─── CSRF helpers ─────────────────────────────────────────────────────────

function security_csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function security_csrf_check(): bool
{
    return isset($_POST['csrf_token'], $_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], (string) $_POST['csrf_token']);
}

/** Abort a state-changing request that carries no valid CSRF token. */
function security_csrf_require(): void
{
    if (!security_csrf_check()) {
        http_response_code(400);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 'error', 'message' => 'Invalid CSRF token.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
