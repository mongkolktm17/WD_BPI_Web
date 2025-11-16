<?php
/*
 * config.php
 *
 * This file contains the database configuration and session initialization.
 */

// Start the session if it's not already started.
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// --- Database Configuration ---
define('DB_SERVER', 'fdb1034.awardspace.net');
define('DB_USERNAME', '4707317_wdbpi');
define('DB_PASSWORD', '!QFsIzjv6prlaLZM');
define('DB_NAME', '4707317_wdbpi');
define('DB_PORT', '3306');

// --- Database Connection ---
$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT);

// Check the connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Set character set to utf8mb4 for full Unicode support
if (!$conn->set_charset("utf8mb4")) {
    // In a real app, you would log this error.
    // For now, we can output a generic error.
    die("Error loading character set utf8mb4: " . $conn->error);
}
?>