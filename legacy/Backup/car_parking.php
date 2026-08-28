<?php
require_once "check_permissions.php";
require_once "config.php";

// Pre-fill form data from logged-in user's session
$employee_id_from_session = $_SESSION['employee_id'] ?? '';
$full_name_from_session = isset($_SESSION['first_name']) ? trim($_SESSION['first_name'] . ' ' . $_SESSION['last_name']) : '';

// --- Lot Definitions ---
$car_lots = [
    "ลานรถยนต์ 1 (97 Slot)",
    "ลานรถยนต์ 2 (114 Slot)",
    "ลานรถยนต์ 3/1 (100 Slot)",
    "ลานรถยนต์ 3/2 (264 Slot)",
    "ลานรถยนต์ 4 (415 Slot)",
    "ลานรถยนต์ 5 (53 Slot)",
    "ลานรถยนต์ B.8 (44 Slot)"
];
$motorcycle_lots = [
    "ลานจอด 1 (296 Slot)",
    "ลานจอด 2 (210 Slot)",
    "ลานจอด 3/1 (251 Slot)"
];

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

// --- Function Definitions ---
function submitCarParkingReport($conn, $data)
{
    $conn->begin_transaction();

    try {
        // 1. Validate required main fields
        $required_fields = ['inspection_date', 'inspector_code', 'inspector_name', 'shift', 'spare_tire_status'];
        foreach ($required_fields as $field) {
            if (empty(trim($data[$field]))) {
                throw new Exception('กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน');
            }
        }

        // 2. Insert into the main report table
        $inspection_date = trim($data['inspection_date']);
        $inspector_code = trim($data['inspector_code']);
        $inspector_name = trim($data['inspector_name']);
        $shift = trim($data['shift']);
        $spare_tire_status = trim($data['spare_tire_status']);
        $license_plates_raw = isset($data['license_plates']) && is_array($data['license_plates']) ? $data['license_plates'] : [];
        $license_plates = implode(", ", array_filter(array_map('trim', $license_plates_raw)));

        $sql_main = "INSERT INTO car_parking_reports (inspection_date, inspector_code, inspector_name, shift, spare_tire_status, license_plates) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt_main = $conn->prepare($sql_main);
        $stmt_main->bind_param("ssssss", $inspection_date, $inspector_code, $inspector_name, $shift, $spare_tire_status, $license_plates);

        if (!$stmt_main->execute()) {
            throw new Exception('เกิดข้อผิดพลาดในการบันทึกรายงานหลัก: ' . $stmt_main->error);
        }

        $report_id = $conn->insert_id;
        $stmt_main->close();

        // 3. Insert into the parking lot counts table
        $sql_counts = "INSERT INTO parking_lot_counts (report_id, lot_name, vehicle_type, vehicle_count) VALUES (?, ?, ?, ?)";
        $stmt_counts = $conn->prepare($sql_counts);

        // Process car lots
        if (isset($data['car_lots']) && is_array($data['car_lots'])) {
            foreach ($data['car_lots'] as $lot_name => $count) {
                if (!empty(trim($count))) {
                    $vehicle_type = 'car';
                    $vehicle_count = (int) $count;
                    $stmt_counts->bind_param("issi", $report_id, $lot_name, $vehicle_type, $vehicle_count);
                    if (!$stmt_counts->execute()) {
                        throw new Exception('เกิดข้อผิดพลาดในการบันทึกข้อมูลลานจอดรถยนต์: ' . $stmt_counts->error);
                    }
                }
            }
        }

        // Process motorcycle lots
        if (isset($data['motorcycle_lots']) && is_array($data['motorcycle_lots'])) {
            foreach ($data['motorcycle_lots'] as $lot_name => $count) {
                if (!empty(trim($count))) {
                    $vehicle_type = 'motorcycle';
                    $vehicle_count = (int) $count;
                    $stmt_counts->bind_param("issi", $report_id, $lot_name, $vehicle_type, $vehicle_count);
                    if (!$stmt_counts->execute()) {
                        throw new Exception('เกิดข้อผิดพลาดในการบันทึกข้อมูลลานจอดมอเตอร์ไซค์: ' . $stmt_counts->error);
                    }
                }
            }
        }

        $stmt_counts->close();
        $conn->commit();
        return ['message' => 'ส่งรายงานการตรวจเช็คเรียบร้อยแล้ว', 'error' => ''];

    } catch (Exception $e) {
        $conn->rollback();
        return ['message' => '', 'error' => $e->getMessage()];
    }
}

