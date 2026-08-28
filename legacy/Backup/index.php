<?php
// This file is the main entry point of the application.

// Start the session to access session variables.
session_start();

// Check if the user is logged in.
// If the 'loggedin' session variable is set and is true, redirect to the dashboard.
if (isset($_SESSION["loggedin"]) && $_SESSION["loggedin"] === true) {
    header("location: dashboard.php");
    exit;
} else {
    // If the user is not logged in, redirect to the login page.
    header("location: login.php");
    exit;
}
?>