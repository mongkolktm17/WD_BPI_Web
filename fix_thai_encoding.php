<?php
/**
 * fix_thai_encoding.php
 * 
 * Fix Thai encoding in database by re-reading ANSI (TIS-620) CSV
 */

require_once "check_permissions.php";

// Set UTF-8 charset
$conn->set_charset("utf8mb4");

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

$message = "";
$error = "";
$fix_results = [];

// Process fix request
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['fix_encoding'])) {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token.";
    } else {
        // Read CSV file with proper encoding
        $csv_file = 'report_assets/officers.csv';
        if (!file_exists($csv_file)) {
            $error = "ไม่พบไฟล์ CSV";
        } else {
            // Read ANSI file (TIS-620 for Thai) and convert to UTF-8
            $content = file_get_contents($csv_file);
            $content_utf8 = mb_convert_encoding($content, 'UTF-8', 'TIS-620');

            // Parse CSV
            $lines = explode("\n", $content_utf8);
            array_shift($lines); // Remove header

            $updated_count = 0;
            $error_count = 0;

            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line))
                    continue;

                $data = str_getcsv($line);
                if (count($data) < 8)
                    continue;

                $employee_id = trim($data[1]);
                $first_name = trim($data[2]);
                $last_name = trim($data[3]);
                $eng_first_name = trim($data[4]);
                $eng_last_name = trim($data[5]);

                // Update database with proper UTF-8 encoding
                $sql_update = "UPDATE users SET 
                               first_name = ?, 
                               last_name = ?, 
                               eng_first_name = ?, 
                               eng_last_name = ? 
                               WHERE employee_id = ? AND user_type = 'officer'";

                $stmt = $conn->prepare($sql_update);
                if ($stmt) {
                    $stmt->bind_param("sssss", $first_name, $last_name, $eng_first_name, $eng_last_name, $employee_id);

                    if ($stmt->execute() && $stmt->affected_rows > 0) {
                        $updated_count++;
                        $fix_results[] = "✓ $employee_id: $first_name $last_name - แก้ไขสำเร็จ";
                    }
                    $stmt->close();
                } else {
                    $error_count++;
                    $fix_results[] = "✗ $employee_id: เกิดข้อผิดพลาด";
                }
            }

            $message = "แก้ไข encoding เสร็จสิ้น: อัปเดต $updated_count รายการ, ผิดพลาด $error_count รายการ";
        }
    }
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แก้ไข Encoding ภาษาไทย (TIS-620)</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-100">

    <div class="container mx-auto p-4 sm:p-6 lg:p-8">
        <header class="mb-8">
            <div class="flex justify-between items-center">
                <h1 class="text-3xl font-bold text-gray-800">แก้ไข Encoding ภาษาไทยในฐานข้อมูล (TIS-620)</h1>
                <div class="space-x-2">
                    <a href="manage_officers.php"
                        class="text-sm bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">จัดการเจ้าหน้าที่</a>
                </div>
            </div>
        </header>

        <?php if (!empty($message)): ?>
            <div class="mb-4 p-4 rounded-lg bg-green-100 text-green-700"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        <?php if (!empty($error)): ?>
            <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <!-- Fix Results -->
        <?php if (!empty($fix_results)): ?>
            <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
                <h2 class="text-2xl font-bold mb-4 text-gray-800">ผลการแก้ไข</h2>
                <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <ul class="space-y-1 text-sm font-mono">
                        <?php foreach ($fix_results as $result): ?>
                            <li class="<?php echo strpos($result, '✓') !== false ? 'text-green-600' : 'text-red-600'; ?>">
                                <?php echo htmlspecialchars($result); ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
        <?php endif; ?>

        <!-- Fix Form -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">แก้ไขปัญหาการแสดงผลภาษาไทย</h2>

            <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 class="font-bold text-blue-800 mb-2">สิ่งที่จะทำ:</h3>
                <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>อ่านไฟล์ CSV ที่เป็น ANSI (TIS-620) encoding</li>
                    <li>แปลง encoding จาก TIS-620 เป็น UTF-8</li>
                    <li>อัปเดตชื่อและนามสกุลภาษาไทย/อังกฤษในฐานข้อมูล</li>
                    <li>ใช้ utf8mb4 charset สำหรับการเชื่อมต่อฐานข้อมูล</li>
                </ul>
            </div>

            <div class="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p class="text-yellow-800">
                    <strong>⚠️ คำเตือน:</strong> การแก้ไขนี้จะอัปเดตข้อมูลชื่อและนามสกุลทั้งหมดใหม่จาก CSV (TIS-620 →
                    UTF-8)
                </p>
            </div>

            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                <div>
                    <button type="submit" name="fix_encoding"
                        class="w-full md:w-auto bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors">
                        เริ่มแก้ไข Encoding (TIS-620 → UTF-8)
                    </button>
                </div>
            </form>
        </div>
    </div>

</body>

</html>