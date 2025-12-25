<?php
/**
 * check_user_roles.php
 * 
 * Verify that all users from CSV have correct permissions
 * Should be user_type='officer' and role_id=3 (Security Officer)
 * except admin user
 */

require_once 'config.php';

echo '<!DOCTYPE html>';
echo '<html lang="th">';
echo '<head>';
echo '<meta charset="UTF-8">';
echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
echo '<title>ตรวจสอบสิทธิ์ผู้ใช้</title>';
echo '<link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">';
echo '<script src="https://cdn.tailwindcss.com"></script>';
echo '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">';
echo '<style>body { font-family: "Sarabun", sans-serif; }</style>';
echo '</head>';
echo '<body class="bg-gray-100 p-8">';

echo '<div class="max-w-6xl mx-auto">';
echo '<div class="bg-white rounded-lg shadow-lg p-8">';
echo '<h1 class="text-3xl font-bold text-gray-800 mb-6">ตรวจสอบสิทธิ์ผู้ใช้งาน</h1>';

// Read CSV to get all employee IDs
$csv_file = 'report_assets/officers.csv';
$csv_employee_ids = [];

if (file_exists($csv_file)) {
    $handle = fopen($csv_file, 'r');
    fgetcsv($handle); // Skip header

    while (($data = fgetcsv($handle)) !== FALSE) {
        if (count($data) >= 8) {
            $csv_employee_ids[] = trim($data[1]);
        }
    }
    fclose($handle);
}

echo '<div class="mb-6 bg-blue-50 border border-blue-300 rounded-lg p-4">';
echo '<h2 class="font-bold text-blue-800 mb-2">📋 ข้อมูลการตรวจสอบ</h2>';
echo '<p class="text-blue-700">พบรายชื่อใน CSV: ' . count($csv_employee_ids) . ' คน</p>';
echo '<p class="text-blue-700 mt-2">เกณฑ์การตรวจสอบ:</p>';
echo '<ul class="text-blue-700 list-disc list-inside ml-4">';
echo '<li>user_type = "officer" (ไม่ใช่ "admin")</li>';
echo '<li>role_id = 3 (เจ้าหน้าที่รักษาความปลอดภัย)</li>';
echo '</ul>';
echo '</div>';

// Query all users
$sql = "SELECT u.id, u.username, u.user_type, u.role_id, u.first_name, u.last_name, u.employee_id, r.role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        ORDER BY u.user_type, u.username";
$result = $conn->query($sql);

$correct_count = 0;
$incorrect_count = 0;
$admin_count = 0;

$correct_users = [];
$incorrect_users = [];
$admin_users = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $is_admin = ($row['user_type'] == 'admin');
        $is_correct = ($row['user_type'] == 'officer' && $row['role_id'] == 3);
        $in_csv = in_array($row['employee_id'], $csv_employee_ids);

        $user_data = [
            'id' => $row['id'],
            'username' => $row['username'],
            'name' => $row['first_name'] . ' ' . $row['last_name'],
            'employee_id' => $row['employee_id'],
            'user_type' => $row['user_type'],
            'role_id' => $row['role_id'],
            'role_name' => $row['role_name'] ?? 'N/A',
            'in_csv' => $in_csv
        ];

        if ($is_admin) {
            $admin_users[] = $user_data;
            $admin_count++;
        } else if ($is_correct) {
            $correct_users[] = $user_data;
            $correct_count++;
        } else {
            $incorrect_users[] = $user_data;
            $incorrect_count++;
        }
    }
}

// Display summary
echo '<div class="mb-6 grid grid-cols-3 gap-4">';

echo '<div class="bg-gray-50 border border-gray-300 rounded-lg p-4">';
echo '<h3 class="font-bold text-gray-800 mb-2">👤 Admin Users</h3>';
echo '<p class="text-2xl font-bold text-gray-700">' . $admin_count . ' คน</p>';
echo '<p class="text-sm text-gray-600">ข้ามการตรวจสอบ</p>';
echo '</div>';

echo '<div class="bg-green-50 border border-green-300 rounded-lg p-4">';
echo '<h3 class="font-bold text-green-800 mb-2">✅ ถูกต้อง</h3>';
echo '<p class="text-2xl font-bold text-green-700">' . $correct_count . ' คน</p>';
echo '<p class="text-sm text-green-600">Officer + Role 3</p>';
echo '</div>';

