<?php
require_once "check_permissions.php";
require_once "config.php";

$report_id = $_GET['id'] ?? null;
if (!$report_id) {
    header("Location: report_page.php");
    exit;
}

$is_admin = (isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions'])) || (isset($_SESSION['username']) && strcasecmp($_SESSION['username'], 'admin') === 0);

$report = null;
$stmt = $conn->prepare("SELECT * FROM cctv_angle_reports WHERE id = ?");
$stmt->bind_param("i", $report_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 1) {
    $report = $result->fetch_assoc();
    // Assuming checked_by is the username or name. We don't have a direct user_id check here like others, 
    // but usually admins edit these anyway.
    if (!$is_admin && $_SESSION['username'] != $report['checked_by']) {
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
        $correct = (int) $_POST['correct_cameras'];
        $incorrect = (int) $_POST['incorrect_cameras'];
        $total = $correct + $incorrect;

        $sql = "UPDATE cctv_angle_reports SET 
                correct_cameras = ?, incorrect_cameras = ?, total_cameras = ?
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iiii", $correct, $incorrect, $total, $report_id);

        if ($stmt->execute()) {
            header("Location: edit_cctv_angle.php?id=$report_id&message=" . urlencode("แก้ไขรายงานมุมกล้องเรียบร้อยแล้ว"));
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
    <title>แก้ไขรายงานมุมกล้อง CCTV</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-100 min-h-screen py-8 px-4">
    <div class="max-w-2xl mx-auto">
        <form action="edit_cctv_angle.php?id=<?php echo $report_id; ?>" method="POST"
            class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <header class="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-8 flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold">แก้ไขรายงานมุมกล้อง CCTV</h1>
                    <p class="text-blue-100 mt-1"><?php echo $report['building']; ?> - NVR <?php echo $report['nvr']; ?>
                        | <?php echo date('d/m/Y', strtotime($report['report_date'])); ?></p>
                </div>
                <a href="report_page.php"
                    class="bg-white text-blue-700 font-bold py-2 px-6 rounded-xl shadow-md">กลับ</a>
            </header>

            <div class="p-8 space-y-6">
                <?php if ($message): ?>
                    <div class="p-4 rounded-xl bg-green-50 text-green-700 border border-green-100">
                        <?php echo htmlspecialchars($message); ?></div><?php endif; ?>

                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                <div class="space-y-4">
                    <label class="block text-sm font-bold text-gray-700">จำนวนกล้องที่มุมถูกต้อง</label>
                    <input type="number" name="correct_cameras" required
                        class="w-full px-4 py-3 rounded-xl border border-green-200 bg-green-50"
                        value="<?php echo $report['correct_cameras']; ?>">
                </div>
                <div class="space-y-4">
                    <label class="block text-sm font-bold text-gray-700">จำนวนกล้องที่มุมไม่ถูกต้อง</label>
                    <input type="number" name="incorrect_cameras" required
                        class="w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50"
                        value="<?php echo $report['incorrect_cameras']; ?>">
                </div>

                <div class="pt-8 text-center border-t">
                    <button type="submit"
                        class="bg-blue-600 text-white font-bold py-4 px-12 rounded-2xl hover:bg-blue-700 shadow-lg transition">บันทึกการแก้ไข</button>
                    <p class="mt-4 text-sm text-gray-500 italic">ผู้ตรวจสอบ: <?php echo $report['checked_by']; ?></p>
                </div>
            </div>
        </form>
    </div>
</body>

</html>