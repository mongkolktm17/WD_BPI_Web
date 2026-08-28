<?php
require_once "check_permissions.php";

$report_id = $_GET['id'] ?? $_GET['submission_id'] ?? null;
$type = $_GET['type'] ?? 'reports';

if (!$report_id) {
    header("Location: report_page.php?error=missing_id");
    exit;
}

// Check permissions (Admin only)
$is_admin = (isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions'])) || (isset($_SESSION['username']) && strcasecmp($_SESSION['username'], 'admin') === 0);
$user_username = $_SESSION['username'] ?? 'Unknown';

if (!$is_admin) {
    header("Location: report_page.php?error=access_denied&msg=Only Admin can delete reports");
    exit;
}

$table_map = [
    'reports' => ['table' => 'reports', 'pk' => 'id', 'soft' => true],
    'car_parking' => ['table' => 'car_parking_reports', 'pk' => 'id', 'soft' => true],
    'cctv_inspection' => ['table' => 'cctv_inspections', 'pk' => 'id', 'soft' => true],
    'hand_held' => ['table' => 'hand_held_checks', 'pk' => 'id', 'soft' => true],
    'patrol' => ['table' => 'patrol_reports', 'pk' => 'id', 'soft' => true],
    'guard_count' => ['table' => 'security_guard_counts', 'pk' => 'id', 'soft' => true],
    'cctv_report' => ['table' => 'cctv_reports', 'pk' => 'id', 'soft' => true],
    'cctv_angle' => ['table' => 'cctv_angle_reports', 'pk' => 'id', 'soft' => true],
    'metal_detector' => ['table' => 'metal_detector_checks', 'pk' => 'id', 'soft' => true]
];

if (!isset($table_map[$type])) {
    header("Location: report_page.php?error=invalid_type");
    exit;
}

$config = $table_map[$type];
$table = $config['table'];
$pk = $config['pk'];
$is_soft = $config['soft'];
$pk_type = $config['type'] ?? 'i';

if ($is_soft) {
    $stmt = $conn->prepare("UPDATE `$table` SET is_deleted = 1, deleted_by = ?, deleted_at = NOW() WHERE `$pk` = ?");
    $stmt->bind_param("s" . $pk_type, $user_username, $report_id);
} else {
    // For cctv_reports, we might need to delete from details table too if there's no cascade
    if ($type === 'cctv_report') {
        // Find the report id first if needed or rely on cascade
        // Assuming cascade is set up in setup.php (it is: ON DELETE CASCADE for cctv_report_details)
    }
    $stmt = $conn->prepare("DELETE FROM `$table` WHERE `$pk` = ?");
    $stmt->bind_param($pk_type, $report_id);
}

if ($stmt) {
    if ($stmt->execute()) {
        $stmt->close();
        header("Location: report_page.php?message=report_deleted");
        exit;
    } else {
        $stmt_error = $stmt->error;
        $stmt->close();
        header("Location: report_page.php?error=delete_failed&db_error=" . urlencode($stmt_error));
        exit;
    }
} else {
    header("Location: report_page.php?error=prepare_failed");
    exit;
}