// --- Main Logic ---
$message = "";
$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token. การดำเนินการถูกยกเลิกเพื่อความปลอดภัย";
    } else {
        $result = submitCarParkingReport($conn, $_POST);
        $message = $result['message'];
        $error = $result['error'];
    }
}

// --- Fetch History Data ---
$history_sql = "SELECT * FROM car_parking_reports ORDER BY inspection_date DESC, created_at DESC LIMIT 20";
$history_result = $conn->query($history_sql);


$conn->close();
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Car parking Western Digital @PCS</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="theme.css">
</head>

<body class="custom-font" style="background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);">
    <main class="min-h-full py-8 px-4">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="glass-card rounded-3xl shadow-xl p-8 mb-8 relative">
                <a href="report_page.php"
                    class="absolute top-4 right-4 bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded-xl hover:bg-blue-300 transition-colors shadow-md">กลับ
                    หน้ารายงาน</a>
                <div class="text-center">
                    <div
                        class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-8 h-8 text-white">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h10.5a1.125 1.125 0 001.125-1.125V6.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 6.75v10.5a1.125 1.125 0 001.125 1.125z" />
                        </svg>
                    </div>
                    <h1 class="text-3xl font-bold section-title mb-3">Car parking Western Digital @PCS</h1>
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
            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="POST"
                class="glass-card rounded-3xl shadow-xl p-8 border border-sky-100 space-y-6">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="inspection_date" class="block text-sm font-medium text-gray-700 mb-2">1.
                            วันที่ตรวจเช็ค <span class="text-red-500">*</span></label>
                        <input type="date" id="inspection_date" name="inspection_date" required
                            class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                    </div>
                    <div>
                        <label for="inspector_code" class="block text-sm font-medium text-gray-700 mb-2">2. รหัสพนักงาน
                            PCS (8 หลัก) <span class="text-red-500">*</span></label>
                        <input type="text" id="inspector_code" name="inspector_code" placeholder="กรอกรหัสพนักงาน"
                            required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700"
                            value="<?php echo htmlspecialchars($employee_id_from_session); ?>">
                    </div>
                    <div>
                        <label for="inspector_name" class="block text-sm font-medium text-gray-700 mb-2">3.
                            ชื่อพนักงานผู้ตรวจ <span class="text-red-500">*</span></label>
                        <input type="text" id="inspector_name" name="inspector_name" placeholder="กรอกชื่อผู้ตรวจ"
                            required class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700"
                            value="<?php echo htmlspecialchars($full_name_from_session); ?>">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">4. กะ <span
                                class="text-red-500">*</span></label>
                        <div class="flex gap-3">
                            <button type="button" onclick="toggleButton(this, 'shift', 'เช้า')"
                                class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium">🌅
                                เช้า</button>
                            <button type="button" onclick="toggleButton(this, 'shift', 'ดึก')"
                                class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-purple-300 hover:bg-purple-50 font-medium">🌙
                                ดึก</button>
                        </div>
                        <input type="hidden" id="shift" name="shift" required>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-6">
                    <h3 class="text-lg font-bold mb-4 section-title">5. จำนวนรถยนต์ในลานจอด</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <?php foreach ($car_lots as $lot):
                            ?>
                            <div>
                                <label for="car_lot_<?php echo md5($lot); ?>"
                                    class="block text-sm font-medium text-gray-700"><?php echo htmlspecialchars($lot); ?></label>
                                <input type="number" id="car_lot_<?php echo md5($lot); ?>"
                                    name="car_lots[<?php echo htmlspecialchars($lot); ?>]" placeholder="จำนวน"
                                    class="input-modern w-full mt-1 px-5 py-4 rounded-2xl font-medium text-gray-700">
                            </div>
                        <?php endforeach;
                        ?>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-6">
                    <h3 class="text-lg font-bold mb-4 section-title">6. จำนวนรถมอเตอร์ไซค์ในลานจอด</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <?php foreach ($motorcycle_lots as $lot):
                            ?>
                            <div>
                                <label for="moto_lot_<?php echo md5($lot); ?>"
                                    class="block text-sm font-medium text-gray-700"><?php echo htmlspecialchars($lot); ?></label>
                                <input type="number" id="moto_lot_<?php echo md5($lot); ?>"
                                    name="motorcycle_lots[<?php echo htmlspecialchars($lot); ?>]" placeholder="จำนวน"
                                    class="input-modern w-full mt-1 px-5 py-4 rounded-2xl font-medium text-gray-700">
                            </div>
                        <?php endforeach;
                        ?>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-3">7.
                        ข้อมูลทะเบียนรถที่มียางอะไหล่กับรถที่ไม่มีางอะไหล่ทั้งหมด <span
                            class="text-red-500">*</span></label>
                    <div class="flex gap-3">
                        <button type="button" onclick="toggleButton(this, 'spare_tire_status', 'มี')"
                            class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"><span
                                class="text-lg">✓</span> มี</button>
                        <button type="button" onclick="toggleButton(this, 'spare_tire_status', 'ไม่มี')"
                            class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"><span
                                class="text-lg">✗</span> ไม่มี</button>
                    </div>
                    <input type="hidden" id="spare_tire_status" name="spare_tire_status" required>
                </div>

                <div class="border-t border-gray-200 pt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">8. ป้ายทะเบียนรถ</label>
                    <div id="license-plate-container" class="space-y-2">
                        <div class="flex items-center space-x-2">
                            <input type="text" name="license_plates[]" placeholder="ป้ายทะเบียน"
                                class="input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700">
                        </div>
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button type="button" id="add-plate-btn"
                            class="flex-1 bg-blue-100 text-blue-700 font-semibold py-3 px-4 rounded-lg hover:bg-blue-200">+
                            เพิ่มป้ายทะเบียน</button>
                        <button type="button" id="add-10-plates-btn"
                            class="flex-1 bg-sky-100 text-sky-700 font-semibold py-3 px-4 rounded-lg hover:bg-sky-200">+
                            เพิ่ม 10 ช่อง</button>
                    </div>
                </div>

                <div class="text-center pt-6">
                    <button type="submit"
                        class="submit-btn-modern text-white py-4 px-12 rounded-3xl text-lg">ส่งรายงาน</button>
                </div>
            </form>
        </div>

        <!-- History Section -->
        <div class="max-w-7xl mx-auto mt-12 mb-12">
            <div class="glass-card rounded-3xl shadow-xl p-8 border border-sky-100">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold section-title flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-8 h-8 mr-3 text-sky-600">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ประวัติการรายงาน (20 รายการล่าสุด)
                    </h2>
                </div>

                <div class="overflow-x-auto rounded-xl border border-gray-200">
                    <table class="w-full text-left border-collapse bg-white">
                        <thead class="bg-gray-50 text-gray-700 uppercase text-sm leading-normal">
                            <tr>
                                <th class="py-4 px-6 font-bold text-center">วันที่ตรวจ</th>
                                <th class="py-4 px-6 font-bold text-center">เวลาที่บันทึก</th>
                                <th class="py-4 px-6 font-bold text-center">กะ</th>
                                <th class="py-4 px-6 font-bold">ผู้ตรวจสอบ</th>
                                <th class="py-4 px-6 font-bold text-center">ทะเบียนรถ (ยางอะไหล่)</th>
                            </tr>
                        </thead>
                        <tbody class="text-gray-600 text-sm font-light">
                            <?php if ($history_result && $history_result->num_rows > 0): ?>
                                <?php while ($row = $history_result->fetch_assoc()):
                                    $date = new DateTime($row['inspection_date']);
                                    $created = new DateTime($row['created_at']);
                                    $shift_color = $row['shift'] == 'เช้า' ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700';
                                    ?>
                                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td class="py-4 px-6 text-center whitespace-nowrap">
                                            <div class="font-medium text-gray-800"><?php echo $date->format('d/m/Y'); ?></div>
                                        </td>
                                        <td class="py-4 px-6 text-center">
                                            <?php echo $created->format('H:i'); ?> น.
                                        </td>
                                        <td class="py-4 px-6 text-center">
                                            <span
                                                class="<?php echo $shift_color; ?> py-1 px-3 rounded-full text-xs font-semibold">
                                                <?php echo htmlspecialchars($row['shift']); ?>
                                            </span>
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex items-center">
                                                <div
                                                    class="mr-2 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                    <?php echo mb_substr($row['inspector_name'], 0, 1, 'UTF-8'); ?>
                                                </div>
                                                <span
                                                    class="font-medium"><?php echo htmlspecialchars($row['inspector_name']); ?></span>
                                            </div>
                                            <div class="text-xs text-gray-400 mt-1 ml-10">
                                                <?php echo htmlspecialchars($row['inspector_code']); ?>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6 text-center">
                                            <span
                                                class="py-1 px-3 rounded-full text-xs font-semibold <?php echo $row['spare_tire_status'] == 'มี' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'; ?>">
                                                <?php echo htmlspecialchars($row['spare_tire_status']); ?>
                                            </span>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="5" class="py-8 px-6 text-center text-gray-400 bg-gray-50">
                                        ไม่พบข้อมูลประวัติการรายงาน
                                    </td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <script>
            document.addEventListener('DOMContentLoaded', function () {
                document.getElementById('inspection_date').value = new Date().toISOString().split('T')[0];

                const addPlateBtn = document.getElementById('add-plate-btn');
                const add10PlatesBtn = document.getElementById('add-10-plates-btn');
                const plateContainer = document.getElementById('license-plate-container');
                let plateCount = 1;
                const maxPlates = 60;

                function addPlate() {
                    if (plateCount >= maxPlates) return false;

                    plateCount++;

                    const newPlateDiv = document.createElement('div');
                    newPlateDiv.className = 'flex items-center space-x-2';

                    const newPlateInput = document.createElement('input');
                    newPlateInput.type = 'text';
                    newPlateInput.name = 'license_plates[]';
                    newPlateInput.placeholder = 'ป้ายทะเบียน ' + plateCount;
                    newPlateInput.className = 'input-modern w-full px-5 py-4 rounded-2xl font-medium text-gray-700';

                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.textContent = 'ลบ';
                    removeBtn.className = 'bg-red-100 text-red-600 px-3 py-1 rounded-md text-sm hover:bg-red-200';
                    removeBtn.onclick = function () {
                        plateContainer.removeChild(newPlateDiv);
                        plateCount--;
                        updateButtons();
                    };

                    newPlateDiv.appendChild(newPlateInput);
                    newPlateDiv.appendChild(removeBtn);
                    plateContainer.appendChild(newPlateDiv);

                    updateButtons();
                    return true;
                }

                function updateButtons() {
                    if (plateCount >= maxPlates) {
                        addPlateBtn.disabled = true;
                        addPlateBtn.textContent = 'ถึงจำนวนสูงสุดแล้ว';
                        add10PlatesBtn.disabled = true;
                    } else {
                        addPlateBtn.disabled = false;
                        addPlateBtn.textContent = '+ เพิ่มป้ายทะเบียน';
                        add10PlatesBtn.disabled = false;
                    }
                }

                addPlateBtn.addEventListener('click', function () {
                    addPlate();
                });

                add10PlatesBtn.addEventListener('click', function () {
                    let added = 0;
                    for (let i = 0; i < 10; i++) {
                        if (addPlate()) {
                            added++;
                        } else {
                            break;
                        }
                    }
                });
            });

            function toggleButton(clickedButton, fieldName, value) {
                const buttons = clickedButton.parentElement.querySelectorAll('.toggle-btn');
                buttons.forEach(btn => {
                    btn.classList.remove('border-green-500', 'bg-green-100', 'text-green-700', 'border-red-500', 'bg-red-100', 'text-red-700', 'border-sky-500', 'bg-sky-100', 'text-sky-700', 'border-purple-500', 'bg-purple-100', 'text-purple-700');
                    btn.classList.add('border-gray-200', 'text-gray-600');
                });

                let activeClasses = [];
                if (['มี'].includes(value)) {
                    activeClasses = ['border-green-500', 'bg-green-100', 'text-green-700'];
                } else if (['ไม่มี'].includes(value)) {
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