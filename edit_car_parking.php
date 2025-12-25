<?php
require_once "check_permissions.php";
require_once "config.php";

$report_id = $_GET['id'] ?? null;
if (!$report_id) {
    header("Location: report_page.php");
    exit;
}

// Check permissions (Admin or Author)
$is_admin = (isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions'])) || (isset($_SESSION['username']) && strcasecmp($_SESSION['username'], 'admin') === 0);
$current_user_employee_id = $_SESSION['employee_id'] ?? '';

// Fetch the report
$report = null;
$lot_counts = [];
$stmt = $conn->prepare("SELECT * FROM car_parking_reports WHERE id = ?");
$stmt->bind_param("i", $report_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 1) {
    $report = $result->fetch_assoc();

    // Check if user is author or admin
    $is_author = ($current_user_employee_id == $report['inspector_code']);
    if (!$is_admin && !$is_author) {
        header("Location: report_page.php?error=access_denied");
        exit;
    }

    // Fetch lot counts
    $stmt_lots = $conn->prepare("SELECT * FROM parking_lot_counts WHERE report_id = ?");
    $stmt_lots->bind_param("i", $report_id);
    $stmt_lots->execute();
    $res_lots = $stmt_lots->get_result();
    while ($lot = $res_lots->fetch_assoc()) {
        $lot_counts[$lot['lot_name']] = $lot['vehicle_count'];
    }
    $stmt_lots->close();
} else {
    header("Location: report_page.php?error=not_found");
    exit;
}
$stmt->close();

// --- Lot Definitions ---
$car_lots = [
    "ลานรถยนต์ 1 (97 Slot)",
    "ลานรถยนต์ 2 (114 Slot)",
    "ลานรถยนต์ 3/1 (100 Slot)",
    "ลานรถยนต์ 3/2 (264 Slot)",
    "ลานรถยนต์ 4 (415 Slot)",
    "ลานรถยนต์ 5 (53 Slot)",
    "ลานรถยนต์ B.9 (44 Slot)"
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

// --- Logic ---
$message = "";
$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token.";
    } else {
        $conn->begin_transaction();
        try {
            $inspection_date = $_POST['inspection_date'];
            $inspector_code = $_POST['inspector_code'];
            $inspector_name = $_POST['inspector_name'];
            $shift = $_POST['shift'];
            $spare_tire_status = $_POST['spare_tire_status'];
            $license_plates_raw = $_POST['license_plates'] ?? [];
            $license_plates = implode(", ", array_filter(array_map('trim', $license_plates_raw)));
            $user_username = $_SESSION['username'] ?? 'Unknown';

            $sql = "UPDATE car_parking_reports SET inspection_date = ?, inspector_code = ?, inspector_name = ?, shift = ?, spare_tire_status = ?, license_plates = ?, updated_by = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssssssi", $inspection_date, $inspector_code, $inspector_name, $shift, $spare_tire_status, $license_plates, $user_username, $report_id);

            if (!$stmt->execute()) {
                throw new Exception("Update failed: " . $stmt->error);
            }
            $stmt->close();

            // Delete old counts
            $conn->query("DELETE FROM parking_lot_counts WHERE report_id = $report_id");

            // Insert new counts
            $sql_counts = "INSERT INTO parking_lot_counts (report_id, lot_name, vehicle_type, vehicle_count) VALUES (?, ?, ?, ?)";
            $stmt_counts = $conn->prepare($sql_counts);

            if (isset($_POST['car_lots'])) {
                foreach ($_POST['car_lots'] as $lot_name => $count) {
                    if ($count !== "") {
                        $vtype = 'car';
                        $stmt_counts->bind_param("issi", $report_id, $lot_name, $vtype, $count);
                        $stmt_counts->execute();
                    }
                }
            }
            if (isset($_POST['motorcycle_lots'])) {
                foreach ($_POST['motorcycle_lots'] as $lot_name => $count) {
                    if ($count !== "") {
                        $vtype = 'motorcycle';
                        $stmt_counts->bind_param("issi", $report_id, $lot_name, $vtype, $count);
                        $stmt_counts->execute();
                    }
                }
            }
            $stmt_counts->close();
            $conn->commit();
            $message = "แก้ไขรายงานเรียบร้อยแล้ว";

            // Refresh data
            header("Location: edit_car_parking.php?id=$report_id&message=" . urlencode($message));
            exit;

        } catch (Exception $e) {
            $conn->rollback();
            $error = $e->getMessage();
        }
    }
}

