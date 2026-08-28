<?php
// 1. Includes, Permissions, and Session Setup
require_once "check_permissions.php";
require_once "config.php"; // Ensure session and db connection are active

// Pre-fill form data from logged-in user's session
$employee_id_from_session = $_SESSION['employee_id'] ?? '';
$full_name_from_session = isset($_SESSION['first_name']) ? trim($_SESSION['first_name'] . ' ' . $_SESSION['last_name']) : '';


// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

// --- Function Definitions ---

/**
 * Submits a new report to the database.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data from the form.
 * @return array A result array with 'message' and 'error' keys.
 */
function submitReport($conn, $data) {
    $required_fields = ['report-date', 'employee-id', 'full-name', 'shift', 'building', 'guard-post', 'report-time', 'incident-report'];
    foreach ($required_fields as $field) {
        if (empty(trim($data[$field]))) {
            return ['message' => '', 'error' => 'กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน'];
        }
    }

    // Assign variables by trimming whitespace. DO NOT escape them here.
    $report_date = trim($data['report-date']);
    $employee_id = trim($data['employee-id']);
    $full_name = trim($data['full-name']);
    $shift = trim($data['shift']);
    $building = trim($data['building']);
    $guard_post = trim($data['guard-post']);
    $report_time = trim($data['report-time']);
    $incident_report = trim($data['incident-report']);
    $special_incident = trim($data['special-incident']);
    $emergency_incident = trim($data['emergency-incident']);

    $sql = "INSERT INTO reports (report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    if ($stmt = $conn->prepare($sql)) {
        // Bind parameters directly. This is the secure method.
        $stmt->bind_param("ssssssssss", 
            $report_date, $employee_id, $full_name, $shift, $building, 
            $guard_post, $report_time, $incident_report, $special_incident, $emergency_incident
        );
        
        if ($stmt->execute()) {
            return ['message' => 'ส่งรายงานเรียบร้อยแล้ว', 'error' => ''];
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
        $result = submitReport($conn, $_POST);
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
    <title>รายงานประจำวัน</title>
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
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-white"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    </div>
                    <h1 class="text-3xl font-bold section-title mb-3">รายงานประจำวัน</h1>
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
                        <label for="report-date" class="block text-sm font-medium text-gray-700 mb-2">1. วัน เดือน ปี <span class="text-red-500">*</span></label>
                        <input type="date" id="report-date" name="report-date" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                    </div>
                    <div>
                        <label for="employee-id" class="block text-sm font-medium text-gray-700 mb-2">2. รหัสพนักงาน PCS (8 หลัก) <span class="text-red-500">*</span></label>
                        <input type="text" id="employee-id" name="employee-id" placeholder="กรอกรหัสพนักงาน" required maxlength="8" class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700" value="<?php echo htmlspecialchars($employee_id_from_session); ?>">
                    </div>
                    <div class="md:col-span-2">
                        <label for="full-name" class="block text-sm font-medium text-gray-700 mb-2">3. ชื่อ นามสกุล <span class="text-red-500">*</span></label>
                        <div class="relative w-full">
                            <input type="text" id="full-name" name="full-name" placeholder="กรอกชื่อและนามสกุล หรือใช้ไมโครโฟน" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700 pr-12" value="<?php echo htmlspecialchars($full_name_from_session); ?>">
                            <button type="button" id="mic-full-name" onclick="startSpeechRecognition('full-name')" class="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-blue-600"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path></svg></button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">4. กะ <span class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'shift', 'เช้า')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">🌅 เช้า</button>
                            <button type="button" onclick="toggleButton(this, 'shift', 'ดึก')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-purple-300 hover:bg-purple-50 font-medium">🌙 ดึก</button>
                        </div>
                        <input type="hidden" id="shift" name="shift" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">5. อาคาร <span class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'building', '4')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">4</button>
                            <button type="button" onclick="toggleButton(this, 'building', '6')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">6</button>
                            <button type="button" onclick="toggleButton(this, 'building', '8')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">8</button>
                        </div>
                        <input type="hidden" id="building" name="building" required>
                    </div>
                    <div>
                        <label for="guard-post" class="block text-sm font-medium text-gray-700 mb-2">6. จุดรักษาการณ์ <span class="text-red-500">*</span></label>
                        <select id="guard-post" name="guard-post" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                            <option value="" disabled selected>เลือกจุดรักษาการณ์</option>
                            <option value="Gate 1">Gate 1</option> <option value="Gate 5">Gate 5</option> <option value="Gate 6">Gate 6</option> <option value="Worker">Worker</option> <option value="Scan Receiving">Scan Receiving</option> <option value="Receiving">Receiving</option> <option value="Traffic Receiving">Traffic Receiving</option> <option value="Transfer room">Transfer room</option> <option value="Scan Link way">Scan Link way</option> <option value="Park 3">Park 3</option> <option value="Custom Park 2">Custom Park 2</option> <option value="Patrol 1">Patrol 1</option> <option value="Patrol 2">Patrol 2</option> <option value="Support">Support</option> <option value="B 6/1">B 6/1</option> <option value="B 6/2">B 6/2</option> <option value="Rel lab B2L3">Rel lab B2L3</option> <option value="Other">Other (อื่นๆ)</option>
                        </select>
                    </div>
                    <div>
                        <label for="report-time" class="block text-sm font-medium text-gray-700 mb-2">7. เวลารายงาน <span class="text-red-500">*</span></label>
                        <input type="time" id="report-time" name="report-time" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-6">
                    <label for="incident-report" class="block text-sm font-medium text-gray-700 mb-2">8. รายงานเหตุการณ์ <span class="text-red-500">*</span></label>
                    <div class="relative w-full">
                        <textarea id="incident-report" name="incident-report" rows="4" placeholder="กรอกรายละเอียดเหตุการณ์ หรือใช้ไมโครโฟน" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700 pr-12"></textarea>
                        <button type="button" id="mic-incident-report" onclick="startSpeechRecognition('incident-report')" class="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-blue-600"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path></svg></button>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-6">
                    <label for="special-incident" class="block text-sm font-medium text-gray-700 mb-2">9. กรณีเหตุการณ์พิเศษ</label>
                    <div class="relative w-full">
                        <textarea id="special-incident" name="special-incident" rows="3" placeholder="ถ้ามี (ไม่บังคับ) หรือใช้ไมโครโฟน" class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700 pr-12"></textarea>
                        <button type="button" id="mic-special-incident" onclick="startSpeechRecognition('special-incident')" class="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-blue-600"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path></svg></button>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-6">
                    <label for="emergency-incident" class="block text-sm font-medium text-gray-700 mb-2">10. กรณีเหตุฉุกเฉิน</label>
                    <div class="relative w-full">
                        <textarea id="emergency-incident" name="emergency-incident" rows="3" placeholder="ถ้ามี (ไม่บังคับ) หรือใช้ไมโครโฟน" class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700 pr-12"></textarea>
                        <button type="button" id="mic-emergency-incident" onclick="startSpeechRecognition('emergency-incident')" class="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-blue-600"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path></svg></button>
                    </div>
                </div>

                <div class="text-center pt-6">
                    <button type="submit" class="submit-btn-modern text-white py-4 px-12 rounded-3xl text-lg">ส่งรายงาน</button>
                </div>
            </form>
        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('report-date').value = new Date().toISOString().split('T')[0];

            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            document.getElementById('report-time').value = `${hours}:${minutes}`;
        });

        function startSpeechRecognition(textareaId) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert("ขออภัย เบราว์เซอร์ของคุณไม่รองรับการแปลงเสียงเป็นข้อความ");
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.lang = 'th-TH';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            const micButton = document.getElementById('mic-' + textareaId);
            const textarea = document.getElementById(textareaId);
            recognition.onstart = () => { micButton.classList.add('text-red-500'); };
            recognition.onend = () => { micButton.classList.remove('text-red-500'); };
            recognition.onresult = (event) => {
                const speechResult = event.results[0][0].transcript;
                textarea.value += (textarea.value.length > 0 ? ' ' : '') + speechResult;
            };
            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                alert('เกิดข้อผิดพลาดในการจดจำเสียง: ' + event.error);
            };
            recognition.start();
        }

        function toggleButton(clickedButton, fieldName, value) {
            const buttons = clickedButton.parentElement.querySelectorAll('.toggle-btn');
            buttons.forEach(btn => {
                btn.classList.remove('border-green-500', 'bg-green-100', 'text-green-700', 'border-red-500', 'bg-red-100', 'text-red-700', 'border-sky-500', 'bg-sky-100', 'text-sky-700', 'border-purple-500', 'bg-purple-100', 'text-purple-700');
                btn.classList.add('border-gray-200', 'text-gray-600');
            });

            let activeClasses = [];
            if (value === 'เช้า') {
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