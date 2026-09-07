<?php
/**
 * Configuration Template for Production
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to config.php
 * 2. Update all values with your production settings
 * 3. Do NOT commit config.php to Git (it's in .gitignore)
 */

// Session/cookie hardening and the CSRF + login-throttle helpers.
// MUST be required before session_start() — the cookie flags it sets are
// only honoured while no session is active.
require_once __DIR__ . '/security_bootstrap.php';

// Start session
session_start();

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
define('ENVIRONMENT', 'production'); // Options: development, staging, production

// ============================================
// DATABASE CONFIGURATION
// ============================================
define('DB_SERVER', 'localhost');          // Usually 'localhost' on AWS EC2
define('DB_USERNAME', 'your_db_username'); // MySQL username
define('DB_PASSWORD', 'your_db_password'); // MySQL password (use strong password!)
define('DB_NAME', 'wdbpi_db');            // Database name

// ============================================
// APPLICATION SETTINGS
// ============================================
define('APP_NAME', 'WD BPI Web Report');
define('APP_URL', 'https://your-domain.com'); // Your production URL
define('APP_VERSION', '1.0.0');

// ============================================
// SECURITY SETTINGS
// ============================================
define('SESSION_TIMEOUT', 1800);          // 30 minutes (in seconds)
define('PASSWORD_MIN_LENGTH', 8);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900);        // 15 minutes

// Session Security
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);      // Requires HTTPS
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.gc_maxlifetime', SESSION_TIMEOUT);

// ============================================
// ERROR REPORTING
// ============================================
if (ENVIRONMENT === 'production') {
    // Production: Hide errors, log everything
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/logs/error.log');
} else {
    // Development: Show all errors
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

// ============================================
// FILE UPLOAD SETTINGS
// ============================================
define('MAX_FILE_SIZE', 5242880);         // 5MB in bytes
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif']);
define('UPLOAD_PATH', __DIR__ . '/report_assets/');

// ============================================
// DATABASE CONNECTION
// ============================================
try {
    $conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

    // Set charset to UTF-8
    $conn->set_charset("utf8mb4");

    // Check connection
    if ($conn->connect_error) {
        // Log error instead of displaying
        error_log("Database Connection Failed: " . $conn->connect_error);

        if (ENVIRONMENT === 'production') {
            die("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาติดต่อผู้ดูแลระบบ");
        } else {
            die("Connection failed: " . $conn->connect_error);
        }
    }
} catch (Exception $e) {
    error_log("Database Error: " . $e->getMessage());

    if (ENVIRONMENT === 'production') {
        die("เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง");
    } else {
        die("Error: " . $e->getMessage());
    }
}

// ============================================
// TIMEZONE
// ============================================
date_default_timezone_set('Asia/Bangkok');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize output to prevent XSS
 */
function h($string)
{
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

/**
 * Check if user is logged in
 */
function requireLogin()
{
    if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
        header("location: login.php");
        exit;
    }
}

/**
 * Log security events
 */
function logSecurityEvent($event, $details = '')
{
    $logFile = __DIR__ . '/logs/security.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $user = $_SESSION['username'] ?? 'guest';

    $message = "[$timestamp] IP: $ip | User: $user | Event: $event";
    if ($details) {
        $message .= " | Details: $details";
    }
    $message .= PHP_EOL;

    file_put_contents($logFile, $message, FILE_APPEND);
}

?>