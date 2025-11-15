<?php
require_once "check_permissions.php";
require_once "config.php";

// --- Check and Add cctv_room column if not exists ---
$check_column_sql = "SHOW COLUMNS FROM `cctv_inspections` LIKE 'cctv_room'";
$result = $conn->query($check_column_sql);
if ($result && $result->num_rows == 0) {
    $alter_sql = "ALTER TABLE `cctv_inspections` ADD `cctv_room` VARCHAR(255) NOT NULL AFTER `shift`";
    if (!$conn->query($alter_sql)) {
        // Handle error if alter fails, though we might just let it fail silently for now
    }
}

// Pre-fill form data from logged-in user's session
$employee_id_from_session = $_SESSION['employee_id'] ?? '';
$full_name_from_session = isset($_SESSION['first_name']) ? trim($_SESSION['first_name'] . ' ' . $_SESSION['last_name']) : '';

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

/**
 * Submits a new CCTV inspection report.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data from the form.
 * @return array A result array with 'message' and 'error' keys.
 */
function submitCctvInspection($conn, $data) {
    $required_fields = [
        'inspection_date', 'shift', 'cctv_room', 'employee_id', 'employee_name', 
        'radio_status', 'report_books_status', 'nvr_screen_status', 
        'nvr_machine_status', 'keys_status', 'access_control_status', 'incident_report_status'
    ];
    foreach ($required_fields as $field) {
        if (empty(trim($data[$field]))) {
            return ['message' => '', 'error' => 'กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน'];
        }
    }

    // Assign variables
    $inspection_date = trim($data['inspection_date']);
    $shift = trim($data['shift']);
    $cctv_room = trim($data['cctv_room']);
    $employee_id = trim($data['employee_id']);
    $employee_name = trim($data['employee_name']);
    $radio_status = trim($data['radio_status']);
    $report_books_status = trim($data['report_books_status']);
    $nvr_screen_status = trim($data['nvr_screen_status']);
    $nvr_machine_status = trim($data['nvr_machine_status']);
    $keys_status = trim($data['keys_status']);
    $access_control_status = trim($data['access_control_status']);
    $incident_report_status = trim($data['incident_report_status']);
    $submitted_by_id = $_SESSION['id'];

    $sql = "INSERT INTO cctv_inspections (inspection_date, shift, cctv_room, employee_id, employee_name, radio_status, report_books_status, nvr_screen_status, nvr_machine_status, keys_status, access_control_status, incident_report_status, submitted_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("ssssssssssssi", 
            $inspection_date, $shift, $cctv_room, $employee_id, $employee_name, 
            $radio_status, $report_books_status, $nvr_screen_status, $nvr_machine_status, 
            $keys_status, $access_control_status, $incident_report_status, $submitted_by_id
        );
        if ($stmt->execute()) {
            return ['message' => 'ส่งรายงานการตรวจเช็คเรียบร้อยแล้ว', 'error' => ''];
        } else {
            return ['message' => '', 'error' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' . $stmt->error];
        }
    } else {
        return ['message' => '', 'error' => 'เกิดข้อผิดพลาดในการเตรียมข้อมูล: ' . $conn->error];
    }
}

