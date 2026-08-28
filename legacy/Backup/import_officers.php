<?php
/**
 * import_officers.php
 * 
 * Bulk import script for importing multiple officers from CSV data.
 * Admin only page.
 */

require_once "check_permissions.php";

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

$message = "";
$error = "";
$import_results = [];

// Process import
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['import_officers'])) {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token. การดำเนินการถูกยกเลิกเพื่อความปลอดภัย";
    } else {
        $csv_data = trim($_POST['csv_data']);
        $role_id = intval($_POST['role_id']);
        $default_phone = trim($_POST['default_phone']);

        if (empty($csv_data) || empty($role_id)) {
            $error = "กรุณากรอกข้อมูล CSV และเลือก Role";
        } else {
            // Parse CSV data
            $lines = explode("\n", $csv_data);
            $imported_count = 0;
            $skipped_count = 0;
            $error_count = 0;

            foreach ($lines as $line_num => $line) {
                $line = trim($line);
                if (empty($line))
                    continue;

                // Skip header line
                if ($line_num == 0 && strpos($line, 'ลำดับ,รหัสพนักงาน') !== false) {
                    continue;
                }

                $fields = str_getcsv($line);
                if (count($fields) < 8) {
                    $import_results[] = "แถวที่ " . ($line_num + 1) . ": ข้อมูลไม่ครบ (ข้ามไป)";
                    $skipped_count++;
                    continue;
                }

                // Parse fields
                $employee_id = trim($fields[1]);
                $first_name = trim($fields[2]);
                $last_name = trim($fields[3]);
                $eng_first_name = trim($fields[4]);
                $eng_last_name = trim($fields[5]);
                $username = trim($fields[6]);
                $password = trim($fields[7]);

                // Validate employee_id (8 digits)
                if (!preg_match("/^[0-9]{8}$/", $employee_id)) {
                    $import_results[] = "แถวที่ " . ($line_num + 1) . " ($employee_id): รหัสพนักงานไม่ถูกต้อง (ต้องเป็น 8 หลัก)";
                    $error_count++;
                    continue;
                }

                // Use default phone number
                $phone_number = $default_phone;
                if (!preg_match("/^[0-9]{10}$/", $phone_number)) {
                    $phone_number = "0000000000"; // Fallback
                }

                // Check if user already exists
                $sql_check = "SELECT id FROM users WHERE employee_id = ? OR username = ?";
                $stmt_check = $conn->prepare($sql_check);
                $stmt_check->bind_param("ss", $employee_id, $username);
                $stmt_check->execute();
                if ($stmt_check->get_result()->num_rows > 0) {
                    $import_results[] = "แถวที่ " . ($line_num + 1) . " ($employee_id - $username): มีอยู่แล้วในระบบ (ข้ามไป)";
                    $stmt_check->close();
                    $skipped_count++;
                    continue;
                }
                $stmt_check->close();

                // Insert new user
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                $sql_insert = "INSERT INTO users (first_name, last_name, eng_first_name, eng_last_name, employee_id, phone_number, username, password, user_type, role_id) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'officer', ?)";
                $stmt_insert = $conn->prepare($sql_insert);
                $stmt_insert->bind_param("ssssssssi", $first_name, $last_name, $eng_first_name, $eng_last_name, $employee_id, $phone_number, $username, $hashed_password, $role_id);

                if ($stmt_insert->execute()) {
                    $imported_count++;
                    $import_results[] = "✓ แถวที่ " . ($line_num + 1) . " ($employee_id - $first_name $last_name): นำเข้าสำเร็จ";
                } else {
                    $error_count++;
                    $import_results[] = "✗ แถวที่ " . ($line_num + 1) . " ($employee_id): เกิดข้อผิดพลาด - " . $stmt_insert->error;
                }
                $stmt_insert->close();
            }

            $message = "นำเข้าข้อมูลเสร็จสิ้น: สำเร็จ $imported_count รายการ, ข้ามไป $skipped_count รายการ, ผิดพลาด $error_count รายการ";
        }
    }
}

