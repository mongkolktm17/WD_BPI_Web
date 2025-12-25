<?php
require_once 'config.php';

// Check roles table
echo "<!DOCTYPE html>";
echo "<html><head><meta charset='UTF-8'><title>Check Roles</title>";
echo "<link href='https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap' rel='stylesheet'>";
echo "<script src='https://cdn.tailwindcss.com'></script>";
echo "<style>body { font-family: 'Sarabun', sans-serif; }</style>";
echo "</head><body class='bg-gray-100 p-8'>";

echo "<div class='max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8'>";
echo "<h1 class='text-3xl font-bold text-gray-800 mb-6'>ตรวจสอบตาราง Roles</h1>";

// Query roles table
$sql = "SELECT * FROM roles ORDER BY id";
$result = $conn->query($sql);

echo "<div class='mb-6'>";
echo "<h2 class='text-2xl font-bold text-gray-700 mb-4'>ข้อมูลในตาราง roles:</h2>";
echo "<table class='min-w-full bg-white border border-gray-300'>";
echo "<thead class='bg-gray-200'>";
echo "<tr>";
echo "<th class='px-4 py-2 border'>ID</th>";
echo "<th class='px-4 py-2 border'>Role Name</th>";
echo "</tr>";
echo "</thead>";
echo "<tbody>";

while ($row = $result->fetch_assoc()) {
    $highlight = '';
    if ($row['id'] == 1)
        $highlight = 'bg-yellow-100';
    if ($row['id'] == 3)
        $highlight = 'bg-green-100';

    echo "<tr class='$highlight'>";
    echo "<td class='px-4 py-2 border text-center font-bold'>" . $row['id'] . "</td>";
    echo "<td class='px-4 py-2 border'>" . htmlspecialchars($row['role_name']) . "</td>";
    echo "</tr>";
}

echo "</tbody>";
echo "</table>";
echo "</div>";

echo "<div class='bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6'>";
echo "<h3 class='font-bold text-blue-800 mb-2'>ค่าที่ควรจะเป็น (ตาม setup.php):</h3>";
echo "<ul class='text-blue-700 list-disc list-inside'>";
echo "<li>ID 1 = ผู้ดูแลระบบ</li>";
echo "<li>ID 2 = หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย</li>";
echo "<li>ID 3 = เจ้าหน้าที่รักษาความปลอดภัย</li>";
echo "<li>ID 4 = เจ้าหน้าที่ตรวจตรา</li>";
echo "</ul>";
echo "</div>";

// Check a sample user
$sql_user = "SELECT u.id, u.username, u.first_name, u.last_name, u.user_type, u.role_id, r.role_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.user_type = 'officer' 
             LIMIT 5";
$result_user = $conn->query($sql_user);

echo "<div class='mb-6'>";
echo "<h2 class='text-2xl font-bold text-gray-700 mb-4'>ตัวอย่างผู้ใช้ (5 คนแรก):</h2>";
echo "<table class='min-w-full bg-white border border-gray-300 text-sm'>";
echo "<thead class='bg-gray-200'>";
echo "<tr>";
echo "<th class='px-3 py-2 border'>ID</th>";
echo "<th class='px-3 py-2 border'>Username</th>";
echo "<th class='px-3 py-2 border'>ชื่อ</th>";
echo "<th class='px-3 py-2 border'>User Type</th>";
echo "<th class='px-3 py-2 border'>Role ID</th>";
echo "<th class='px-3 py-2 border'>Role Name</th>";
echo "</tr>";
echo "</thead>";
echo "<tbody>";

while ($row = $result_user->fetch_assoc()) {
    $row_class = ($row['role_id'] == 1) ? 'bg-red-50' : (($row['role_id'] == 3) ? 'bg-green-50' : 'bg-yellow-50');

    echo "<tr class='$row_class'>";
    echo "<td class='px-3 py-2 border text-center'>" . $row['id'] . "</td>";
    echo "<td class='px-3 py-2 border font-mono'>" . htmlspecialchars($row['username']) . "</td>";
    echo "<td class='px-3 py-2 border'>" . htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) . "</td>";
    echo "<td class='px-3 py-2 border text-center'>" . htmlspecialchars($row['user_type']) . "</td>";
    echo "<td class='px-3 py-2 border text-center font-bold'>" . $row['role_id'] . "</td>";
    echo "<td class='px-3 py-2 border'>" . htmlspecialchars($row['role_name']) . "</td>";
    echo "</tr>";
}

echo "</tbody>";
echo "</table>";
echo "</div>";

// Provide fix if needed
$sql_check = "SELECT id, role_name FROM roles WHERE id = 1";
$result_check = $conn->query($sql_check);
$role_1 = $result_check->fetch_assoc();

if ($role_1 && $role_1['role_name'] != 'ผู้ดูแลระบบ') {
    echo "<div class='bg-red-50 border border-red-300 rounded-lg p-4'>";
    echo "<h3 class='font-bold text-red-800 mb-2'>⚠️ พบปัญหา!</h3>";
    echo "<p class='text-red-700'>Role ID 1 ไม่ใช่ 'ผู้ดูแลระบบ' แต่เป็น '<strong>" . htmlspecialchars($role_1['role_name']) . "</strong>'</p>";
    echo "<p class='text-red-700 mt-2'>นี่อาจทำให้เกิดปัญหาสิทธิ์ผิดพลาด</p>";
    echo "</div>";
}

echo "<div class='mt-6'>";
echo "<a href='dashboard.php' class='bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700'>กลับ Dashboard</a>";
echo "</div>";

echo "</div>";
echo "</body></html>";

$conn->close();
?>