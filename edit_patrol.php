<?php
require_once "check_permissions.php";
require_once "config.php";

$report_id = $_GET['id'] ?? null;
if (!$report_id) {
    header("Location: report_page.php");
    exit;
}

$is_admin = (isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions'])) || (isset($_SESSION['username']) && strcasecmp($_SESSION['username'], 'admin') === 0);
$current_user_employee_id = $_SESSION['employee_id'] ?? '';

$report = null;
$stmt = $conn->prepare("SELECT * FROM patrol_reports WHERE id = ?");
$stmt->bind_param("i", $report_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 1) {
    $report = $result->fetch_assoc();
    if (!$is_admin && $current_user_employee_id != $report['employee_id']) {
        header("Location: report_page.php?error=access_denied");
        exit;
    }
} else {
    header("Location: report_page.php?error=not_found");
    exit;
}
$stmt->close();

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token.";
    } else {
        $sql = "UPDATE patrol_reports SET 
            report_date = ?, report_condition = ?, shift = ?, patrol_time = ?, building = ?,
            fence_lighting = ?, fence_objects = ?, no_gathering = ?, no_flyers = ?, fence_normal = ?,
            no_suspicious_parking = ?, no_suspicious_boxes = ?, no_unauthorized_persons_area = ?,
            door_system_normal = ?, electrical_system_normal = ?, no_room_abnormalities = ?,
            no_unauthorized_persons_room = ?, no_chemical_obstruction = ?, no_container_leaks = ?,
            no_unauthorized_persons_chemical = ?, chemical_door_normal = ?,
            no_unauthorized_persons_electrical = ?, electrical_door_normal = ?,
            no_electrical_abnormalities = ?, equipment_normal = ?, no_fire_door_obstruction = ?,
            updated_by = ?, updated_at = NOW()
            WHERE id = ?";

        $stmt = $conn->prepare($sql);
        $updated_by = $_SESSION['username'] ?? 'Unknown';
        $stmt->bind_param(
            "sssssssssssssssssssssssssssi",
            $_POST['date'],
            $_POST['condition'],
            $_POST['shift'],
            $_POST['patrol_time'],
            $_POST['building'],
            $_POST['fence_lighting'],
            $_POST['fence_objects'],
            $_POST['no_gathering'],
            $_POST['no_flyers'],
            $_POST['fence_normal'],
            $_POST['no_suspicious_parking'],
            $_POST['no_suspicious_boxes'],
            $_POST['no_unauthorized_persons_area'],
            $_POST['door_system_normal'],
            $_POST['electrical_system_normal'],
            $_POST['no_room_abnormalities'],
            $_POST['no_unauthorized_persons_room'],
            $_POST['no_chemical_obstruction'],
            $_POST['no_container_leaks'],
            $_POST['no_unauthorized_persons_chemical'],
            $_POST['chemical_door_normal'],
            $_POST['no_unauthorized_persons_electrical'],
            $_POST['electrical_door_normal'],
            $_POST['no_electrical_abnormalities'],
            $_POST['equipment_normal'],
            $_POST['no_fire_door_obstruction'],
            $updated_by,
            $report_id
        );

        if ($stmt->execute()) {
            header("Location: edit_patrol.php?id=$report_id&message=" . urlencode("แก้ไขรายงานเรียบร้อยแล้ว"));
            exit;
        } else {
            $error = $stmt->error;
        }
    }
}

