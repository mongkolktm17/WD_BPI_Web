<?php
require_once "check_permissions.php";

$report_id = $_GET['id'] ?? null;

if (!$report_id) {
    header("Location: dashboard.php?error=missing_id");
    exit;
}

// --- Authorization Check ---
// Fetch the report's author ID
$stmt = $conn->prepare("SELECT employee_id FROM reports WHERE id = ?");
if (!$stmt) {
    header("Location: dashboard.php?error=prepare_failed");
    exit;
}

$stmt->bind_param("i", $report_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    header("Location: dashboard.php?error=report_not_found");
    exit;
}

$report = $result->fetch_assoc();
$author_id = $report['employee_id'];
$stmt->close();

// Check if the current user is an admin or the author of the report
$is_admin = isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions']);
$is_author = isset($_SESSION['employee_id']) && $_SESSION['employee_id'] == $author_id;

if (!$is_admin && !$is_author) {
    // If not authorized, redirect with an error
    header("Location: dashboard.php?error=access_denied");
    exit;
}

// --- Deletion Logic ---
// If authorization passes, proceed with deletion
$stmt = $conn->prepare("DELETE FROM reports WHERE id = ?");
if ($stmt) {
    $stmt->bind_param("i", $report_id);
    if ($stmt->execute()) {
        // Deletion successful
        header("Location: dashboard.php?message=report_deleted");
        exit;
    } else {
        // Deletion failed
        header("Location: dashboard.php?error=delete_failed");
        exit;
    }
    $stmt->close();
} else {
    // Statement preparation failed
    header("Location: dashboard.php?error=prepare_failed");
    exit;
}

$conn->close();
?>