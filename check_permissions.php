<?php
/**
 * check_permissions.php
 *
 * This script checks if the currently logged-in user has permission to access the current page.
 * It should be included at the top of any page that requires authentication and authorization.
 *
 * It performs the following checks:
 * 1. Verifies that a user is logged in. If not, redirects to login.php.
 * 2. Checks if the user is an 'admin'. If so, grants access by checking for the 'all' permission.
 * 3. Checks if the current page is in the user's permissions list stored in the session.
 * 4. If access is denied, redirects to dashboard.php with an error.
 */

// Ensure config is loaded, which starts the session.
require_once 'config.php';

// 1. Check if the user is logged in. If not, redirect to the login page.
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

// 2. If the user has the 'all' permission (i.e., is an admin), grant access.
if (isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions'])) {
    return; // Grant access and stop further checks.
}

// 3. Check for page-specific permissions for non-admin users.
$current_page = basename($_SERVER['PHP_SELF']);

// Allow access to core pages for any logged-in user.
$always_allowed_pages = ['report_page.php', 'edit_report.php', 'delete_report.php'];
if (in_array($current_page, $always_allowed_pages)) {
    return; // Grant access for these specific pages.
}

if (!isset($_SESSION['permissions']) || !in_array($current_page, $_SESSION['permissions'])) {
    // 4. Access Denied: Redirect to the dashboard.
    // A GET parameter is added to allow the dashboard to show an error message.
    header("location: access_denied.php");
    exit;
}

?>