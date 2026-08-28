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
 * Submits a new patrol check report.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data from the form.
 * @return array A result array with 'message' and 'error' keys.
 */
function submitPatrolCheck($conn, $data) {
    $required_fields = ['date', 'status', 'shift', 'employee_id', 'inspector_name', 'patrol-time', 'building'];
    foreach ($required_fields as $field) {
        if (empty($data[$field])) {
            return ['message' => '', 'error' => 'กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน'];
        }
    }

    // Assign variables
    $inspection_date = trim($data['date']);
    $patrol_status = is_array($data['status']) ? implode(', ', $data['status']) : trim($data['status']);
    $shift = trim($data['shift']);
    $employee_id = trim($data['employee_id']);
    $inspector_name = trim($data['inspector_name']);
    $patrol_time = trim($data['patrol-time']);
    $building = trim($data['building']);
    $submitted_by_id = $_SESSION['id'];

    $sql = "INSERT INTO patrol_checks (inspection_date, patrol_status, shift, employee_id, inspector_name, patrol_time, building, submitted_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("sssssssi", $inspection_date, $patrol_status, $shift, $employee_id, $inspector_name, $patrol_time, $building, $submitted_by_id);
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
        $result = submitPatrolCheck($conn, $_POST);
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
    <title>Check list Patrol</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">

    <div class="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <header class="bg-blue-600 text-white p-6 flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold">Check list Patrol</h1>
                <p class="text-blue-200">กรอกข้อมูลให้ครบถ้วน</p>
            </div>
            <a href="dashboard.php" class="text-sm bg-white text-blue-600 font-bold py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">กลับ Dashboard</a>
        </header>

        <main class="p-6 md:p-8">
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
            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]);?>" method="POST">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                <div class="space-y-6">
                    <div>
                        <label for="date" class="block text-sm font-medium text-gray-700 mb-1">1. วันที่ <span class="text-red-500">*</span></label>
                        <input type="date" id="date" name="date" required class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg transition duration-200">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">2. ตรวจสอบพื้นที่ในภาวะ <span class="text-red-500">*</span></label>
                        <div class="space-y-2">
                            <label class="flex items-center p-3 border rounded-lg flex-1 cursor-pointer hover:bg-gray-50">
                                <input type="checkbox" name="status[]" value="ปกติ" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                <span class="ml-3 text-gray-800">ภาวะปกติ</span>
                            </label>
                            <label class="flex items-center p-3 border rounded-lg flex-1 cursor-pointer hover:bg-gray-50">
                                <input type="checkbox" name="status[]" value="ฉุกเฉิน" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                <span class="ml-3 text-gray-800">ภาวะฉุกเฉิน</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">3. กะ <span class="text-red-500">*</span></label>
                        <div class="flex rounded-md shadow-sm" role="group">
                            <input type="radio" id="shift_morning" name="shift" value="เช้า" class="hidden peer/morning" required>
                            <label for="shift_morning" class="w-full text-center px-4 py-3 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg cursor-pointer hover:bg-gray-100 hover:text-blue-700 peer-checked/morning:bg-blue-500 peer-checked/morning:text-white peer-checked/morning:border-blue-600">
                                เช้า
                            </label>
                            
                            <input type="radio" id="shift_night" name="shift" value="ดึก" class="hidden peer/night">
                            <label for="shift_night" class="w-full text-center px-4 py-3 text-sm font-medium text-gray-900 bg-white border-t border-b border-r border-gray-200 rounded-r-lg cursor-pointer hover:bg-gray-100 hover:text-blue-700 peer-checked/night:bg-blue-500 peer-checked/night:text-white peer-checked/night:border-blue-600">
                                ดึก
                            </label>
                        </div>
                    </div>

                    <div>
                        <label for="employee_id" class="block text-sm font-medium text-gray-700 mb-1">4. รหัสพนักงาน PCS 8 หลัก <span class="text-red-500">*</span></label>
                        <input type="text" id="employee_id" name="employee_id" placeholder="กรอกรหัสพนักงาน" required class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg transition duration-200" value="<?php echo htmlspecialchars($employee_id_from_session); ?>">
                    </div>

                    <div>
                        <label for="inspector_name" class="block text-sm font-medium text-gray-700 mb-1">5. ชื่อ-นามสกุล ผู้ตรวจ <span class="text-red-500">*</span></label>
                        <input type="text" id="inspector_name" name="inspector_name" placeholder="กรอกชื่อและนามสกุล" required class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg transition duration-200" value="<?php echo htmlspecialchars($full_name_from_session); ?>">
                    </div>

                    <div>
                        <label for="patrol-time" class="block text-sm font-medium text-gray-700 mb-1">6. เวลาทำการเดินตรวจพื้นที่ <span class="text-red-500">*</span></label>
                        <el-dropdown class="inline-block w-full">
                          <button type="button" class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                            เลือกเวลา
                            <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="-mr-1 h-5 w-5 text-gray-400">
                              <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                            </svg>
                          </button>

                          <el-menu anchor="bottom end" popover class="w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div class="py-1">
                              <a href="#" data-value="07:00-08:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">07:00-08:00</a>
                              <a href="#" data-value="08:00-09:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">08:00-09:00</a>
                              <a href="#" data-value="09:00-10:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">09:00-10:00</a>
                              <a href="#" data-value="10:00-11:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">10:00-11:00</a>
                              <a href="#" data-value="11:00-12:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">11:00-12:00</a>
                              <a href="#" data-value="12:00-13:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">12:00-13:00</a>
                              <a href="#" data-value="13:00-14:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">13:00-14:00</a>
                              <a href="#" data-value="14:00-15:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">14:00-15:00</a>
                              <a href="#" data-value="15:00-16:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">15:00-16:00</a>
                              <a href="#" data-value="16:00-17:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">16:00-17:00</a>
                              <a href="#" data-value="17:00-18:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">17:00-18:00</a>
                              <a href="#" data-value="18:00-19:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">18:00-19:00</a>
                              <a href="#" data-value="19:00-20:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">19:00-20:00</a>
                              <a href="#" data-value="20:00-21:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">20:00-21:00</a>
                              <a href="#" data-value="21:00-22:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">21:00-22:00</a>
                              <a href="#" data-value="22:00-23:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">22:00-23:00</a>
                              <a href="#" data-value="23:00-00:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">23:00-00:00</a>
                              <a href="#" data-value="00:00-01:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">00:00-01:00</a>
                              <a href="#" data-value="01:00-02:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">01:00-02:00</a>
                              <a href="#" data-value="02:00-03:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">02:00-03:00</a>
                              <a href="#" data-value="03:00-04:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">03:00-04:00</a>
                              <a href="#" data-value="04:00-05:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">04:00-05:00</a>
                              <a href="#" data-value="05:00-06:00" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">05:00-06:00</a>
                            </div>
                          </el-menu>
                        </el-dropdown>
                        <input type="hidden" name="patrol-time" id="patrol-time-value">
                    </div>

                    <div>
                        <label for="building" class="block text-sm font-medium text-gray-700 mb-1">7. อาคาร <span class="text-red-500">*</span></label>
                        <el-dropdown class="inline-block w-full">
                          <button type="button" class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                            เลือกอาคาร
                            <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="-mr-1 h-5 w-5 text-gray-400">
                              <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                            </svg>
                          </button>

                          <el-menu anchor="bottom end" popover class="w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div class="py-1">
                              <a href="#" data-value="1" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">อาคาร 1</a>
                              <a href="#" data-value="2" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">อาคาร 2</a>
                              <a href="#" data-value="3" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">อาคาร 3</a>
                              <a href="#" data-value="4" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">อาคาร 4</a>
                              <a href="#" data-value="8" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">อาคาร 8</a>
                              <a href="#" data-value="6" class="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900">อาคาร 6</a>
                            </div>
                          </el-menu>
                        </el-dropdown>
                        <input type="hidden" name="building" id="building-value">
                    </div>
                </div>
                <div class="mt-8">
                    <button type="submit" class="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105">
                        ส่งรายงาน
                    </button>
                </div>
            </form>
        </main>
        <footer class="text-center p-4 bg-gray-50 border-t">
            <p class="text-xs text-gray-500">
                Powered by PCS Engineering
            </p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const formattedToday = `${yyyy}-${mm}-${dd}`;
            document.getElementById('date').value = formattedToday;

            document.querySelectorAll('el-dropdown').forEach(dropdown => {
                const button = dropdown.querySelector('button');
                const menu = dropdown.querySelector('el-menu');
                const hiddenInput = dropdown.nextElementSibling;

                menu.addEventListener('click', function(e) {
                    if (e.target.tagName === 'A') {
                        e.preventDefault();
                        const value = e.target.dataset.value;
                        const text = e.target.textContent.trim();
                        hiddenInput.value = value;
                        // Update button text
                        button.childNodes[0].nodeValue = text + ' ';
                    }
                });
            });
        });
    </script>

</body>
</html>