$message = $_GET['message'] ?? $message;
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แก้ไขรายงานที่จอดรถ</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="theme.css">
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-100 min-h-screen py-8 px-4">
    <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <header class="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-8 relative">
                <a href="report_page.php"
                    class="absolute top-6 right-6 bg-white text-blue-700 font-bold py-2 px-4 rounded-xl hover:bg-gray-100 transition shadow-md">กลับ</a>
                <h1 class="text-3xl font-bold">แก้ไขรายงานที่จอดรถ</h1>
                <p class="text-blue-100 mt-2">ID: #<?php echo $report_id; ?> | แก้ไขข้อมูลรายงาน</p>
            </header>

            <div class="p-8">
                <?php if ($message): ?>
                    <div class="mb-6 p-4 rounded-2xl bg-green-50 text-green-700 border border-green-100 flex items-center">
                        <svg class="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clip-rule="evenodd"></path>
                        </svg>
                        <?php echo htmlspecialchars($message); ?>
                    </div>
                <?php endif; ?>
                <?php if ($error): ?>
                    <div class="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 border border-red-100">
                        <?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>

                <form action="edit_car_parking.php?id=<?php echo $report_id; ?>" method="POST" class="space-y-8">
                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">1. วันที่ตรวจเช็ค</label>
                            <input type="date" name="inspection_date" required
                                class="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                value="<?php echo $report['inspection_date']; ?>">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">2. รหัสพนักงาน PCS</label>
                            <input type="text" name="inspector_code" required
                                class="w-full px-5 py-3 rounded-xl border border-gray-300 bg-gray-50"
                                value="<?php echo $report['inspector_code']; ?>" readonly>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">3. ชื่อพนักงาน</label>
                            <input type="text" name="inspector_name" required
                                class="w-full px-5 py-3 rounded-xl border border-gray-300"
                                value="<?php echo $report['inspector_name']; ?>">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">4. กะ</label>
                            <select name="shift" class="w-full px-5 py-3 rounded-xl border border-gray-300">
                                <option value="เช้า" <?php echo $report['shift'] == 'เช้า' ? 'selected' : ''; ?>>เช้า
                                </option>
                                <option value="ดึก" <?php echo $report['shift'] == 'ดึก' ? 'selected' : ''; ?>>ดึก
                                </option>
                            </select>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-gray-100">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">5. จำนวนรถยนต์</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <?php foreach ($car_lots as $lot): ?>
                                <div
                                    class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span class="text-sm font-medium text-gray-600"><?php echo $lot; ?></span>
                                    <input type="number" name="car_lots[<?php echo $lot; ?>]"
                                        class="w-24 px-3 py-2 rounded-lg border border-gray-300 text-center"
                                        value="<?php echo $lot_counts[$lot] ?? ''; ?>">
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-gray-100">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">6. จำนวนรถมอเตอร์ไซค์</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <?php foreach ($motorcycle_lots as $lot): ?>
                                <div
                                    class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span class="text-sm font-medium text-gray-600"><?php echo $lot; ?></span>
                                    <input type="number" name="motorcycle_lots[<?php echo $lot; ?>]"
                                        class="w-24 px-3 py-2 rounded-lg border border-gray-300 text-center"
                                        value="<?php echo $lot_counts[$lot] ?? ''; ?>">
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-gray-100">
                        <label class="block text-sm font-bold text-gray-700 mb-4">7. สถานะยางอะไหล่</label>
                        <div class="flex gap-4">
                            <label class="flex-1 cursor-pointer">
                                <input type="radio" name="spare_tire_status" value="มี" class="hidden peer" <?php echo $report['spare_tire_status'] == 'มี' ? 'checked' : ''; ?>>
                                <div
                                    class="p-4 text-center border-2 rounded-2xl peer-checked:border-green-500 peer-checked:bg-green-50 text-gray-500 peer-checked:text-green-700 font-bold transition">
                                    มี</div>
                            </label>
                            <label class="flex-1 cursor-pointer">
                                <input type="radio" name="spare_tire_status" value="ไม่มี" class="hidden peer" <?php echo $report['spare_tire_status'] == 'ไม่มี' ? 'checked' : ''; ?>>
                                <div
                                    class="p-4 text-center border-2 rounded-2xl peer-checked:border-red-500 peer-checked:bg-red-50 text-gray-500 peer-checked:text-red-700 font-bold transition">
                                    ไม่มี</div>
                            </label>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-gray-100">
                        <label class="block text-sm font-bold text-gray-700 mb-2">8. ป้ายทะเบียนรถ</label>
                        <div id="plate-container" class="space-y-3">
                            <?php
                            $plates = explode(", ", $report['license_plates']);
                            foreach ($plates as $idx => $plate):
                                if (empty($plate))
                                    continue; ?>
                                <div class="flex gap-2">
                                    <input type="text" name="license_plates[]"
                                        class="flex-1 px-5 py-3 rounded-xl border border-gray-300"
                                        value="<?php echo htmlspecialchars($plate); ?>">
                                    <button type="button" onclick="this.parentElement.remove()"
                                        class="px-4 text-red-500 font-bold hover:bg-red-50 rounded-xl transition">&times;</button>
                                </div>
                            <?php endforeach; ?>
                            <?php if (empty(array_filter($plates))): ?>
                                <input type="text" name="license_plates[]"
                                    class="w-full px-5 py-3 rounded-xl border border-gray-300"
                                    placeholder="เพิ่มป้ายทะเบียน">
                            <?php endif; ?>
                        </div>
                        <button type="button" onclick="addPlate()"
                            class="mt-4 text-blue-600 font-bold hover:underline">+ เพิ่มช่องป้ายทะเบียน</button>
                    </div>

                    <div class="pt-8 text-center">
                        <button type="submit"
                            class="bg-blue-600 text-white font-bold py-4 px-12 rounded-2xl hover:bg-blue-700 shadow-lg transition transform hover:-translate-y-1">บันทึกการแก้ไข</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        function addPlate() {
            const container = document.getElementById('plate-container');
            const div = document.createElement('div');
            div.className = 'flex gap-2';
            div.innerHTML = '<input type="text" name="license_plates[]" class="flex-1 px-5 py-3 rounded-xl border border-gray-300" placeholder="ป้ายทะเบียน"><button type="button" onclick="this.parentElement.remove()" class="px-4 text-red-500 font-bold hover:bg-red-50 rounded-xl transition">&times;</button>';
            container.appendChild(div);
        }
    </script>
</body>

</html>