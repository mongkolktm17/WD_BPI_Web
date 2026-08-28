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
 * Submits a new hand-held check report.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data from the form.
 * @return array A result array with 'message' and 'error' keys.
 */
function submitHandHeldCheck($conn, $data) {
    $required_fields = ['inspection_date', 'building', 'guard_post', 'inspector_code', 'inspector_name', 'shift', 'battery_status', 'led_status', 'detection_test_status', 'alarm_status'];
    foreach ($required_fields as $field) {
        if (empty(trim($data[$field]))) {
            return ['message' => '', 'error' => 'กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน'];
        }
    }

    // Assign variables by trimming whitespace
    $inspection_date = trim($data['inspection_date']);
    $building = trim($data['building']);
    $guard_post = trim($data['guard_post']);
    $inspector_code = trim($data['inspector_code']);
    $inspector_name = trim($data['inspector_name']);
    $shift = trim($data['shift']);
    $battery_status = trim($data['battery_status']);
    $led_status = trim($data['led_status']);
    $detection_test_status = trim($data['detection_test_status']);
    $alarm_status = trim($data['alarm_status']);
    $remarks = trim($data['remarks'] ?? '');

    $sql = "INSERT INTO hand_held_checks (inspection_date, building, guard_post, inspector_code, inspector_name, shift, battery_status, led_status, detection_test_status, alarm_status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("sssssssssss", $inspection_date, $building, $guard_post, $inspector_code, $inspector_name, $shift, $battery_status, $led_status, $detection_test_status, $alarm_status, $remarks);
        if ($stmt->execute()) {
            return ['message' => 'ส่งรายงานการตรวจเช็คเรียบร้อยแล้ว', 'error' => ''];
        } else {
            return ['message' => '', 'error' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' . $stmt->error];
        }
        $stmt->close(); // This line is unreachable but good practice to have
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
        $result = submitHandHeldCheck($conn, $_POST);
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
    <title>Check Hand Held</title>
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
                        <img src="report_assets/Images/tool_2.png" alt="Hand Held" class="w-8 h-8">
                    </div>
                    <h1 class="text-3xl font-bold section-title mb-3">Check Hand Held ประจำจุดรักษาการณ์</h1>
                    <p class="text-gray-600 text-lg font-medium">กรอกข้อมูลให้ครบถ้วน</p>
                </div>
            </div>

            <?php if (!empty($message)):
                ?>
                <div class="mb-4 p-4 rounded-lg bg-green-100 text-green-700">
                    <?php echo htmlspecialchars($message); ?>
                </div>
            <?php endif;
            ?>
            <?php if (!empty($error)):
                ?>
                <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700">
                    <?php echo htmlspecialchars($error); ?>
                </div>
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
                        <label for="building" class="block text-sm font-medium text-gray-700 mb-2">2. Building <span class="text-red-500">*</span></label>
                        <select id="building" name="building" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                            <option value="" disabled selected>เลือกอาคาร</option>
                            <option value="B2">B2</option>
                            <option value="B3">B3</option>
                            <option value="B4">B4</option>
                            <option value="B6">B6</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label for="guard_post" class="block text-sm font-medium text-gray-700 mb-2">3. จุดรักษาการณ์ <span class="text-red-500">*</span></label>
                    <select id="guard_post" name="guard_post" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                        <option value="" disabled selected>เลือกจุดรักษาการณ์</option>
                        <option value="Gate 5 B4">Gate 5 B4</option>
                        <option value="Gate 6 B4">Gate 6 B4</option>
                        <option value="Worker">Worker</option>
                        <option value="Scan Receiving">Scan Receiving</option>
                        <option value="Receiving">Receiving</option>
                        <option value="Tranfer Room">Tranfer Room</option>
                        <option value="Scan Link way">Scan Link way</option>
                        <option value="Rel Lab">Rel Lab</option>
                        <option value="A2">A2</option>
                        <option value="A3">A3</option>
                        <option value="Exit inspection">Exit inspection</option>
                        <option value="FA Lab">FA Lab</option>
                        <option value="RCSC">RCSC</option>
                        <option value="6/1">6/1</option>
                        <option value="6/2">6/2</option>
                        <option value="Gate 2 B3">Gate 2 B3</option>
                    </select>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="inspector_code" class="block text-sm font-medium text-gray-700 mb-2">4. รหัสพนักงาน PCS <span class="text-red-500">*</span></label>
                        <input type="text" id="inspector_code" name="inspector_code" placeholder="กรอกรหัสพนักงาน" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700" value="<?php echo htmlspecialchars($employee_id_from_session); ?>">
                    </div>
                    <div>
                        <label for="inspector_name" class="block text-sm font-medium text-gray-700 mb-2">5. ชื่อ-นามสกุล <span class="text-red-500">*</span></label>
                        <div class="relative w-full">
                            <input type="text" id="inspector_name" name="inspector_name" placeholder="กรอกชื่อ-นามสกุล หรือใช้ไมโครโฟน" required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700 pr-12" value="<?php echo htmlspecialchars($full_name_from_session); ?>">
                            <button type="button" id="mic-inspector_name" onclick="startSpeechRecognition('inspector_name')" class="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-blue-600"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path></svg></button>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">6. Shift (กะที่ทำการตรวจเช็ค) <span class="text-red-500">*</span></label>
                    <div class="flex gap-3">
                        <button type="button" onclick="toggleButton(this, 'shift', 'กะเช้า')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">🌅 เช้า</button>
                        <button type="button" onclick="toggleButton(this, 'shift', 'กะดึก')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-purple-300 hover:bg-purple-50 font-medium">🌙 ดึก</button>
                    </div>
                    <input type="hidden" id="shift" name="shift" required>
                </div>

                <div class="space-y-6">
                    <div class="border-t border-gray-200 pt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-3">7. ตรวจสอบแบตเตอรี่ก่อนใช้งาน <span class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'battery_status', 'พร้อมใช้งาน')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"><span class="text-lg">✓</span> พร้อมใช้งาน</button>
                            <button type="button" onclick="toggleButton(this, 'battery_status', 'ไม่พร้อมใช้งาน')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"><span class="text-lg">✗</span> ไม่พร้อมใช้งาน</button>
                        </div>
                        <input type="hidden" id="battery_status" name="battery_status" required>
                    </div>

                    <div class="border-t border-gray-200 pt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-3">8. เปิดสวิตช์ไฟ LED สีเขียวจะติด <span class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'led_status', 'ผ่านการทดสอบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"><span class="text-lg">✓</span> ผ่านการทดสอบ</button>
                            <button type="button" onclick="toggleButton(this, 'led_status', 'ไม่ผ่านการทดสอบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"><span class="text-lg">✗</span> ไม่ผ่านการทดสอบ</button>
                        </div>
                        <input type="hidden" id="led_status" name="led_status" required>
                    </div>

                    <div class="border-t border-gray-200 pt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-3">9. ทดสอบระยะห่างของอุปกรณ์ในการตรวจจับโลหะ <span class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'detection_test_status', 'ผ่านการทดสอบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"><span class="text-lg">✓</span> ผ่านการทดสอบ</button>
                            <button type="button" onclick="toggleButton(this, 'detection_test_status', 'ไม่ผ่านการทดสอบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"><span class="text-lg">✗</span> ไม่ผ่านการทดสอบ</button>
                        </div>
                        <input type="hidden" id="detection_test_status" name="detection_test_status" required>
                    </div>

                    <div class="border-t border-gray-200 pt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-3">10. เมื่อตรวจพบอุปกรณ์ที่เป็นโลหะจะมีไฟ LEDสีแดงโชว์และมีสัญญาณดัง <span class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'alarm_status', 'ผ่านการทดสอบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"><span class="text-lg">✓</span> ผ่านการทดสอบ</button>
                            <button type="button" onclick="toggleButton(this, 'alarm_status', 'ไม่ผ่านการทดสอบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"><span class="text-lg">✗</span> ไม่ผ่านการทดสอบ</button>
                        </div>
                        <input type="hidden" id="alarm_status" name="alarm_status" required>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-6">
                    <label for="remarks" class="block text-sm font-medium text-gray-700 mb-2">11. หมายเหตุ</label>
                    <div class="relative w-full">
                        <textarea id="remarks" name="remarks" rows="3" placeholder="กรอกหมายเหตุ (ถ้ามี) หรือใช้ไมโครโฟน" class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700 pr-12"></textarea>
                        <button type="button" id="mic-remarks" onclick="startSpeechRecognition('remarks')" class="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-blue-600"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path></svg></button>
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
            document.getElementById('inspection_date').value = new Date().toISOString().split('T')[0];
        });

        function startSpeechRecognition(elementId) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert("ขออภัย เบราว์เซอร์ของคุณไม่รองรับการแปลงเสียงเป็นข้อความ");
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'th-TH';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            const micButton = document.getElementById('mic-' + elementId);
            const targetElement = document.getElementById(elementId);

            recognition.onstart = function() {
                micButton.classList.add('text-red-500');
                micButton.classList.remove('text-gray-400');
            };

            recognition.onspeechend = function() {
                recognition.stop();
            };
            
            recognition.onend = function() {
                micButton.classList.remove('text-red-500');
                micButton.classList.add('text-gray-400');
            };

            recognition.onresult = function(event) {
                const speechResult = event.results[0][0].transcript;
                targetElement.value += (targetElement.value.length > 0 ? ' ' : '') + speechResult;
            };

            recognition.onerror = function(event) {
                console.error('Speech recognition error', event.error);
                alert('เกิดข้อผิดพลาดในการจดจำเสียง: ' + event.error);
            };

            recognition.start();
        }

        function toggleButton(clickedButton, fieldName, value) {
            const buttons = clickedButton.parentElement.querySelectorAll('.toggle-btn');
            buttons.forEach(btn => {
                btn.classList.remove('border-green-500', 'bg-green-100', 'text-green-700', 'border-red-500', 'bg-red-100', 'text-red-700', 'border-sky-500', 'bg-sky-100', 'text-sky-700', 'border-orange-500', 'bg-orange-100', 'text-orange-700', 'border-purple-500', 'bg-purple-100', 'text-purple-700');
                btn.classList.add('border-gray-200', 'text-gray-600');
            });

            let activeClasses = [];
            if (['พร้อมใช้งาน', 'ผ่านการทดสอบ'].includes(value)) {
                activeClasses = ['border-green-500', 'bg-green-100', 'text-green-700'];
            } else if (['ไม่พร้อมใช้งาน', 'ไม่ผ่านการทดสอบ'].includes(value)) {
                activeClasses = ['border-red-500', 'bg-red-100', 'text-red-700'];
            } else if (value === 'กะเช้า') {
                activeClasses = ['border-sky-500', 'bg-sky-100', 'text-sky-700'];
            } else if (value === 'กะดึก') {
                activeClasses = ['border-purple-500', 'bg-purple-100', 'text-purple-700'];
            }

            clickedButton.classList.remove('border-gray-200', 'text-gray-600');
            clickedButton.classList.add(...activeClasses);
            document.getElementById(fieldName).value = value;
        }
    </script>

</body>
</html>