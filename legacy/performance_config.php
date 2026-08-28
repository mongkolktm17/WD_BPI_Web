<?php
/**
 * Performance Configuration
 * 
 * Additional performance settings for the application
 * Include this file after config.php
 */

// ============================================================================
// OUTPUT BUFFERING & COMPRESSION
// ============================================================================

// Enable output buffering with gzip compression
if (!ob_start("ob_gzhandler")) {
    ob_start();
}

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================

// Session timeout (1 hour)
$session_timeout = 3600;

// Check for session timeout
if (
    isset($_SESSION['last_activity']) &&
    (time() - $_SESSION['last_activity'] > $session_timeout)
) {
    session_destroy();
    if (basename($_SERVER['PHP_SELF']) !== 'login.php') {
        header("location: login.php?timeout=1");
        exit;
    }
}

// Update last activity time
$_SESSION['last_activity'] = time();

// ============================================================================
// SECURITY HEADERS
// ============================================================================

// Only set headers if not already set by .htaccess
if (!headers_sent()) {
    // Prevent clickjacking
    header("X-Frame-Options: SAMEORIGIN");

    // XSS Protection
    header("X-XSS-Protection: 1; mode=block");

    // Prevent MIME type sniffing
    header("X-Content-Type-Options: nosniff");

    // Referrer Policy
    header("Referrer-Policy: strict-origin-when-cross-origin");

    // Content Security Policy (adjust as needed)
    // header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:;");
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Determine if we're in production or development
$is_production = !in_array($_SERVER['SERVER_NAME'], ['localhost', '127.0.0.1', '::1']);

if ($is_production) {
    // Production: Hide errors from users
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
    error_reporting(E_ALL);

    // Log errors to file
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/logs/php_errors.log');
} else {
    // Development: Show errors
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

// ============================================================================
// DATABASE QUERY CACHING (using APCu if available)
// ============================================================================

/**
 * Cache a database query result
 * 
 * @param string $key Cache key
 * @param mixed $data Data to cache
 * @param int $ttl Time to live in seconds (default: 300 = 5 minutes)
 * @return bool Success status
 */
function cache_set($key, $data, $ttl = 300)
{
    if (function_exists('apcu_store')) {
        return apcu_store($key, $data, $ttl);
    }
    return false;
}

/**
 * Get cached data
 * 
 * @param string $key Cache key
 * @return mixed Cached data or false if not found
 */
function cache_get($key)
{
    if (function_exists('apcu_fetch')) {
        return apcu_fetch($key);
    }
    return false;
}

/**
 * Delete cached data
 * 
 * @param string $key Cache key
 * @return bool Success status
 */
function cache_delete($key)
{
    if (function_exists('apcu_delete')) {
        return apcu_delete($key);
    }
    return false;
}

/**
 * Clear all cache
 * 
 * @return bool Success status
 */
function cache_clear()
{
    if (function_exists('apcu_clear_cache')) {
        return apcu_clear_cache();
    }
    return false;
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Track page load time
if (!isset($_SERVER['REQUEST_TIME_FLOAT'])) {
    $_SERVER['REQUEST_TIME_FLOAT'] = microtime(true);
}

/**
 * Get page execution time
 * 
 * @return float Execution time in seconds
 */
function get_execution_time()
{
    return microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'];
}

/**
 * Get memory usage
 * 
 * @param bool $peak Get peak memory usage
 * @return string Formatted memory usage
 */
function get_memory_usage($peak = false)
{
    $bytes = $peak ? memory_get_peak_usage(true) : memory_get_usage(true);
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = floor(log($bytes, 1024));
    return round($bytes / pow(1024, $i), 2) . ' ' . $units[$i];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize output for HTML
 * 
 * @param string $string String to sanitize
 * @return string Sanitized string
 */
function h($string)
{
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

/**
 * Generate CSRF token
 * 
 * @return string CSRF token
 */
function generate_csrf_token()
{
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token
 * 
 * @param string $token Token to verify
 * @return bool Verification result
 */
function verify_csrf_token($token)
{
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Redirect with message
 * 
 * @param string $url URL to redirect to
 * @param string $message Message to display
 * @param string $type Message type (success, error, info)
 */
function redirect_with_message($url, $message, $type = 'info')
{
    $_SESSION['flash_message'] = $message;
    $_SESSION['flash_type'] = $type;
    header("Location: $url");
    exit;
}

/**
 * Get and clear flash message
 * 
 * @return array|null Flash message data
 */
function get_flash_message()
{
    if (isset($_SESSION['flash_message'])) {
        $message = [
            'message' => $_SESSION['flash_message'],
            'type' => $_SESSION['flash_type'] ?? 'info'
        ];
        unset($_SESSION['flash_message']);
        unset($_SESSION['flash_type']);
        return $message;
    }
    return null;
}

// ============================================================================
// PERFORMANCE TIPS
// ============================================================================

/*
 * USAGE EXAMPLES:
 * 
 * 1. Cache a query result:
 *    $cache_key = 'dashboard_stats_' . date('Y-m-d-H');
 *    $stats = cache_get($cache_key);
 *    if ($stats === false) {
 *        $stats = fetch_dashboard_stats($conn);
 *        cache_set($cache_key, $stats, 300); // Cache for 5 minutes
 *    }
 * 
 * 2. Use CSRF protection:
 *    // In form:
 *    <input type="hidden" name="csrf_token" value="<?php echo generate_csrf_token(); ?>">
 *    
 *    // On submit:
 *    if (!verify_csrf_token($_POST['csrf_token'])) {
 *        die('CSRF token validation failed');
 *    }
 * 
 * 3. Monitor performance:
 *    // At end of page:
 *    echo "<!-- Page generated in " . get_execution_time() . " seconds -->";
 *    echo "<!-- Memory usage: " . get_memory_usage() . " -->";
 */
?>