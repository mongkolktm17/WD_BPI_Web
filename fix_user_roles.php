<?php
/**
 * fix_user_roles.php
 * 
 * Update all officer users to have correct role_id = 3 (เจ้าหน้าที่รักษาความปลอดภัย)
 */

require_once 'config.php';

// Get action parameter
$action = isset($_GET['action']) ? $_GET['action'] : 'preview';

echo '<!DOCTYPE html>';
echo '<html lang="th">';
echo '<head>';
echo '<meta charset="UTF-8">';
echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
echo '<title>แก้ไข Role ID ผู้ใช้</title>';
echo '<link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">';
echo '<script src="https://cdn.tailwindcss.com"></script>';
echo '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">';
echo '<style>body { font-family: "Sarabun", sans-serif; }</style>';
echo '</head>';
echo '<body class="bg-gray-100 p-8">';

echo '<div class="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">';
echo '<h1 class="text-3xl font-bold text-gray-800 mb-6">แก้ไข Role ID ของผู้ใช้</h1>';

if ($action == 'preview') {
    echo '<div class="mb-6 bg-blue-50 border border-blue-300 rounded-lg p-4">';
    echo '<h2 class="font-bold text-blue-800 mb-2">📋 โหมดตรวจสอบ (Preview)</h2>';
    echo '<p class="text-blue-700">จะอัพเดตผู้ใช้ทั้งหมดที่เป็น officer ให้มี role_id = 3 (เจ้าหน้าที่รักษาความปลอดภัย)</p>';
    echo '<p class="text-blue-700 mt-1">Admin users จะไม่ถูกแก้ไข</p>';
    echo '</div>';

    // Query all users
    $sql = "SELECT u.id, u.username, u.first_name, u.last_name, u.employee_id, u.user_type, u.role_id, r.role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            ORDER BY u.user_type, u.role_id, u.username";
    $result = $conn->query($sql);

    $admin_users = [];
    $correct_officers = [];
    $incorrect_officers = [];

    while ($row = $result->fetch_assoc()) {
        if ($row['user_type'] == 'admin') {
            $admin_users[] = $row;
        } else if ($row['role_id'] == 3) {
            $correct_officers[] = $row;
        } else {
            $incorrect_officers[] = $row;
        }
    }

    // Summary
    echo '<div class="mb-6 grid grid-cols-3 gap-4">';

    echo '<div class="bg-gray-50 border border-gray-300 rounded-lg p-4">';
    echo '<h3 class="font-bold text-gray-800 mb-2">👤 Admin</h3>';
    echo '<p class="text-2xl font-bold text-gray-700">' . count($admin_users) . ' คน</p>';
    echo '<p class="text-sm text-gray-600">ไม่แก้ไข</p>';
    echo '</div>';

    echo '<div class="bg-green-50 border border-green-300 rounded-lg p-4">';
    echo '<h3 class="font-bold text-green-800 mb-2">✅ ถูกต้อง</h3>';
    echo '<p class="text-2xl font-bold text-green-700">' . count($correct_officers) . ' คน</p>';
    echo '<p class="text-sm text-green-600">Role ID = 3</p>';
    echo '</div>';

    echo '<div class="bg-red-50 border border-red-300 rounded-lg p-4">';
    echo '<h3 class="font-bold text-red-800 mb-2">❌ ต้องแก้ไข</h3>';
    echo '<p class="text-2xl font-bold text-red-700">' . count($incorrect_officers) . ' คน</p>';
    echo '<p class="text-sm text-red-600">Role ID ≠ 3</p>';
    echo '</div>';

    echo '</div>';

    // Display users to be fixed
    if (count($incorrect_officers) > 0) {
        echo '<div class="mb-6 bg-red-50 border border-red-300 rounded-lg p-4">';
        echo '<h2 class="text-2xl font-bold text-red-800 mb-4">❌ ผู้ใช้ที่จะถูกแก้ไข (' . count($incorrect_officers) . ' คน)</h2>';
        echo '<div class="overflow-x-auto">';
        echo '<table class="min-w-full bg-white border border-gray-300 text-sm">';
        echo '<thead class="bg-red-200">';
        echo '<tr>';
        echo '<th class="px-3 py-2 border">ID</th>';
        echo '<th class="px-3 py-2 border">Username</th>';
        echo '<th class="px-3 py-2 border">ชื่อ-นามสกุล</th>';
        echo '<th class="px-3 py-2 border">รหัสพนักงาน</th>';
        echo '<th class="px-3 py-2 border">Role ID ปัจจุบัน</th>';
        echo '<th class="px-3 py-2 border">→</th>';
        echo '<th class="px-3 py-2 border">Role ID ใหม่</th>';
        echo '</tr>';
        echo '</thead>';
        echo '<tbody>';

        foreach ($incorrect_officers as $user) {
            echo '<tr class="bg-red-50">';
            echo '<td class="px-3 py-2 border text-center">' . $user['id'] . '</td>';
            echo '<td class="px-3 py-2 border font-mono">' . htmlspecialchars($user['username']) . '</td>';
            echo '<td class="px-3 py-2 border">' . htmlspecialchars($user['first_name'] . ' ' . $user['last_name']) . '</td>';
            echo '<td class="px-3 py-2 border text-center">' . htmlspecialchars($user['employee_id']) . '</td>';
            echo '<td class="px-3 py-2 border text-center"><span class="text-red-600 font-bold">' . ($user['role_id'] ?? 'NULL') . '</span> (' . htmlspecialchars($user['role_name'] ?? 'N/A') . ')</td>';
            echo '<td class="px-3 py-2 border text-center">→</td>';
            echo '<td class="px-3 py-2 border text-center"><span class="text-green-600 font-bold">3</span> (เจ้าหน้าที่รักษาความปลอดภัย)</td>';
            echo '</tr>';
        }

        echo '</tbody>';
        echo '</table>';
        echo '</div>';
        echo '</div>';

        echo '<div class="flex gap-4">';
        echo '<a href="fix_user_roles.php?action=execute" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold">✅ ยืนยันและแก้ไข ' . count($incorrect_officers) . ' คน</a>';
        echo '<a href="dashboard.php" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700">ยกเลิก</a>';
        echo '</div>';

    } else {
        echo '<div class="bg-green-50 border border-green-300 rounded-lg p-4 mb-6">';
        echo '<h3 class="font-bold text-green-800 mb-2">✅ ทุกอย่างถูกต้อง!</h3>';
        echo '<p class="text-green-700">ผู้ใช้ทุกคนมี role_id ถูกต้องแล้ว</p>';
        echo '</div>';

        echo '<a href="dashboard.php" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">กลับ Dashboard</a>';
    }

} else if ($action == 'execute') {
    echo '<div class="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">';
    echo '<h2 class="font-bold text-yellow-800 mb-2">⚙️ กำลังแก้ไข Role ID...</h2>';
    echo '</div>';

    $conn->begin_transaction();

    try {
        // Update all officers to role_id = 3
        $sql = "UPDATE users SET role_id = 3 WHERE user_type = 'officer' AND role_id != 3";
        $result = $conn->query($sql);

        $updated_count = $conn->affected_rows;

        echo '<p class="text-sm text-green-700">✅ อัพเดต ' . $updated_count . ' รายการเป็น role_id = 3</p>';

        $conn->commit();

        echo '<div class="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-green-800 mb-2">✅ แก้ไขสำเร็จ!</h3>';
        echo '<p class="text-green-700">อัพเดต role_id ของผู้ใช้ ' . $updated_count . ' คน</p>';
        echo '<p class="text-green-700 mt-2">ทุกคนเป็น "เจ้าหน้าที่รักษาความปลอดภัย" (role_id = 3) แล้ว</p>';
        echo '</div>';

        echo '<div class="mt-6 bg-blue-50 border border-blue-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-blue-800 mb-2">📌 ตรวจสอบผลลัพธ์</h3>';
        echo '<p class="text-blue-700">เปิด <a href="check_user_roles.php" class="underline font-bold">check_user_roles.php</a> เพื่อยืนยันว่าทุกอย่างถูกต้อง</p>';
        echo '</div>';

        echo '<a href="dashboard.php" class="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">กลับ Dashboard</a>';

    } catch (Exception $e) {
        $conn->rollback();
        echo '<div class="bg-red-50 border border-red-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-red-800 mb-2">❌ เกิดข้อผิดพลาด</h3>';
        echo '<p class="text-red-700">' . htmlspecialchars($e->getMessage()) . '</p>';
        echo '</div>';
    }
}

echo '</div>';
echo '</body>';
echo '</html>';

$conn->close();
?>