<?php
/**
 * clean_extra_officers.php
 * 
 * Script to remove officers that are in database but not in CSV
 */

require_once "check_permissions.php";

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

$message = "";
$error = "";

// Get officers from database
$db_officers = [];
$sql = "SELECT id, employee_id, first_name, last_name, username 
        FROM users 
        WHERE user_type = 'officer' 
        ORDER BY employee_id";
$result = $conn->query($sql);
while ($row = $result->fetch_assoc()) {
    $db_officers[$row['employee_id']] = $row;
}

// Read CSV file to get valid employee IDs
$csv_employee_ids = [];
$csv_file = 'report_assets/officers.csv';
if (file_exists($csv_file)) {
    $handle = fopen($csv_file, 'r');
    fgetcsv($handle); // Skip header

    while (($data = fgetcsv($handle)) !== FALSE) {
        if (count($data) >= 8) {
            $csv_employee_ids[] = $data[1]; // employee_id is in column 1
        }
    }
    fclose($handle);
}

// Find officers to delete (in DB but not in CSV)
$officers_to_delete = [];
foreach ($db_officers as $emp_id => $officer) {
    if (!in_array($emp_id, $csv_employee_ids)) {
        $officers_to_delete[] = $officer;
    }
}

// Process delete request
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['confirm_delete'])) {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token. การดำเนินการถูกยกเลิกเพื่อความปลอดภัย";
    } else {
        $deleted_count = 0;
        $failed_count = 0;

        foreach ($officers_to_delete as $officer) {
            $sql_delete = "DELETE FROM users WHERE id = ? AND user_type = 'officer'";
            $stmt = $conn->prepare($sql_delete);
            $stmt->bind_param("i", $officer['id']);

            if ($stmt->execute()) {
                $deleted_count++;
            } else {
                $failed_count++;
            }
            $stmt->close();
        }

        if ($deleted_count > 0) {
            $message = "ลบพนักงานสำเร็จ $deleted_count คน";
        }
        if ($failed_count > 0) {
            $error = "ลบไม่สำเร็จ $failed_count คน";
        }

        // Refresh the list
        header("Location: " . $_SERVER['PHP_SELF']);
        exit;
    }
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ลบพนักงานที่ไม่อยู่ใน CSV</title>
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
                <h1 class="text-3xl font-bold text-gray-800">ลบพนักงานที่ไม่อยู่ใน CSV</h1>
                <div class="space-x-2">
                    <a href="check_officers_db.php"
                        class="text-sm bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">ตรวจสอบข้อมูล</a>
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

        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">
                พบพนักงานที่ไม่อยู่ใน CSV จำนวน <?php echo count($officers_to_delete); ?> คน
            </h2>

            <?php if (count($officers_to_delete) > 0): ?>
                <div class="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p class="text-yellow-800 font-bold">⚠️ คำเตือน:</p>
                    <p class="text-yellow-700">การลบจะไม่สามารถกู้คืนได้ กรุณาตรวจสอบรายการก่อนยืนยันการลบ</p>
                </div>

                <div class="overflow-x-auto mb-6">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    รหัสพนักงาน</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ชื่อ - นามสกุล</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ชื่อผู้ใช้</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <?php foreach ($officers_to_delete as $officer): ?>
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <?php echo htmlspecialchars($officer['employee_id']); ?>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <?php echo htmlspecialchars($officer['first_name'] . ' ' . $officer['last_name']); ?>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <?php echo htmlspecialchars($officer['username']); ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post"
                    onsubmit="return confirm('คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน <?php echo count($officers_to_delete); ?> คนนี้? การลบจะไม่สามารถกู้คืนได้!');">
                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                    <button type="submit" name="confirm_delete"
                        class="w-full md:w-auto bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700 transition-colors">
                        ยืนยันการลบพนักงาน <?php echo count($officers_to_delete); ?> คน
                    </button>
                </form>
            <?php else: ?>
                <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p class="text-green-800 font-bold">✓ เรียบร้อย!</p>
                    <p class="text-green-700">ไม่พบพนักงานที่ต้องลบ ข้อมูลในฐานข้อมูลตรงกับ CSV ทุกรายการ</p>
                </div>
            <?php endif; ?>
        </div>
    </div>

</body>

</html>