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
$stmt = $conn->prepare("SELECT sgc.*, u.username as submitted_by_name FROM security_guard_counts sgc LEFT JOIN users u ON sgc.submitted_by_id = u.id WHERE sgc.id = ?");
$stmt->bind_param("i", $report_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 1) {
    $report = $result->fetch_assoc();
    if (!$is_admin && $_SESSION['id'] != $report['submitted_by_id']) {
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
        $morning = (int) $_POST['morning_shift'];
        $morning_contract = !empty($_POST['morning_shift_contract']) ? (int) $_POST['morning_shift_contract'] : null;
        $evening = (int) $_POST['evening_shift'];
        $evening_contract = !empty($_POST['evening_shift_contract']) ? (int) $_POST['evening_shift_contract'] : null;
        $total = $morning + $evening;

        $sql = "UPDATE security_guard_counts SET 
                morning_shift = ?, morning_shift_contract = ?, 
                evening_shift = ?, evening_shift_contract = ?, 
                total = ?, updated_at = NOW() 
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iiiiii", $morning, $morning_contract, $evening, $evening_contract, $total, $report_id);

        if ($stmt->execute()) {
            header("Location: edit_guard_count.php?id=$report_id&message=" . urlencode("แก้ไขจำนวน รปภ. เรียบร้อยแล้ว"));
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
    <title>แก้ไขจำนวน รปภ.</title>
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
        <form action="edit_guard_count.php?id=<?php echo $report_id; ?>" method="POST"
            class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <header class="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-8 flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold">แก้ไขจำนวน รปภ.</h1>
                    <p class="text-blue-100 mt-1">วันที่:
                        <?php echo date('d/m/Y', strtotime($report['record_date'])); ?></p>
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
                    <div class="space-y-4">
                        <label class="block text-sm font-bold text-gray-700">กะเช้า (07:00-19:00)</label>
                        <input type="number" name="morning_shift" required class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo $report['morning_shift']; ?>" placeholder="จำนวนจริง">
                        <input type="number" name="morning_shift_contract"
                            class="w-full px-4 py-3 rounded-xl border bg-gray-50"
                            value="<?php echo $report['morning_shift_contract']; ?>"
                            placeholder="จำนวนสัญญา (ไม่บังคับ)">
                    </div>
                    <div class="space-y-4">
                        <label class="block text-sm font-bold text-gray-700">กะดึก (19:00-07:00)</label>
                        <input type="number" name="evening_shift" required class="w-full px-4 py-3 rounded-xl border"
                            value="<?php echo $report['evening_shift']; ?>" placeholder="จำนวนจริง">
                        <input type="number" name="evening_shift_contract"
                            class="w-full px-4 py-3 rounded-xl border bg-gray-50"
                            value="<?php echo $report['evening_shift_contract']; ?>"
                            placeholder="จำนวนสัญญา (ไม่บังคับ)">
                    </div>
                </div>

                <div class="pt-8 text-center border-t">
                    <button type="submit"
                        class="bg-blue-600 text-white font-bold py-4 px-12 rounded-2xl hover:bg-blue-700 shadow-lg transition">บันทึกการแก้ไข</button>
                    <p class="mt-4 text-sm text-gray-500 italic">บันทึกโดย: <?php echo $report['submitted_by_name']; ?>
                    </p>
                </div>
            </div>
        </form>
    </div>
</body>

</html>