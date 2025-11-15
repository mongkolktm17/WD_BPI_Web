<?php
require_once "check_permissions.php";
require_once "config.php";

// Pre-fill form data from logged-in user's session
$employee_id_from_session = $_SESSION['employee_id'] ?? '';
$full_name_from_session = isset($_SESSION['first_name']) ? trim($_SESSION['first_name'] . ' ' . $_SESSION['last_name']) : '';

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

/**
 * Submits a new metal detector check report.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data from the form.
 * @return array A result array with 'message' and 'error' keys.
 */
function submitMetalDetectorCheck($conn, $data) {
    $required_fields = [
        'date', 'shift', 'employee_id', 'employee_name', 'building', 'guard_post', 
        'scanner_brand', 'zone1_status', 'zone2_status', 'zone3_status', 
        'zone4_status', 'zone5_status', 'zone6_status'
    ];
    foreach ($required_fields as $field) {
        if (empty(trim($data[$field]))) {
            return ['message' => '', 'error' => 'กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน'];
        }
    }

    // Assign variables
    $inspection_date = trim($data['date']);
    $shift = trim($data['shift']);
    $employee_id = trim($data['employee_id']);
    $employee_name = trim($data['employee_name']);
    $building = trim($data['building']);
    $guard_post = trim($data['guard_post']);
    $scanner_brand = trim($data['scanner_brand']);
    $zone1_status = trim($data['zone1_status']);
    $zone2_status = trim($data['zone2_status']);
    $zone3_status = trim($data['zone3_status']);
    $zone4_status = trim($data['zone4_status']);
    $zone5_status = trim($data['zone5_status']);
    $zone6_status = trim($data['zone6_status']);
    $submitted_by_id = $_SESSION['id'];

    $sql = "INSERT INTO metal_detector_checks (
                inspection_date, shift, employee_id, employee_name, building, guard_post, 
                scanner_brand, zone1_status, zone2_status, zone3_status, 
                zone4_status, zone5_status, zone6_status, submitted_by_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("sssssssssssssi", 
            $inspection_date, $shift, $employee_id, $employee_name, $building, $guard_post,
            $scanner_brand, $zone1_status, $zone2_status, $zone3_status,
            $zone4_status, $zone5_status, $zone6_status, $submitted_by_id
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
        $result = submitMetalDetectorCheck($conn, $_POST);
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
    <title>Walkthrough Metal Detector</title>
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
                        <img src="report_assets/Images/metal-detector-gate.png" alt="Metal Detector" class="w-8 h-8">
                    </div>
                    <h1 class="text-3xl font-bold section-title mb-3">Walkthrough Metal Detector</h1>
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
                        <label for="date" class="block text-sm font-medium text-gray-700 mb-2">1. วันที่ เดือน ปี (Date) <span class="text-red-500">*</span></label>
                        <input type="date" id="date" name="date" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">2. กะ (Shift) <span class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'shift', 'เช้า')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">🌅 เช้า</button>
                            <button type="button" onclick="toggleButton(this, 'shift', 'ดึก')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-purple-300 hover:bg-purple-50 font-medium">🌙 ดึก</button>
                        </div>
                        <input type="hidden" id="shift" name="shift" required>
                    </div>
                    <div>
                        <label for="employee_id" class="block text-sm font-medium text-gray-700 mb-2">3. รหัสพนักงาน (PCS) <span class="text-red-500">*</span></label>
                        <input type="text" id="employee_id" name="employee_id" placeholder="กรอกรหัสพนักงาน" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700" value="<?php echo htmlspecialchars($employee_id_from_session); ?>">
                    </div>
                    <div>
                        <label for="employee_name" class="block text-sm font-medium text-gray-700 mb-2">4. ชื่อ-นามสกุล <span class="text-red-500">*</span></label>
                        <input type="text" id="employee_name" name="employee_name" placeholder="กรอกชื่อ-นามสกุล" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700" value="<?php echo htmlspecialchars($full_name_from_session); ?>">
                    </div>
                    <div>
                        <label for="building" class="block text-sm font-medium text-gray-700 mb-2">5. ตึก (Building) <span class="text-red-500">*</span></label>
                        <select id="building" name="building" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                            <option value="" disabled selected>เลือกอาคาร</option>
                            <option value="B2">B2</option>
                            <option value="B3">B3</option>
                            <option value="B4">B4</option>
                            <option value="B6">B6</option>
                        </select>
                    </div>
                    <div>
                        <label for="guard_post" class="block text-sm font-medium text-gray-700 mb-2">6. จุดรักษาการณ์ (Guard Post) <span class="text-red-500">*</span></label>
                        <select id="guard_post" name="guard_post" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                            <option value="" disabled selected>เลือกจุดรักษาการณ์</option>
                            <option value="Post 1">Post 1</option>
                            <option value="Post 2">Post 2</option>
                        </select>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-3">7. ยี่ห้อตู้สแกน (Scanner Brand) <span class="text-red-500">*</span></label>
                    <div class="flex gap-3">
                        <button type="button" onclick="toggleButton(this, 'scanner_brand', 'GARRETT')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">GARRETT</button>
                        <button type="button" onclick="toggleButton(this, 'scanner_brand', 'อื่นๆ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">อื่นๆ (Other)</button>
                    </div>
                    <input type="hidden" id="scanner_brand" name="scanner_brand" required>
                </div>

                <div class="space-y-6">
                    <?php for ($i = 1; $i <= 6; $i++): ?>
                        <div class="border-t border-gray-200 pt-6">
                            <label class="block text-sm font-medium text-gray-700 mb-3">ตรวจสอบตู้ Walkthrough Scan โซนที่ <?php echo $i; ?> <span class="text-red-500">*</span></label>
                            <div class="flex gap-3">
                                <button type="button" onclick="toggleButton(this, 'zone<?php echo $i; ?>_status', 'พร้อมใช้งาน')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"><span class="text-lg">✓</span> พร้อมใช้งาน</button>
                                <button type="button" onclick="toggleButton(this, 'zone<?php echo $i; ?>_status', 'ไม่พร้อมใช้งาน')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"><span class="text-lg">✗</span> ไม่พร้อมใช้งาน</button>
                                <button type="button" onclick="toggleButton(this, 'zone<?php echo $i; ?>_status', 'อื่นๆ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-yellow-300 hover:bg-yellow-50 font-medium">อื่นๆ</button>
                            </div>
                            <input type="hidden" id="zone<?php echo $i; ?>_status" name="zone<?php echo $i; ?>_status" required>
                        </div>
                    <?php endfor; ?>
                </div>

                <div class="text-center pt-6">
                    <button type="submit" class="submit-btn-modern text-white py-4 px-12 rounded-3xl text-lg">ส่งรายงาน</button>
                </div>
            </form>
        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
        });

        function toggleButton(clickedButton, fieldName, value) {
            const buttons = clickedButton.parentElement.querySelectorAll('.toggle-btn');
            buttons.forEach(btn => {
                btn.classList.remove('border-green-500', 'bg-green-100', 'text-green-700', 'border-red-500', 'bg-red-100', 'text-red-700', 'border-yellow-500', 'bg-yellow-100', 'text-yellow-700', 'border-sky-500', 'bg-sky-100', 'text-sky-700', 'border-purple-500', 'bg-purple-100', 'text-purple-700');
                btn.classList.add('border-gray-200', 'text-gray-600');
            });

            let activeClasses = [];
            if (value === 'พร้อมใช้งาน') {
                activeClasses = ['border-green-500', 'bg-green-100', 'text-green-700'];
            } else if (value === 'ไม่พร้อมใช้งาน') {
                activeClasses = ['border-red-500', 'bg-red-100', 'text-red-700'];
            } else if (value === 'อื่นๆ') {
                activeClasses = ['border-yellow-500', 'bg-yellow-100', 'text-yellow-700'];
            } else if (value === 'เช้า') {
                activeClasses = ['border-sky-500', 'bg-sky-100', 'text-sky-700'];
            } else if (value === 'ดึก') {
                activeClasses = ['border-purple-500', 'bg-purple-100', 'text-purple-700'];
            } else {
                activeClasses = ['border-sky-500', 'bg-sky-100', 'text-sky-700'];
            }

            clickedButton.classList.remove('border-gray-200', 'text-gray-600');
            clickedButton.classList.add(...activeClasses);
            document.getElementById(fieldName).value = value;
        }
    </script>

</body>
</html>