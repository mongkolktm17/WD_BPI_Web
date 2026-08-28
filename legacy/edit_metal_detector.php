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
$stmt = $conn->prepare("SELECT * FROM metal_detector_checks WHERE id = ?");
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
        $sql = "UPDATE metal_detector_checks SET 
                inspection_date = ?, shift = ?, employee_name = ?, building = ?, guard_post = ?, 
                scanner_brand = ?, zone1_status = ?, zone2_status = ?, zone3_status = ?, 
                zone4_status = ?, zone5_status = ?, zone6_status = ?, updated_by = ? 
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $updated_by = $_SESSION['username'] ?? 'Unknown';
        $stmt->bind_param(
            "sssssssssssssi",
            $_POST['date'],
            $_POST['shift'],
            $_POST['employee_name'],
            $_POST['building'],
            $_POST['guard_post'],
            $_POST['scanner_brand'],
            $_POST['zone1_status'],
            $_POST['zone2_status'],
            $_POST['zone3_status'],
            $_POST['zone4_status'],
            $_POST['zone5_status'],
            $_POST['zone6_status'],
            $updated_by,
            $report_id
        );

        if ($stmt->execute()) {
            header("Location: edit_metal_detector.php?id=$report_id&message=" . urlencode("แก้ไขรายงานเรียบร้อยแล้ว"));
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
    <title>แก้ไขการตรวจ Metal Detector</title>
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
        <form action="edit_metal_detector.php?id=<?php echo $report_id; ?>" method="POST"
            class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <header class="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-8 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold">แก้ไขการตรวจ Metal Detector</h1>
                    <p class="text-blue-100 mt-1">ID: #<?php echo $report_id; ?> | รหัสผู้ตรวจ:
                        <?php echo $report['employee_id']; ?></p>
                </div>
                <a href="report_page.php"
                    class="bg-white text-blue-700 font-bold py-2 px-6 rounded-xl shadow-md">กลับ</a>
            </header>

            <div class="p-8 space-y-6">
                <?php if ($message): ?>
                    <div class="p-4 rounded-xl bg-green-50 text-green-700 border border-green-100">
                        <?php echo htmlspecialchars($message); ?></div><?php endif; ?>

                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">วันที่</label><input type="date"
                            name="date" required class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo $report['inspection_date']; ?>"></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">กะ</label><select name="shift"
                            class="w-full px-4 py-3 rounded-xl border">
                            <option value="เช้า" <?php echo $report['shift'] == 'เช้า' ? 'selected' : ''; ?>>เช้า</option>
                            <option value="ดึก" <?php echo $report['shift'] == 'ดึก' ? 'selected' : ''; ?>>ดึก</option>
                        </select></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">ชื่อผู้ตรวจ</label><input type="text"
                            name="employee_name" required class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo htmlspecialchars($report['employee_name']); ?>"></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">ตึก</label><input type="text"
                            name="building" required class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo htmlspecialchars($report['building']); ?>"></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">จุดรักษาการณ์</label><input
                            type="text" name="guard_post" required class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo htmlspecialchars($report['guard_post']); ?>"></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-2">ยี่ห้อตู้สแกน</label><input
                            type="text" name="scanner_brand" required class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo htmlspecialchars($report['scanner_brand']); ?>"></div>
                </div>

                <div class="space-y-4 pt-6 border-t">
                    <h3 class="font-bold text-gray-800">สถานะโซน (1-6)</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <?php for ($i = 1; $i <= 6; $i++):
                            $field = "zone{$i}_status"; ?>
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span class="text-xs font-bold">โซน <?php echo $i; ?></span>
                                <select name="<?php echo $field; ?>" class="text-xs border rounded p-1">
                                    <option value="พร้อมใช้งาน" <?php echo $report[$field] == 'พร้อมใช้งาน' ? 'selected' : ''; ?>>พร้อมใช้งาน</option>
                                    <option value="ไม่พร้อมใช้งาน" <?php echo $report[$field] == 'ไม่พร้อมใช้งาน' ? 'selected' : ''; ?>>ไม่พร้อมใช้งาน</option>
                                    <option value="อื่นๆ" <?php echo $report[$field] == 'อื่นๆ' ? 'selected' : ''; ?>>อื่นๆ
                                    </option>
                                </select>
                            </div>
                        <?php endfor; ?>
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