// Fetch roles for the dropdown
$roles = [];
$sql = "SELECT id, role_name FROM roles ORDER BY role_name";
$stmt = $conn->prepare($sql);
if ($stmt) {
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $roles[] = $row;
    }
    $stmt->close();
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>นำเข้าข้อมูลเจ้าหน้าที่แบบกลุ่ม</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-100">

    <div class="container mx-auto p-4 sm:p-6 lg:p-8">
        <header class="mb-8">
            <div class="flex justify-between items-center">
                <h1 class="text-3xl font-bold text-gray-800">นำเข้าข้อมูลเจ้าหน้าที่แบบกลุ่ม</h1>
                <div class="space-x-2">
                    <a href="manage_officers.php"
                        class="text-sm bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">จัดการเจ้าหน้าที่</a>
                    <a href="dashboard.php"
                        class="text-sm bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">กลับ
                        Dashboard</a>
                </div>
            </div>
        </header>

        <?php if (!empty($message)): ?>
            <div class="mb-4 p-4 rounded-lg bg-green-100 text-green-700"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        <?php if (!empty($error)): ?>
            <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <!-- Import Results -->
        <?php if (!empty($import_results)): ?>
            <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
                <h2 class="text-2xl font-bold mb-4 text-gray-800">ผลการนำเข้า</h2>
                <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <ul class="space-y-1 text-sm font-mono">
                        <?php foreach ($import_results as $result): ?>
                            <li
                                class="<?php echo strpos($result, '✓') !== false ? 'text-green-600' : (strpos($result, '✗') !== false ? 'text-red-600' : 'text-yellow-600'); ?>">
                                <?php echo htmlspecialchars($result); ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
        <?php endif; ?>

        <!-- Import Form -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">นำเข้าข้อมูลจาก CSV</h2>

            <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 class="font-bold text-blue-800 mb-2">คำแนะนำ:</h3>
                <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>วางข้อมูล CSV ในรูปแบบ:
                        ลำดับ,รหัสพนักงาน,ชื่อไทย,นามสกุลไทย,ชื่ออังกฤษ,นามสกุลอังกฤษ,username,password</li>
                    <li>รหัสพนักงานต้องเป็นตัวเลข 8 หลัก</li>
                    <li>ระบบจะข้ามผู้ใช้ที่มีรหัสพนักงานหรือชื่อผู้ใช้ซ้ำในระบบ</li>
                    <li>รหัสผ่านจะถูกเข้ารหัสอัตโนมัติก่อนบันทึกลงฐานข้อมูล</li>
                </ul>
            </div>

            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                <div class="mb-6">
                    <label for="csv_data" class="block text-sm font-medium text-gray-700 mb-2">ข้อมูล CSV</label>
                    <textarea name="csv_data" id="csv_data" rows="15"
                        class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                        placeholder="วางข้อมูล CSV ที่นี่..." required></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label for="role_id" class="block text-sm font-medium text-gray-700 mb-2">Role
                            สำหรับทุกคน</label>
                        <select name="role_id" id="role_id"
                            class="form-select w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                            <option value="">เลือก Role</option>
                            <?php foreach ($roles as $role): ?>
                                <option value="<?php echo $role['id']; ?>">
                                    <?php echo htmlspecialchars($role['role_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div>
                        <label for="default_phone"
                            class="block text-sm font-medium text-gray-700 mb-2">เบอร์โทรศัพท์เริ่มต้น (10 หลัก)</label>
                        <input type="tel" name="default_phone" id="default_phone" pattern="[0-9]{10}" maxlength="10"
                            value="0000000000" oninput="this.value = this.value.replace(/[^0-9]/g, '');"
                            class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                        <p class="text-xs text-gray-500 mt-1">เบอร์นี้จะถูกใช้สำหรับทุกคน (สามารถแก้ไขทีหลังได้)</p>
                    </div>
                </div>

                <div>
                    <button type="submit" name="import_officers"
                        class="w-full md:w-auto bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors">
                        นำเข้าข้อมูล
                    </button>
                </div>
            </form>
        </div>

        <!-- Sample Data Section -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">ตัวอย่างข้อมูล CSV</h2>
            <div class="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <pre class="text-xs font-mono">ลำดับ,รหัสพนักงาน,ชื่อภาษาไทย,นามสกุลภาษาไทย,ชื่อภาษาอังกฤษ,นามสกุลภาษาอังกฤษ,username,password
1,10354996,เกษร,บุตยา,KESORN,BOOTYA,kesorn,10354996
2,10365851,ศิริวรรณ,นรอ่อน,SIRIWAN,NORAON,siriwan,10365851
3,10368820,สังวาลย์,ตู้สุวรรณ,SUNGWAN,TOOSUWAN,sungwan,10368820</pre>
            </div>
        </div>
    </div>

</body>

</html>