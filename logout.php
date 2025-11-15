<?php
/**
 * logout.php
 *
 * This script handles the user logout process.
 * It destroys the current session and redirects the user to the login page.
 */

// Initialize the session via the central config file.
require_once 'config.php';

// Unset all of the session variables.
$_SESSION = [];

// Destroy the session.
session_destroy();

// Redirect to the login page.
header("location: login.php");
exit;
?>