// --- Main Logic ---
$message = "";
$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token. การดำเนินการถูกยกเลิกเพื่อความปลอดภัย";
    } else {
        $result = submitCctvInspection($conn, $_POST);
        $message = $result['message'];
        $error = $result['error'];
    }
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แบบฟอร์มการตรวจสอบห้อง CCTV</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="theme.css">
</head>
<body class="custom-font" style="background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);">
    <main class="min-h-full py-8 px-4">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="glass-card rounded-3xl shadow-xl p-8 mb-8 relative">
                <a href="report_page.php" class="absolute top-4 right-4 bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded-xl hover:bg-blue-300 transition-colors shadow-md">กลับ หน้ารายงาน</a>
                <div class="text-center">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-white"><path stroke-linecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg>
                    </div>
                    <h1 class="text-3xl font-bold section-title mb-3">แบบฟอร์มการตรวจสอบห้อง CCTV</h1>
                    <p class="text-gray-600 text-lg font-medium">กรอกข้อมูลให้ครบถ้วน</p>
                </div>
            </div>

            <?php if (!empty($message)):
                ?>
                <div class="mb-4 p-4 rounded-lg bg-green-100 text-green-700"><?php echo htmlspecialchars($message); ?></div>
            <?php endif;
            ?>
            <?php if (!empty($error)):
                ?>
                <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error); ?></div>
            <?php endif;
            ?>

            <!-- Form -->
            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]);?>" method="POST" class="glass-card rounded-3xl shadow-xl p-8 border border-sky-100 space-y-6">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="inspection_date" class="block text-sm font-medium text-gray-700 mb-2">1. วันที่ตรวจเช็ค <span class="text-red-500">*</span></label>
                        <input type="date" id="inspection_date" name="inspection_date" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">2. กะ <span class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'shift', 'เช้า')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">🌅 เช้า</button>
                            <button type="button" onclick="toggleButton(this, 'shift', 'ดึก')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-purple-300 hover:bg-purple-50 font-medium">🌙 ดึก</button>
                        </div>
                        <input type="hidden" id="shift" name="shift" required>
                    </div>
                    <div>
                        <label for="cctv_room" class="block text-sm font-medium text-gray-700 mb-2">3. ห้อง CCTV <span class="text-red-500">*</span></label>
                        <select id="cctv_room" name="cctv_room" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                            <option value="" disabled selected>เลือกห้อง</option>
                            <option value="B2">B2</option>
                            <option value="B4">B4</option>
                        </select>
                    </div>
                    <div>
                        <label for="employee_id" class="block text-sm font-medium text-gray-700 mb-2">4. รหัสพนักงาน <span class="text-red-500">*</span></label>
                        <input type="text" id="employee_id" name="employee_id" placeholder="กรอกรหัสพนักงาน" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700" value="<?php echo htmlspecialchars($employee_id_from_session); ?>">
                    </div>
                    <div class="md:col-span-2">
                        <label for="employee_name" class="block text-sm font-medium text-gray-700 mb-2">5. ชื่อผู้ตรวจ <span class="text-red-500">*</span></label>
                        <input type="text" id="employee_name" name="employee_name" placeholder="กรอกชื่อผู้ตรวจ" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700" value="<?php echo htmlspecialchars($full_name_from_session); ?>">
                    </div>
                </div>

                <div class="space-y-6">
                    <?php 
                    $items = [
                        'radio_status' => '6. วิทยุสื่อสาร',
                        'report_books_status' => '7. สมุดรายงาน',
                        'nvr_screen_status' => '8. หน้าจอ NVR',
                        'nvr_machine_status' => '9. เครื่อง NVR',
                        'keys_status' => '10. กุญแจ',
                        'access_control_status' => '11. Access Control',
                        'incident_report_status' => '12. สมุดรายงานเหตุการณ์'
                    ];
                    foreach ($items as $name => $label): ?>
                        <div class="border-t border-gray-200 pt-6">
                            <label class="block text-sm font-medium text-gray-700 mb-3"><?php echo $label; ?> <span class="text-red-500">*</span></label>
                            <div class="flex gap-3">
                                <button type="button" onclick="toggleButton(this, '<?php echo $name; ?>', 'ปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"><span class="text-lg">✓</span> ปกติ</button>
                                <button type="button" onclick="toggleButton(this, '<?php echo $name; ?>', 'ผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"><span class="text-lg">✗</span> ผิดปกติ</button>
                            </div>
                            <input type="hidden" id="<?php echo $name; ?>" name="<?php echo $name; ?>" required>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div class="text-center pt-6">
                    <button type="submit" class="submit-btn-modern text-white py-4 px-12 rounded-3xl text-lg">ส่งรายงาน</button>
                </div>
            </form>
        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('inspection_date').value = new Date().toISOString().split('T')[0];
        });

        function toggleButton(clickedButton, fieldName, value) {
            const buttons = clickedButton.parentElement.querySelectorAll('.toggle-btn');
            buttons.forEach(btn => {
                btn.classList.remove('border-green-500', 'bg-green-100', 'text-green-700', 'border-red-500', 'bg-red-100', 'text-red-700', 'border-sky-500', 'bg-sky-100', 'text-sky-700', 'border-purple-500', 'bg-purple-100', 'text-purple-700');
                btn.classList.add('border-gray-200', 'text-gray-600');
            });

            let activeClasses = [];
            if (value === 'ปกติ') {
                activeClasses = ['border-green-500', 'bg-green-100', 'text-green-700'];
            } else if (value === 'ผิดปกติ') {
                activeClasses = ['border-red-500', 'bg-red-100', 'text-red-700'];
            } else if (value === 'เช้า') {
                activeClasses = ['border-sky-500', 'bg-sky-100', 'text-sky-700'];
            } else if (value === 'ดึก') {
                activeClasses = ['border-purple-500', 'bg-purple-100', 'text-purple-700'];
            }

            clickedButton.classList.remove('border-gray-200', 'text-gray-600');
            clickedButton.classList.add(...activeClasses);
            document.getElementById(fieldName).value = value;
        }
    </script>

</body>
</html>