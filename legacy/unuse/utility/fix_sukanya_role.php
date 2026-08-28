&lt;?php
/**
* fix_sukanya_role.php
*
* Script to fix the user role for sukanya user(s)
* Changes user_type from 'admin' to 'officer' and sets role_id to 3 (Security Officer)
*/

require_once 'config.php';

// Initialize variables
$action = isset($_GET['action']) ? $_GET['action'] : 'check';
$employee_id = isset($_POST['employee_id']) ? trim($_POST['employee_id']) : '';

echo '&lt;!DOCTYPE html&gt;';
echo '&lt;html lang="th"&gt;';
echo '&lt;head&gt;';
echo '&lt;meta charset="UTF-8"&gt;';
echo '&lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;';
echo '&lt;title&gt;Fix Sukanya User Role&lt;/title&gt;';
echo '&lt;link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png"&gt;';
echo '&lt;script src="https://cdn.tailwindcss.com"&gt;&lt;/script&gt;';
echo '&lt;link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&amp;display=swap"
rel="stylesheet"&gt;';
echo '&lt;style&gt;body { font-family: "Sarabun", sans-serif; }&lt;/style&gt;';
echo '&lt;/head&gt;';
echo '&lt;body class="bg-gray-100 p-8"&gt;';

echo '&lt;div class="max-w-4xl mx-auto"&gt;';
echo '&lt;div class="bg-white rounded-lg shadow-lg p-8 mb-6"&gt;';
echo '&lt;h1 class="text-3xl font-bold text-gray-800 mb-6"&gt;แก้ไขบทบาทผู้ใช้ sukanya&lt;/h1&gt;';

// --- Check current state ---
$sql = "SELECT id, username, user_type, role_id, first_name, last_name, employee_id, phone_number
FROM users
WHERE username LIKE '%sukanya%' OR first_name LIKE '%สุกัญญา%'";
$result = $conn-&gt;query($sql);

echo '&lt;div class="mb-6"&gt;';
echo '&lt;h2 class="text-2xl font-bold text-gray-700 mb-4"&gt;ผู้ใช้ sukanya ในระบบ:&lt;/h2&gt;';

if ($result &amp;&amp; $result-&gt;num_rows &gt; 0) {
echo '&lt;div class="overflow-x-auto"&gt;';
echo '&lt;table class="min-w-full bg-white border border-gray-300"&gt;';
echo '&lt;thead class="bg-gray-200"&gt;';
echo '&lt;tr&gt;';
echo '&lt;th class="px-4 py-2 border"&gt;ID&lt;/th&gt;';
echo '&lt;th class="px-4 py-2 border"&gt;Username&lt;/th&gt;';
echo '&lt;th class="px-4 py-2 border"&gt;ชื่อ-นามสกุล&lt;/th&gt;';
echo '&lt;th class="px-4 py-2 border"&gt;รหัสพนักงาน&lt;/th&gt;';
echo '&lt;th class="px-4 py-2 border"&gt;User Type&lt;/th&gt;';
echo '&lt;th class="px-4 py-2 border"&gt;Role ID&lt;/th&gt;';
echo '&lt;th class="px-4 py-2 border"&gt;สถานะ&lt;/th&gt;';
echo '&lt;/tr&gt;';
echo '&lt;/thead&gt;';
echo '&lt;tbody&gt;';

while ($row = $result-&gt;fetch_assoc()) {
$is_admin = ($row['user_type'] == 'admin');
$needs_fix = $is_admin || ($row['user_type'] == 'officer' &amp;&amp; $row['role_id'] != 3);
$row_class = $needs_fix ? 'bg-red-50' : 'bg-green-50';

echo '&lt;tr class="' . $row_class . '"&gt;';
echo '&lt;td class="px-4 py-2 border text-center"&gt;' . htmlspecialchars($row['id']) . '&lt;/td&gt;';
echo '&lt;td class="px-4 py-2 border"&gt;' . htmlspecialchars($row['username']) . '&lt;/td&gt;';
echo '&lt;td class="px-4 py-2 border"&gt;' . htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) .
'&lt;/td&gt;';
echo '&lt;td class="px-4 py-2 border text-center"&gt;' . htmlspecialchars($row['employee_id']) . '&lt;/td&gt;';
echo '&lt;td class="px-4 py-2 border text-center"&gt;&lt;span class="' . ($is_admin ? 'text-red-600 font-bold' :
'text-green-600') . '"&gt;' . htmlspecialchars($row['user_type']) . '&lt;/span&gt;&lt;/td&gt;';
echo '&lt;td class="px-4 py-2 border text-center"&gt;' . htmlspecialchars($row['role_id'] ?? 'NULL') . '&lt;/td&gt;';

if ($needs_fix) {
echo '&lt;td class="px-4 py-2 border text-center"&gt;&lt;span class="text-red-600 font-bold"&gt;❌
ต้องแก้ไข&lt;/span&gt;&lt;/td&gt;';
} else {
echo '&lt;td class="px-4 py-2 border text-center"&gt;&lt;span class="text-green-600 font-bold"&gt;✅
ถูกต้อง&lt;/span&gt;&lt;/td&gt;';
}
echo '&lt;/tr&gt;';
}

