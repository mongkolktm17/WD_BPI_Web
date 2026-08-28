<?php
require_once 'config.php';

// Check if user is logged in
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("Content-Type: application/json");
    echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
    exit;
}

// Check if user is admin
$is_admin = false;
if (isset($_SESSION['user_type']) && $_SESSION['user_type'] === 'admin') {
    $is_admin = true;
} elseif (isset($_SESSION['role_id']) && $_SESSION['role_id'] == 1) {
    $is_admin = true;
} elseif (isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions'])) {
    $is_admin = true;
}

if (!$is_admin) {
    header("Content-Type: application/json");
    echo json_encode(['status' => 'error', 'message' => 'Access denied']);
    exit;
}

// Fetch all users with their roles
$sql = "SELECT u.id, u.first_name, u.last_name, u.employee_id, u.username, 
               r.role_name, r.id as role_id
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.first_name, u.last_name";

$result = $conn->query($sql);

$staff = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $staff[] = [
            'id' => $row['id'],
            'name' => $row['first_name'] . ' ' . $row['last_name'],
            'employee_id' => $row['employee_id'],
            'username' => $row['username'],
            'role' => $row['role_name'] ?? 'No Role',
            'role_id' => $row['role_id'],
            'shift' => 'Day Shift', // Default value since shift column doesn't exist
            'status' => 'active' // Default value since status column doesn't exist
        ];
    }
}

header("Content-Type: application/json");
echo json_encode(['status' => 'success', 'data' => $staff]);

$conn->close();
?>