<?php
/**
 * export_users_csv.php
 * 
 * Export all users to CSV format
 */

require_once "check_permissions.php";

// Set headers for CSV download
header('Content-Type: text/csv; charset=UTF-8');
header('Content-Disposition: attachment; filename="users_export_' . date('Y-m-d_His') . '.csv"');
header('Pragma: no-cache');
header('Expires: 0');

// Add BOM for proper UTF-8 encoding in Excel
echo "\xEF\xBB\xBF";

// Open output stream
$output = fopen('php://output', 'w');

// Write CSV header
fputcsv($output, [
    'ลำดับ',
    'รหัสพนักงาน',
    'ชื่อภาษาไทย',
    'นามสกุลภาษาไทย',
    'ชื่อภาษาอังกฤษ',
    'นามสกุลภาษาอังกฤษ',
    'username',
    'password',
    'เบอร์โทร',
    'ประเภทผู้ใช้',
    'Role ID',
    'Role Name',
    'ID'
]);

// Query all users with role information
$sql = "SELECT u.id, u.employee_id, u.first_name, u.last_name, u.eng_first_name, u.eng_last_name, 
               u.username, u.phone_number, u.user_type, u.role_id, r.role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.employee_id";

$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $row_num = 1;
    while ($row = $result->fetch_assoc()) {
        // For security, we show a placeholder for password (not the actual hash)
        $password_placeholder = $row['employee_id']; // Use employee_id as placeholder

        fputcsv($output, [
            $row_num,
            $row['employee_id'],
            $row['first_name'],
            $row['last_name'],
            $row['eng_first_name'],
            $row['eng_last_name'],
            $row['username'],
            $password_placeholder,
            $row['phone_number'],
            $row['user_type'],
            $row['role_id'],
            $row['role_name'],
            $row['id']
        ]);
        $row_num++;
    }
}

fclose($output);
$conn->close();
exit();
?>