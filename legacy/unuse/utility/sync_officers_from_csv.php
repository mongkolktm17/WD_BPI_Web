<?php
/**
 * sync_officers_from_csv.php
 * 
 * Script to synchronize officer data from CSV file to database
 * This will update missing fields (last_name, eng names, username, password)
 */

require_once "check_permissions.php";

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

$message = "";
$error = "";
$sync_results = [];

// Process sync request
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['sync_data'])) {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token. การดำเนินการถูกยกเลิกเพื่อความปลอดภัย";
    } else {
        // Read CSV file
        $csv_file = 'report_assets/officers.csv';
        if (!file_exists($csv_file)) {
            $error = "ไม่พบไฟล์ CSV";
        } else {
            $handle = fopen($csv_file, 'r');
            // Skip header
            fgetcsv($handle);

            $updated_count = 0;
            $skipped_count = 0;
            $error_count = 0;

            while (($data = fgetcsv($handle)) !== FALSE) {
                if (count($data) < 8) {
                    continue;
                }

                $employee_id = trim($data[1]);
                $first_name = trim($data[2]);
                $last_name = trim($data[3]);
                $eng_first_name = trim($data[4]);
                $eng_last_name = trim($data[5]);
                // Generate username from English name + 2 chars from last name
                $base_username = strtolower($eng_first_name);
                $last_name_suffix = strtolower(substr($eng_last_name, 0, 2));
                $username = $base_username . $last_name_suffix;
                $password = trim($data[7]); // Plain text from CSV

                // Check if officer exists in database
                $sql_check = "SELECT id, last_name, eng_first_name, eng_last_name, username FROM users WHERE employee_id = ? AND user_type = 'officer'";
                $stmt_check = $conn->prepare($sql_check);
                $stmt_check->bind_param("s", $employee_id);
                $stmt_check->execute();
                $result = $stmt_check->get_result();

                if ($result->num_rows == 0) {
                    $skipped_count++;
                    $sync_results[] = "⊘ $employee_id ($first_name): ไม่พบในฐานข้อมูล (ข้าม)";
                    $stmt_check->close();
                    continue;
                }

                $officer = $result->fetch_assoc();
                $stmt_check->close();

                // Check if fields need updating
                $needs_update = false;
                $updates = [];

                if (empty($officer['last_name']) && !empty($last_name)) {
                    $needs_update = true;
                    $updates[] = "นามสกุลไทย";
                }
                if (empty($officer['eng_first_name']) && !empty($eng_first_name)) {
                    $needs_update = true;
                    $updates[] = "ชื่ออังกฤษ";
                }
                if (empty($officer['eng_last_name']) && !empty($eng_last_name)) {
                    $needs_update = true;
                    $updates[] = "นามสกุลอังกฤษ";
                }

                // Check if username needs updating (with new format)
                if ($officer['username'] != $username) {
                    $needs_update = true;
                    $updates[] = "ชื่อผู้ใช้ (ใหม่: $username)";
                }

                // Always update password if sync is requested (hash it properly)
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);

                if ($needs_update || isset($_POST['update_passwords'])) {
                    // Update the record
                    $sql_update = "UPDATE users SET 
                                   last_name = ?, 
                                   eng_first_name = ?, 
                                   eng_last_name = ?, 
                                   username = ?";

                    if (isset($_POST['update_passwords'])) {
                        $sql_update .= ", password = ?";
                        if (!in_array("รหัสผ่าน", $updates)) {
                            $updates[] = "รหัสผ่าน";
                        }
                    }

                    $sql_update .= " WHERE id = ?";

                    $stmt_update = $conn->prepare($sql_update);

                    if (isset($_POST['update_passwords'])) {
                        $stmt_update->bind_param("sssssi", $last_name, $eng_first_name, $eng_last_name, $username, $hashed_password, $officer['id']);
                    } else {
                        $stmt_update->bind_param("ssssi", $last_name, $eng_first_name, $eng_last_name, $username, $officer['id']);
                    }

                    if ($stmt_update->execute()) {
                        $updated_count++;
                        $sync_results[] = "✓ $employee_id ($first_name $last_name): อัปเดต " . implode(", ", $updates);
                    } else {
                        $error_count++;
                        $sync_results[] = "✗ $employee_id: เกิดข้อผิดพลาด - " . $stmt_update->error;
                    }
                    $stmt_update->close();
                } else {
                    $skipped_count++;
                    $sync_results[] = "⊘ $employee_id ($first_name): ข้อมูลครบแล้ว (ข้าม)";
                }
            }
            fclose($handle);

            $message = "ซิงค์ข้อมูลเสร็จสิ้น: อัปเดต $updated_count รายการ, ข้าม $skipped_count รายการ, ผิดพลาด $error_count รายการ";
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
    <title>ซิงค์ข้อมูลจาก CSV</title>
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
                <h1 class="text-3xl font-bold text-gray-800">ซิงค์ข้อมูลเจ้าหน้าที่จาก CSV</h1>
                <div class="space-x-2">
                    <a href="manage_officers.php"
                        class="text-sm bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">จัดการเจ้าหน้าที่</a>
                    <a href="dashboard.php"
                        class="text-sm bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">Dashboard</a>
                </div>
            </div>
        </header>

        <?php if (!empty($message)): ?>
            <div class="mb-4 p-4 rounded-lg bg-green-100 text-green-700"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        <?php if (!empty($error)): ?>
            <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <!-- Sync Results -->
        <?php if (!empty($sync_results)): ?>
            <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
                <h2 class="text-2xl font-bold mb-4 text-gray-800">ผลการซิงค์</h2>
                <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <ul class="space-y-1 text-sm font-mono">
                        <?php foreach ($sync_results as $result): ?>
                            <li class="<?php
                            if (strpos($result, '✓') !== false)
                                echo 'text-green-600';
                            elseif (strpos($result, '✗') !== false)
                                echo 'text-red-600';
                            else
                                echo 'text-gray-500';
                            ?>">
                                <?php echo htmlspecialchars($result); ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
        <?php endif; ?>

        <!-- Sync Form -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">ซิงค์ข้อมูลจาก officers.csv</h2>

            <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 class="font-bold text-blue-800 mb-2">ข้อมูลที่จะถูกอัปเดต:</h3>
                <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>นามสกุล (ภาษาไทย) - ถ้าว่างเปล่า</li>
                    <li>ชื่อ (ภาษาอังกฤษ) - ถ้าว่างเปล่า</li>
                    <li>นามสกุล (ภาษาอังกฤษ) - ถ้าว่างเปล่า</li>
                    <li>ชื่อผู้ใช้ - ถ้าไม่ตรงกับ CSV (จัดการชื่อซ้ำอัตโนมัติ)</li>
                    <li>รหัสผ่าน - ถ้าเลือก "อัปเดตรหัสผ่านด้วย"</li>
                </ul>
            </div>

            <div class="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p class="text-yellow-800">
                    <strong>⚠️ คำเตือน:</strong> การซิงค์จะอัปเดตข้อมูลที่ว่างเปล่าหรือไม่ตรงกับ CSV<br>
                    หากพบชื่อผู้ใช้ซ้ำ ระบบจะเพิ่ม 4 หลักท้ายของรหัสพนักงานต่อท้ายอัตโนมัติ
                </p>
            </div>

            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                <div class="mb-6">
                    <label class="flex items-center">
                        <input type="checkbox" name="update_passwords" value="1"
                            class="form-checkbox h-5 w-5 text-blue-600 rounded">
                        <span class="ml-2 text-sm text-gray-700">
                            <strong>อัปเดตรหัสผ่านทุกคนด้วย</strong> (ตั้งเป็นรหัสพนักงานตาม CSV)
                        </span>
                    </label>
                    <p class="ml-7 text-xs text-gray-500">รหัสผ่านจะถูกเข้ารหัสด้วย password_hash</p>
                </div>

                <div>
                    <button type="submit" name="sync_data"
                        class="w-full md:w-auto bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors">
                        เริ่มซิงค์ข้อมูล
                    </button>
                </div>
            </form>
        </div>
    </div>

</body>

</html>