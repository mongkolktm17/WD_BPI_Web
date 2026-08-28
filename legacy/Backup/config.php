<?php
/*
Database Configuration for Production and Local Environments

This file contains the database connection settings,
dynamically adjusted for local development and production deployment.
*/

// --- Session Management ---
// Start the session if it's not already started.
// This is necessary for managing user login state.
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// --- Environment Detection ---
// Determine if the application is running on a local development server.
$isLocal = (
    $_SERVER['HTTP_HOST'] === 'localhost' ||
    $_SERVER['HTTP_HOST'] === '127.0.0.1' ||
    strpos($_SERVER['HTTP_HOST'], '192.168.') === 0 // Common local IP range
);

// --- Database Credentials ---
if ($isLocal) {
    // Local Development Environment Settings (e.g., XAMPP/WAMP defaults)
    define('DB_SERVER', 'localhost');
    define('DB_USERNAME', 'root'); // Common default for XAMPP/WAMP
    define('DB_PASSWORD', '');     // Common default for XAMPP/WAMP
    define('DB_NAME', 'wd_reports');       // Assuming your local database name is 'wd'
    define('DB_PORT', 3306);
} else {
    // Production Environment Settings
    define('DB_SERVER', 'fdb1034.awardspace.net');
    define('DB_USERNAME', '4707317_wdbpi');
    define('DB_PASSWORD', '!QFsIzjv6prlaLZM');
    define('DB_NAME', '4707317_wdbpi');
    define('DB_PORT', 3306);
}

// --- Timezone Setting ---
// Set the default timezone to ensure consistent date and time handling.
date_default_timezone_set('Asia/Bangkok');

// --- Database Connection ---
// Create a new mysqli connection object.
$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT);

// --- Connection Error Handling ---
// Check the connection for errors. If an error occurs, terminate the script
// and display a user-friendly error message.
if ($conn->connect_error) {
    // In a production environment, you might want to log this error
    // instead of displaying it to the user for security reasons.
    die("ERROR: Could not connect. " . $conn->connect_error);
}

// --- Character Set ---
// Set the character set to utf8mb4 to support a wide range of characters.
if (!$conn->set_charset("utf8mb4")) {
    // Handle character set error if needed.
    // For example: printf("Error loading character set utf8mb4: %s\n", $conn->error);
}

// The $conn object is now ready to be used for database queries
// in other parts of the application.
?>