echo '<div class="bg-red-50 border border-red-300 rounded-lg p-4">';
echo '<h3 class="font-bold text-red-800 mb-2">❌ ไม่ถูกต้อง</h3>';
echo '<p class="text-2xl font-bold text-red-700">' . $incorrect_count . ' คน</p>';
echo '<p class="text-sm text-red-600">ต้องแก้ไข</p>';
echo '</div>';

echo '</div>';

// Display incorrect users first
if ($incorrect_count > 0) {
    echo '<div class="mb-6 bg-red-50 border border-red-300 rounded-lg p-4">';
    echo '<h2 class="text-2xl font-bold text-red-800 mb-4">❌ ผู้ใช้ที่มีสิทธิ์ไม่ถูกต้อง</h2>';
    echo '<div class="overflow-x-auto">';
    echo '<table class="min-w-full bg-white border border-gray-300 text-sm">';
    echo '<thead class="bg-red-200">';
    echo '<tr>';
    echo '<th class="px-3 py-2 border">ID</th>';
    echo '<th class="px-3 py-2 border">Username</th>';
    echo '<th class="px-3 py-2 border">ชื่อ-นามสกุล</th>';
    echo '<th class="px-3 py-2 border">รหัสพนักงาน</th>';
    echo '<th class="px-3 py-2 border">User Type</th>';
    echo '<th class="px-3 py-2 border">Role ID</th>';
    echo '<th class="px-3 py-2 border">Role Name</th>';
    echo '<th class="px-3 py-2 border">ใน CSV</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';

    foreach ($incorrect_users as $user) {
        echo '<tr class="bg-red-50">';
        echo '<td class="px-3 py-2 border text-center">' . $user['id'] . '</td>';
        echo '<td class="px-3 py-2 border font-mono">' . htmlspecialchars($user['username']) . '</td>';
        echo '<td class="px-3 py-2 border">' . htmlspecialchars($user['name']) . '</td>';
        echo '<td class="px-3 py-2 border text-center">' . htmlspecialchars($user['employee_id']) . '</td>';
        echo '<td class="px-3 py-2 border text-center">';
        if ($user['user_type'] != 'officer') {
            echo '<span class="text-red-600 font-bold">' . htmlspecialchars($user['user_type']) . '</span>';
        } else {
            echo htmlspecialchars($user['user_type']);
        }
        echo '</td>';
        echo '<td class="px-3 py-2 border text-center">';
        if ($user['role_id'] != 3) {
            echo '<span class="text-red-600 font-bold">' . ($user['role_id'] ?? 'NULL') . '</span>';
        } else {
            echo ($user['role_id'] ?? 'NULL');
        }
        echo '</td>';
        echo '<td class="px-3 py-2 border">' . htmlspecialchars($user['role_name']) . '</td>';
        echo '<td class="px-3 py-2 border text-center">' . ($user['in_csv'] ? '✅' : '❌') . '</td>';
        echo '</tr>';
    }

    echo '</tbody>';
    echo '</table>';
    echo '</div>';
    echo '</div>';
}

// Display admin users
if ($admin_count > 0) {
    echo '<div class="mb-6 bg-gray-50 border border-gray-300 rounded-lg p-4">';
    echo '<h2 class="text-2xl font-bold text-gray-800 mb-4">👤 Admin Users (ข้ามการตรวจสอบ)</h2>';
    echo '<div class="overflow-x-auto">';
    echo '<table class="min-w-full bg-white border border-gray-300 text-sm">';
    echo '<thead class="bg-gray-200">';
    echo '<tr>';
    echo '<th class="px-3 py-2 border">ID</th>';
    echo '<th class="px-3 py-2 border">Username</th>';
    echo '<th class="px-3 py-2 border">ชื่อ-นามสกุล</th>';
    echo '<th class="px-3 py-2 border">รหัสพนักงาน</th>';
    echo '<th class="px-3 py-2 border">User Type</th>';
    echo '<th class="px-3 py-2 border">Role ID</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';

    foreach ($admin_users as $user) {
        echo '<tr>';
        echo '<td class="px-3 py-2 border text-center">' . $user['id'] . '</td>';
        echo '<td class="px-3 py-2 border font-mono">' . htmlspecialchars($user['username']) . '</td>';
        echo '<td class="px-3 py-2 border">' . htmlspecialchars($user['name']) . '</td>';
        echo '<td class="px-3 py-2 border text-center">' . htmlspecialchars($user['employee_id']) . '</td>';
        echo '<td class="px-3 py-2 border text-center"><span class="font-bold text-blue-600">' . htmlspecialchars($user['user_type']) . '</span></td>';
        echo '<td class="px-3 py-2 border text-center">' . ($user['role_id'] ?? 'NULL') . '</td>';
        echo '</tr>';
    }

    echo '</tbody>';
    echo '</table>';
    echo '</div>';
    echo '</div>';
}