echo '&lt;/tbody&gt;';
echo '&lt;/table&gt;';
echo '&lt;/div&gt;';
} else {
echo '&lt;p class="text-gray-600"&gt;ไม่พบผู้ใช้ sukanya ในระบบ&lt;/p&gt;';
}
echo '&lt;/div&gt;';

// --- Show role information ---
echo '&lt;div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4"&gt;';
echo '&lt;h3 class="font-bold text-blue-800 mb-2"&gt;ข้อมูล Roles:&lt;/h3&gt;';
$sql_roles = "SELECT id, role_name FROM roles ORDER BY id";
$result_roles = $conn-&gt;query($sql_roles);
if ($result_roles &amp;&amp; $result_roles-&gt;num_rows &gt; 0) {
echo '&lt;ul class="list-disc list-inside text-blue-700"&gt;';
while ($role = $result_roles-&gt;fetch_assoc()) {
$highlight = ($role['id'] == 3) ? ' class="font-bold"' : '';
echo '&lt;li' . $highlight . '&gt;Role ID ' . $role['id'] . ': ' . htmlspecialchars($role['role_name']) . '&lt;/li&gt;';
}
echo '&lt;/ul&gt;';
}
echo '&lt;/div&gt;';

// --- Fix action ---
if ($action == 'fix' &amp;&amp; !empty($employee_id)) {
echo '&lt;div class="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4"&gt;';
echo '&lt;h3 class="font-bold text-yellow-800 mb-2"&gt;กำลังแก้ไข...&lt;/h3&gt;';

$sql_update = "UPDATE users
SET user_type = 'officer', role_id = 3
WHERE employee_id = ?";
$stmt = $conn-&gt;prepare($sql_update);
$stmt-&gt;bind_param("s", $employee_id);

if ($stmt-&gt;execute()) {
echo '&lt;p class="text-green-700 font-bold"&gt;✅ แก้ไขสำเร็จ! อัพเดต ' . $stmt-&gt;affected_rows . ' รายการ&lt;/p&gt;';
echo '&lt;p class="text-gray-600 mt-2"&gt;รหัสพนักงาน: ' . htmlspecialchars($employee_id) . ' ถูกเปลี่ยนเป็น
user_type="officer" และ role_id=3&lt;/p&gt;';
echo '&lt;a href="fix_sukanya_role.php" class="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded
hover:bg-blue-700"&gt;รีเฟรชหน้า&lt;/a&gt;';
} else {
echo '&lt;p class="text-red-700 font-bold"&gt;❌ เกิดข้อผิดพลาด: ' . htmlspecialchars($stmt-&gt;error) . '&lt;/p&gt;';
}
$stmt-&gt;close();
echo '&lt;/div&gt;';
}

// --- Fix all button ---
echo '&lt;div class="mt-6"&gt;';
echo '&lt;h3 class="text-xl font-bold text-gray-700 mb-4"&gt;แก้ไขผู้ใช้:&lt;/h3&gt;';
echo '&lt;form method="POST" action="fix_sukanya_role.php?action=fix" class="space-y-4"&gt;';
echo '&lt;div&gt;';
echo '&lt;label class="block text-sm font-medium text-gray-700 mb-2"&gt;เลือกรหัสพนักงานที่ต้องการแก้ไข:&lt;/label&gt;';
echo '&lt;select name="employee_id" class="form-select w-full px-4 py-2 border border-gray-300 rounded" required&gt;';
echo '&lt;option value=""&gt;-- เลือกรหัสพนักงาน --&lt;/option&gt;';

// Re-query to populate the select
$result2 = $conn-&gt;query($sql);
if ($result2 &amp;&amp; $result2-&gt;num_rows &gt; 0) {
while ($row = $result2-&gt;fetch_assoc()) {
$needs_fix = ($row['user_type'] == 'admin') || ($row['user_type'] == 'officer' &amp;&amp; $row['role_id'] != 3);
$label = $row['employee_id'] . ' - ' . $row['first_name'] . ' ' . $row['last_name'] . ' (' . $row['username'] . ')';
if ($needs_fix) {
$label .= ' [ต้องแก้ไข]';
}
echo '&lt;option value="' . htmlspecialchars($row['employee_id']) . '"&gt;' . htmlspecialchars($label) .
'&lt;/option&gt;';
}
}
echo '&lt;/select&gt;';
echo '&lt;/div&gt;';
echo '&lt;button type="submit" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700
font-bold"&gt;แก้ไขบทบาทเป็น Security Officer&lt;/button&gt;';
echo '&lt;a href="dashboard.php" class="inline-block ml-4 bg-gray-600 text-white px-6 py-2 rounded
hover:bg-gray-700"&gt;กลับ Dashboard&lt;/a&gt;';
echo '&lt;/form&gt;';
echo '&lt;/div&gt;';

echo '&lt;/div&gt;';
echo '&lt;/div&gt;';

echo '&lt;/body&gt;';
echo '&lt;/html&gt;';

$conn-&gt;close();
?&gt;