$message = $_GET['message'] ?? "";
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แก้ไขรายงานการเดินตรวจ</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-100 min-h-screen py-8 px-4">
    <div class="max-w-4xl mx-auto">
        <form action="edit_patrol.php?id=<?php echo $report_id; ?>" method="POST"
            class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <header class="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-8 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold">แก้ไขรายงานการเดินตรวจ</h1>
                    <p class="text-blue-100 mt-1">ID: #<?php echo $report_id; ?> | ผู้ตรวจ:
                        <?php echo $report['inspector_name']; ?></p>
                </div>
                <a href="report_page.php"
                    class="bg-white text-blue-700 font-bold py-2 px-6 rounded-xl shadow-md">กลับ</a>
            </header>

            <div class="p-8 space-y-8">
                <?php if ($message): ?>
                    <div class="p-4 rounded-xl bg-green-50 text-green-700 border border-green-100">
                        <?php echo htmlspecialchars($message); ?></div><?php endif; ?>

                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">วันที่</label><input type="date"
                            name="date" required class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo $report['report_date']; ?>"></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">ภาวะ</label><select name="condition"
                            class="w-full px-4 py-3 rounded-xl border border-gray-300">
                            <option value="ภาวะปกติ" <?php echo $report['report_condition'] == 'ภาวะปกติ' ? 'selected' : ''; ?>>ปกติ</option>
                            <option value="ภาวะฉุกเฉิน" <?php echo $report['report_condition'] == 'ภาวะฉุกเฉิน' ? 'selected' : ''; ?>>ฉุกเฉิน</option>
                        </select></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">กะ</label><input type="text"
                            name="shift" class="w-full px-4 py-3 rounded-xl border bg-gray-50"
                            value="<?php echo $report['shift']; ?>"></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">ช่วงเวลา</label><input type="text"
                            name="patrol_time" class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo $report['patrol_time']; ?>"></div>
                    <div class="md:col-span-2"><label
                            class="block text-sm font-bold text-gray-700 mb-2">อาคาร</label><input type="text"
                            name="building" class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo $report['building']; ?>"></div>
                </div>

                <div class="space-y-4">
                    <h3 class="text-xl font-bold text-sky-700 border-b pb-2">สถานะการตรวจสอบ</h3>
                    <div class="grid grid-cols-1 gap-3">
                        <?php
                        $fields = [
                            'fence_lighting' => 'ไฟฟ้าแสงสว่างตามแนวรั้ว',
                            'fence_objects' => 'ไม่มีสิ่งของวางพาดบนแนวรั้ว',
                            'no_gathering' => 'ไม่มีบุคคลมาจับกลุ่มชุมนุม',
                            'no_flyers' => 'ไม่มีข่าวสาร/ใบปลิว',
                            'fence_normal' => 'ความปกติแนวรั้ว',
                            'no_suspicious_parking' => 'ไม่มีรถจอดผิดปกติ',
                            'no_suspicious_boxes' => 'ไม่มีกล่องต้องสงสัย',
                            'no_unauthorized_persons_area' => 'ไม่มีบุคคลไม่เกี่ยวข้องภายใน',
                            'door_system_normal' => 'ระบบประตู',
                            'electrical_system_normal' => 'ระบบไฟฟ้า',
                            'no_room_abnormalities' => 'ความปกติภายในห้อง',
                            'no_unauthorized_persons_room' => 'บุคคลภายในห้องควบคุม',
                            'no_chemical_obstruction' => 'ไม่มีสิ่งกีดขวางห้องเคมี',
                            'no_container_leaks' => 'ภาชนะบรรจุสารเคมี',
                            'no_unauthorized_persons_chemical' => 'บุคคลในพื้นที่สารเคมี',
                            'chemical_door_normal' => 'ประตูห้องสารเคมี',
                            'no_unauthorized_persons_electrical' => 'บุคคลในสถานีไฟฟ้า',
                            'electrical_door_normal' => 'ประตูสถานีไฟฟ้า',
                            'no_electrical_abnormalities' => 'ความปกติสถานีไฟฟ้า',
                            'equipment_normal' => 'อุปกรณ์ใช้งานปกติ',
                            'no_fire_door_obstruction' => 'ไม่มีสิ่งขวางประตูหนีไฟ'
                        ];
                        foreach ($fields as $key => $label): ?>
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span class="text-sm font-medium"><?php echo $label; ?></span>
                                <div class="flex gap-2">
                                    <label class="cursor-pointer">
                                        <input type="radio" name="<?php echo $key; ?>" value="ปกติ" <?php echo (strpos($report[$key], 'ปกติ') !== false || strpos($report[$key], 'เพียงพอ') !== false || strpos($report[$key], 'ไม่มี') !== false || strpos($report[$key], 'ไม่พบ') !== false) ? 'checked' : ''; ?> class="hidden peer">
                                        <div
                                            class="px-3 py-1 text-xs border rounded-lg peer-checked:bg-green-500 peer-checked:text-white transition">
                                            ปกติ/ใช่</div>
                                    </label>
                                    <label class="cursor-pointer">
                                        <input type="radio" name="<?php echo $key; ?>" value="ความผิดปกติ" <?php echo (strpos($report[$key], 'ผิดปกติ') !== false || strpos($report[$key], 'มี') !== false || strpos($report[$key], 'พบ') !== false || strpos($report[$key], 'ไม่เพียงพอ') !== false) ? 'checked' : ''; ?> class="hidden peer">
                                        <div
                                            class="px-3 py-1 text-xs border rounded-lg peer-checked:bg-red-500 peer-checked:text-white transition">
                                            ผิดปกติ/ไม่</div>
                                    </label>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <div class="pt-8 text-center">
                    <button type="submit"
                        class="bg-blue-600 text-white font-bold py-4 px-12 rounded-2xl hover:bg-blue-700 shadow-lg transition">บันทึกการแก้ไข</button>
                </div>
            </div>
        </form>
    </div>
</body>

</html>