<?php
/**
 * fix_roles.php
 * 
 * Fix the roles table to match the correct role definitions from setup.php
 */

require_once 'config.php';

// Get action parameter
$action = isset($_GET['action']) ? $_GET['action'] : 'preview';

echo '<!DOCTYPE html>';
echo '<html lang="th">';
echo '<head>';
echo '<meta charset="UTF-8">';
echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
echo '<title>แก้ไขตาราง Roles</title>';
echo '<link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">';
echo '<script src="https://cdn.tailwindcss.com"></script>';
echo '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">';
echo '<style>body { font-family: "Sarabun", sans-serif; }</style>';
echo '</head>';
echo '<body class="bg-gray-100 p-8">';

echo '<div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">';
echo '<h1 class="text-3xl font-bold text-gray-800 mb-6">แก้ไขตาราง Roles</h1>';

// Correct role definitions from setup.php
$correct_roles = [
    1 => 'ผู้ดูแลระบบ',
    2 => 'หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย',
    3 => 'เจ้าหน้าที่รักษาความปลอดภัย',
    4 => 'เจ้าหน้าที่ตรวจตรา'
];

if ($action == 'preview') {
    echo '<div class="mb-6 bg-blue-50 border border-blue-300 rounded-lg p-4">';
    echo '<h2 class="font-bold text-blue-800 mb-2">📋 โหมดตรวจสอบ (Preview)</h2>';
    echo '<p class="text-blue-700">เปรียบเทียบข้อมูลปัจจุบันกับข้อมูลที่ถูกต้อง</p>';
    echo '</div>';

    // Query current roles
    $sql = "SELECT id, role_name FROM roles ORDER BY id";
    $result = $conn->query($sql);

    echo '<div class="overflow-x-auto mb-6">';
    echo '<table class="min-w-full bg-white border border-gray-300">';
    echo '<thead class="bg-gray-200">';
    echo '<tr>';
    echo '<th class="px-4 py-2 border">Role ID</th>';
    echo '<th class="px-4 py-2 border">ชื่อปัจจุบัน</th>';
    echo '<th class="px-4 py-2 border">→</th>';
    echo '<th class="px-4 py-2 border">ชื่อที่ถูกต้อง</th>';
    echo '<th class="px-4 py-2 border">สถานะ</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';

    $needs_fix = false;
    $current_roles = [];

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $current_roles[$row['id']] = $row['role_name'];
        }
    }

    foreach ($correct_roles as $id => $correct_name) {
        $current_name = $current_roles[$id] ?? 'ไม่มีข้อมูล';
        $is_correct = ($current_name === $correct_name);

        if (!$is_correct) {
            $needs_fix = true;
        }

        $row_class = $is_correct ? 'bg-green-50' : 'bg-red-50';

        echo '<tr class="' . $row_class . '">';
        echo '<td class="px-4 py-2 border text-center font-bold">' . $id . '</td>';
        echo '<td class="px-4 py-2 border">';
        if (!$is_correct)
            echo '<span class="text-red-600 font-bold">';
        echo htmlspecialchars($current_name);
        if (!$is_correct)
            echo '</span>';
        echo '</td>';
        echo '<td class="px-4 py-2 border text-center">→</td>';
        echo '<td class="px-4 py-2 border"><span class="text-green-600 font-bold">' . htmlspecialchars($correct_name) . '</span></td>';
        echo '<td class="px-4 py-2 border text-center">';
        if ($is_correct) {
            echo '<span class="text-green-600">✅ ถูกต้อง</span>';
        } else {
            echo '<span class="text-red-600">❌ ต้องแก้ไข</span>';
        }
        echo '</td>';
        echo '</tr>';
    }

    echo '</tbody>';
    echo '</table>';
    echo '</div>';

    if ($needs_fix) {
        echo '<div class="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">';
        echo '<h3 class="font-bold text-yellow-800 mb-2">⚠️ พบข้อมูลที่ต้องแก้ไข</h3>';
        echo '<p class="text-yellow-700">Script จะลบ roles เดิมทั้งหมดและสร้างใหม่ให้ถูกต้อง</p>';
        echo '<p class="text-yellow-700 mt-2">การเชื่อมโยงกับ users จะยังคงอยู่ (ไม่กระทบ)</p>';
        echo '</div>';

        echo '<div class="flex gap-4">';
        echo '<a href="fix_roles.php?action=execute" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold">✅ ยืนยันและแก้ไข</a>';
        echo '<a href="dashboard.php" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700">ยกเลิก</a>';
        echo '</div>';
    } else {
        echo '<div class="bg-green-50 border border-green-300 rounded-lg p-4 mb-6">';
        echo '<h3 class="font-bold text-green-800 mb-2">✅ ทุกอย่างถูกต้อง!</h3>';
        echo '<p class="text-green-700">ข้อมูลในตาราง roles ถูกต้องแล้ว ไม่ต้องแก้ไข</p>';
        echo '</div>';

        echo '<a href="dashboard.php" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">กลับ Dashboard</a>';
    }

} else if ($action == 'execute') {
    echo '<div class="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">';
    echo '<h2 class="font-bold text-yellow-800 mb-2">⚙️ กำลังแก้ไขข้อมูล...</h2>';
    echo '</div>';

    $conn->begin_transaction();

    try {
        // Temporarily disable foreign key checks
        $conn->query("SET FOREIGN_KEY_CHECKS = 0");
        echo '<p class="text-sm text-blue-600">🔓 ปิดการตรวจสอบ Foreign Key ชั่วคราว</p>';

        // Delete all existing roles
        $conn->query("DELETE FROM roles");
        echo '<p class="text-sm text-yellow-600">🗑️ ลบข้อมูล roles เดิมทั้งหมด</p>';

        // Insert correct roles
        $stmt = $conn->prepare("INSERT INTO roles (id, role_name) VALUES (?, ?)");

        foreach ($correct_roles as $id => $role_name) {
            $stmt->bind_param("is", $id, $role_name);
            if ($stmt->execute()) {
                echo '<p class="text-sm text-green-700">✅ ID ' . $id . ': เพิ่ม "' . htmlspecialchars($role_name) . '"</p>';
            } else {
                throw new Exception("Error inserting role ID $id: " . $stmt->error);
            }
        }

        $stmt->close();

        // Re-enable foreign key checks
        $conn->query("SET FOREIGN_KEY_CHECKS = 1");
        echo '<p class="text-sm text-blue-600">🔒 เปิดการตรวจสอบ Foreign Key อีกครั้ง</p>';

        $conn->commit();

        echo '<div class="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-green-800 mb-2">✅ แก้ไขสำเร็จ!</h3>';
        echo '<p class="text-green-700">ตาราง roles ถูกสร้างใหม่ให้ถูกต้องแล้ว</p>';
        echo '</div>';

        echo '<div class="mt-6 bg-blue-50 border border-blue-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-blue-800 mb-2">📌 ขั้นตอนถัดไป</h3>';
        echo '<p class="text-blue-700">ตอนนี้ตาราง roles ถูกต้องแล้ว</p>';
        echo '<p class="text-blue-700 mt-2">กรุณาเปิด <a href="check_user_roles.php" class="underline font-bold">check_user_roles.php</a> เพื่อตรวจสอบว่าผู้ใช้มี role_id ถูกต้องหรือไม่</p>';
        echo '</div>';

        echo '<a href="dashboard.php" class="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">กลับ Dashboard</a>';

    } catch (Exception $e) {
        $conn->rollback();
        // Make sure to re-enable foreign keys even on error
        $conn->query("SET FOREIGN_KEY_CHECKS = 1");

        echo '<div class="bg-red-50 border border-red-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-red-800 mb-2">❌ เกิดข้อผิดพลาด</h3>';
        echo '<p class="text-red-700">' . htmlspecialchars($e->getMessage()) . '</p>';
        echo '</div>';

        echo '<a href="fix_roles.php" class="inline-block mt-4 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700">ลองใหม่</a>';
    }
}

echo '</div>';
echo '</body>';
echo '</html>';

$conn->close();
?>