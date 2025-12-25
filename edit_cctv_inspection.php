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

// Fetch report
$report = null;
$stmt = $conn->prepare("SELECT * FROM cctv_inspections WHERE id = ?");
$stmt->bind_param("i", $report_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 1) {
    $report = $result->fetch_assoc();
    $is_author = ($current_user_employee_id == $report['employee_id']);
    if (!$is_admin && !$is_author) {
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

$message = "";
$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token.";
    } else {
        $sql = "UPDATE cctv_inspections SET 
                inspection_date = ?, shift = ?, cctv_room = ?, employee_name = ?, 
                radio_status = ?, report_books_status = ?, nvr_screen_status = ?, 
                nvr_machine_status = ?, keys_status = ?, access_control_status = ?, 
                incident_report_status = ?, updated_by = ? 
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $updated_by = $_SESSION['username'] ?? 'Unknown';
        $stmt->bind_param(
            "ssssssssssssi",
            $_POST['inspection_date'],
            $_POST['shift'],
            $_POST['cctv_room'],
            $_POST['employee_name'],
            $_POST['radio_status'],
            $_POST['report_books_status'],
            $_POST['nvr_screen_status'],
            $_POST['nvr_machine_status'],
            $_POST['keys_status'],
            $_POST['access_control_status'],
            $_POST['incident_report_status'],
            $updated_by,
            $report_id
        );

        if ($stmt->execute()) {
            header("Location: edit_cctv_inspection.php?id=$report_id&message=" . urlencode("แก้ไขรายงานเรียบร้อยแล้ว"));
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
    <title>แก้ไขการตรวจสอบห้อง CCTV</title>
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
                <h1 class="text-3xl font-bold">แก้ไขการตรวจสอบห้อง CCTV</h1>
                <p class="text-blue-100 mt-2">ID: #<?php echo $report_id; ?> | แก้ไขข้อมูลพนักงาน:
                    <?php echo $report['employee_id']; ?></p>
            </header>

            <div class="p-8">
                <?php if ($message): ?>
                    <div class="mb-6 p-4 rounded-2xl bg-green-50 text-green-700 border border-green-100">
                        <?php echo htmlspecialchars($message); ?></div>
                <?php endif; ?>
                <?php if ($error): ?>
                    <div class="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 border border-red-100">
                        <?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>

                <form action="edit_cctv_inspection.php?id=<?php echo $report_id; ?>" method="POST" class="space-y-6">
                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">1. วันที่ตรวจเช็ค</label>
                            <input type="date" name="inspection_date" required
                                class="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                value="<?php echo $report['inspection_date']; ?>">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">2. กะ</label>
                            <select name="shift" class="w-full px-5 py-3 rounded-xl border border-gray-300">
                                <option value="เช้า" <?php echo $report['shift'] == 'เช้า' ? 'selected' : ''; ?>>เช้า
                                </option>
                                <option value="ดึก" <?php echo $report['shift'] == 'ดึก' ? 'selected' : ''; ?>>ดึก
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">3. ห้อง CCTV</label>
                            <select name="cctv_room" required
                                class="w-full px-5 py-3 rounded-xl border border-gray-300">
                                <option value="B2" <?php echo $report['cctv_room'] == 'B2' ? 'selected' : ''; ?>>B2
                                </option>
                                <option value="B3" <?php echo $report['cctv_room'] == 'B3' ? 'selected' : ''; ?>>B3
                                </option>
                                <option value="B4" <?php echo $report['cctv_room'] == 'B4' ? 'selected' : ''; ?>>B4
                                </option>
                                <option value="B9" <?php echo $report['cctv_room'] == 'B9' ? 'selected' : ''; ?>>B9
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">4. ชื่อผู้ตรวจ</label>
                            <input type="text" name="employee_name" required
                                class="w-full px-5 py-3 rounded-xl border border-gray-300"
                                value="<?php echo htmlspecialchars($report['employee_name']); ?>">
                        </div>
                    </div>

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
                        <div class="pt-6 border-t border-gray-100">
                            <label class="block text-sm font-bold text-gray-700 mb-3"><?php echo $label; ?></label>
                            <div class="flex gap-4">
                                <label class="flex-1 cursor-pointer">
                                    <input type="radio" name="<?php echo $name; ?>" value="ปกติ" class="hidden peer" <?php echo $report[$name] == 'ปกติ' ? 'checked' : ''; ?>>
                                    <div
                                        class="p-3 text-center border rounded-xl peer-checked:border-green-500 peer-checked:bg-green-50 text-gray-500 peer-checked:text-green-700 font-bold transition">
                                        ปกติ</div>
                                </label>
                                <label class="flex-1 cursor-pointer">
                                    <input type="radio" name="<?php echo $name; ?>" value="ผิดปกติ" class="hidden peer"
                                        <?php echo $report[$name] == 'ผิดปกติ' ? 'checked' : ''; ?>>
                                    <div
                                        class="p-3 text-center border rounded-xl peer-checked:border-red-500 peer-checked:bg-red-50 text-gray-500 peer-checked:text-red-700 font-bold transition">
                                        ผิดปกติ</div>
                                </label>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <div class="pt-8 text-center">
                        <button type="submit"
                            class="bg-blue-600 text-white font-bold py-4 px-12 rounded-2xl hover:bg-blue-700 shadow-lg transition transform hover:-translate-y-1">บันทึกการแก้ไข</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>

</html>