// Display correct users (collapsible)
if ($correct_count > 0) {
    echo '<div class="mb-6 bg-green-50 border border-green-300 rounded-lg p-4">';
    echo '<h2 class="text-2xl font-bold text-green-800 mb-4">✅ ผู้ใช้ที่มีสิทธิ์ถูกต้อง (' . $correct_count . ' คน)</h2>';
    echo '<details class="cursor-pointer">';
    echo '<summary class="font-semibold text-green-700 mb-2">คลิกเพื่อดูรายละเอียด</summary>';
    echo '<div class="overflow-x-auto mt-4">';
    echo '<table class="min-w-full bg-white border border-gray-300 text-sm">';
    echo '<thead class="bg-green-200">';
    echo '<tr>';
    echo '<th class="px-3 py-2 border">ID</th>';
    echo '<th class="px-3 py-2 border">Username</th>';
    echo '<th class="px-3 py-2 border">ชื่อ-นามสกุล</th>';
    echo '<th class="px-3 py-2 border">รหัสพนักงาน</th>';
    echo '<th class="px-3 py-2 border">User Type</th>';
    echo '<th class="px-3 py-2 border">Role ID</th>';
    echo '<th class="px-3 py-2 border">Role Name</th>';
    echo '<th class="px-3 py-2 border">ใน CSV</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';

    foreach ($correct_users as $user) {
        echo '<tr>';
        echo '<td class="px-3 py-2 border text-center">' . $user['id'] . '</td>';
        echo '<td class="px-3 py-2 border font-mono">' . htmlspecialchars($user['username']) . '</td>';
        echo '<td class="px-3 py-2 border">' . htmlspecialchars($user['name']) . '</td>';
        echo '<td class="px-3 py-2 border text-center">' . htmlspecialchars($user['employee_id']) . '</td>';
        echo '<td class="px-3 py-2 border text-center text-green-600">✅ ' . htmlspecialchars($user['user_type']) . '</td>';
        echo '<td class="px-3 py-2 border text-center text-green-600">✅ ' . $user['role_id'] . '</td>';
        echo '<td class="px-3 py-2 border">' . htmlspecialchars($user['role_name']) . '</td>';
        echo '<td class="px-3 py-2 border text-center">' . ($user['in_csv'] ? '✅' : '❌') . '</td>';
        echo '</tr>';
    }

    echo '</tbody>';
    echo '</table>';
    echo '</div>';
    echo '</details>';
    echo '</div>';
}

// Final summary
if ($incorrect_count == 0) {
    echo '<div class="bg-green-100 border border-green-400 rounded-lg p-6 text-center">';
    echo '<h2 class="text-3xl font-bold text-green-800 mb-2">🎉 ทุกอย่างถูกต้อง!</h2>';
    echo '<p class="text-green-700 text-lg">ผู้ใช้ทั้งหมด (ยกเว้น Admin) มีสิทธิ์เป็นเจ้าหน้าที่รักษาความปลอดภัย</p>';
    echo '</div>';
} else {
    echo '<div class="bg-yellow-100 border border-yellow-400 rounded-lg p-6">';
    echo '<h2 class="text-2xl font-bold text-yellow-800 mb-2">⚠️ พบผู้ใช้ที่มีสิทธิ์ไม่ถูกต้อง</h2>';
    echo '<p class="text-yellow-700">มี ' . $incorrect_count . ' คนที่ต้องแก้ไข</p>';
    echo '<p class="text-yellow-700 mt-2">กรุณาใช้ <a href="edit_officer.php" class="underline font-bold">หน้าแก้ไขเจ้าหน้าที่</a> เพื่อแก้ไขสิทธิ์</p>';
    echo '</div>';
}

echo '<div class="mt-6">';
echo '<a href="dashboard.php" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">กลับ Dashboard</a>';
echo '</div>';

echo '</div>';
echo '</div>';

echo '</body>';
echo '</html>';

$conn->close();
?>