<?php
/**
 * check_permissions.php
 * 
 * Central authentication and permission checking script.
 * This file should be included at the top of protected pages.
 * 
 * It performs the following:
 * 1. Includes config.php (which starts the session and database connection)
 * 2. Checks if user is logged in
 * 3. Loads user permissions into the session
 * 4. Optionally checks if user has permission to access the current page
 */

// Include config (which starts session and database connection)
require_once 'config.php';

// --- Authentication Check ---
// Check if user is logged in
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

// --- Load User Permissions (if not already loaded) ---
if (!isset($_SESSION['permissions'])) {
    // Fetch user permissions from database
    $user_id = $_SESSION["id"];

    // Get user's role_id
    $stmt = $conn->prepare("SELECT role_id, user_type FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user_data = $result->fetch_assoc();
    $stmt->close();

    if ($user_data) {
        $_SESSION['user_type'] = $user_data['user_type'];

        // If user is admin, grant all permissions
        if ($user_data['user_type'] === 'admin') {
            $_SESSION['permissions'] = ['all'];
        } else if ($user_data['role_id']) {
            // Get permissions for the role
            $stmt = $conn->prepare("SELECT page_name FROM role_permissions WHERE role_id = ?");
            $stmt->bind_param("i", $user_data['role_id']);
            $stmt->execute();
            $result = $stmt->get_result();

            $permissions = [];
            while ($row = $result->fetch_assoc()) {
                $permissions[] = $row['page_name'];
            }
            $stmt->close();

            $_SESSION['permissions'] = $permissions;
        } else {
            // No role assigned, no permissions
            $_SESSION['permissions'] = [];
        }
    } else {
        // User not found in database, invalid session
        $_SESSION['permissions'] = [];
    }
}

// --- Optional: Check Page-Specific Permissions ---
// This function can be called from individual pages to check specific permissions
function checkPagePermission($page_name)
{
    $user_permissions = $_SESSION['permissions'] ?? [];

    // Admins have access to all pages
    if (in_array('all', $user_permissions)) {
        return true;
    }

    // Check if user has permission for this specific page
    if (in_array($page_name, $user_permissions)) {
        return true;
    }

    // No permission
    return false;
}

// --- Optional: Enforce Page Permission Check ---
// Uncomment the following code if you want to automatically check permissions
// based on the current script name:
/*
$current_page = basename($_SERVER['PHP_SELF']);
if (!checkPagePermission($current_page)) {
    header("location: access_denied.php?error=access_denied");
    exit;
}
*/

?>