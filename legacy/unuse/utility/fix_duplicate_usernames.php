<?php
/**
 * fix_duplicate_usernames.php
 * 
 * Script to identify and potentially fix problematic usernames in the database
 * such as those with repeated patterns like "kannikapapapa"
 */

require_once "check_permissions.php";

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

$message = "";
$error = "";
$fix_results = [];
$problem_users = [];
$all_users = [];

// Process fix requests
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token. การดำเนินการถูกยกเลิกเพื่อความปลอดภัย";
    } else {
        // Fix single user
        if (isset($_POST['fix_user_id'])) {
            $user_id = intval($_POST['fix_user_id']);
            $expected_username = trim($_POST['expected_username']);

            // Check if expected username is already taken
            $sql_check = "SELECT id FROM users WHERE username = ? AND id != ?";
            $stmt_check = $conn->prepare($sql_check);
            $stmt_check->bind_param("si", $expected_username, $user_id);
            $stmt_check->execute();

            if ($stmt_check->get_result()->num_rows > 0) {
                // Username is taken, find next available with number suffix
                $final_username = $expected_username;
                $suffix = 1;
                $found = false;
                while ($suffix <= 99) {
                    $test_username = $expected_username . $suffix;
                    $stmt_check2 = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
                    $stmt_check2->bind_param("si", $test_username, $user_id);
                    $stmt_check2->execute();

                    if ($stmt_check2->get_result()->num_rows == 0) {
                        $final_username = $test_username;
                        $stmt_check2->close();
                        $found = true;
                        break;
                    }
                    $stmt_check2->close();
                    $suffix++;
                }

                if (!$found) {
                    $error = "ไม่สามารถหา username ที่ไม่ซ้ำได้";
                }
            } else {
                $final_username = $expected_username;
            }
            $stmt_check->close();

            // Update username
            $sql_update = "UPDATE users SET username = ? WHERE id = ?";
            $stmt_update = $conn->prepare($sql_update);
            $stmt_update->bind_param("si", $final_username, $user_id);

            if ($stmt_update->execute()) {
                $note = ($final_username !== $expected_username) ? " (ใช้ $final_username แทน $expected_username เนื่องจากซ้ำ)" : "";
                $message = "แก้ไข username สำเร็จ: $final_username$note";
            } else {
                $error = "เกิดข้อผิดพลาดในการแก้ไข: " . $stmt_update->error;
            }
            $stmt_update->close();
        }

        // Fix all problematic users
        if (isset($_POST['fix_all'])) {
            $fixed_count = 0;
            $skipped_count = 0;

            // Get all problem users first
            $sql_problems = "SELECT id, username, eng_first_name, eng_last_name, first_name, last_name FROM users ORDER BY id";
            $result_problems = $conn->query($sql_problems);
            $users_to_fix = [];

            while ($row = $result_problems->fetch_assoc()) {
                $eng_first_clean = preg_replace('/[^a-zA-Z]/', '', $row['eng_first_name']);
                $eng_last_clean = preg_replace('/[^a-zA-Z]/', '', $row['eng_last_name']);
                $expected = strtolower($eng_first_clean . substr($eng_last_clean, 0, 2));

                if ($row['username'] !== $expected && !empty($expected)) {
                    $is_numbered = preg_match('/^' . preg_quote($expected, '/') . '\d+$/', $row['username']);

                    // Only fix truly problematic ones (not numbered variants unless specified)
                    if (!$is_numbered || isset($_POST['include_numbered'])) {
                        $users_to_fix[] = [
                            'id' => $row['id'],
                            'current' => $row['username'],
                            'expected' => $expected,
                            'name' => $row['first_name'] . ' ' . $row['last_name']
                        ];
                    }
                }
            }

            // Fix each user
            foreach ($users_to_fix as $user) {
                // Check if expected username is available
                $final_username = $user['expected'];
                $sql_check = "SELECT id FROM users WHERE username = ? AND id != ?";
                $stmt = $conn->prepare($sql_check);
                $stmt->bind_param("si", $final_username, $user['id']);
                $stmt->execute();

                if ($stmt->get_result()->num_rows > 0) {
                    // Find next available number
                    $suffix = 1;
                    while ($suffix <= 99) {
                        $test_username = $user['expected'] . $suffix;
                        $stmt2 = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
                        $stmt2->bind_param("si", $test_username, $user['id']);
                        $stmt2->execute();

                        if ($stmt2->get_result()->num_rows == 0) {
                            $final_username = $test_username;
                            $stmt2->close();
                            break;
                        }
                        $stmt2->close();
                        $suffix++;
                    }
                }
                $stmt->close();

                // Update
                $sql_update = "UPDATE users SET username = ? WHERE id = ?";
                $stmt_update = $conn->prepare($sql_update);
                $stmt_update->bind_param("si", $final_username, $user['id']);

                if ($stmt_update->execute()) {
                    $fixed_count++;
                    $note = ($final_username !== $user['expected']) ? " (ใช้ $final_username แทน)" : "";
                    $fix_results[] = "✓ {$user['name']}: {$user['current']} → $final_username$note";
                } else {
                    $skipped_count++;
                    $fix_results[] = "✗ {$user['name']}: ผิดพลาด";
                }
                $stmt_update->close();
            }

            $message = "แก้ไขเสร็จสิ้น: สำเร็จ $fixed_count รายการ, ล้มเหลว $skipped_count รายการ";
        }
    }
}

// Query all users
$sql = "SELECT id, username, eng_first_name, eng_last_name, employee_id, first_name, last_name, user_type FROM users ORDER BY id";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $all_users[] = $row;

        // Calculate what the username SHOULD be
        $eng_first_clean = preg_replace('/[^a-zA-Z]/', '', $row['eng_first_name']);
        $eng_last_clean = preg_replace('/[^a-zA-Z]/', '', $row['eng_last_name']);
        $expected_username = strtolower($eng_first_clean . substr($eng_last_clean, 0, 2));

        // Check if current username matches expected
        if ($row['username'] !== $expected_username && !empty($expected_username)) {
            // Check if it's just a numbered variant (e.g., kannikapa1, kannikapa2)
            $is_numbered_variant = preg_match('/^' . preg_quote($expected_username, '/') . '\d+$/', $row['username']);

            $problem_users[] = [
                'id' => $row['id'],
                'current_username' => $row['username'],
                'expected_username' => $expected_username,
                'is_numbered' => $is_numbered_variant,
                'employee_id' => $row['employee_id'],
                'name' => $row['first_name'] . ' ' . $row['last_name'],
                'eng_name' => $row['eng_first_name'] . ' ' . $row['eng_last_name'],
                'user_type' => $row['user_type']
            ];
        }
    }
}

?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ตรวจสอบและแก้ไข Username</title>
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
                <h1 class="text-3xl font-bold text-gray-800">ตรวจสอบและแก้ไข Username</h1>
                <a href="dashboard.php"
                    class="text-sm bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">กลับ
                    Dashboard</a>
            </div>
        </header>

        <!-- Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-white rounded-xl shadow p-6">
                <h3 class="text-gray-600 text-sm font-medium">จำนวนผู้ใช้ทั้งหมด</h3>
                <p class="text-3xl font-bold text-blue-600 mt-2"><?php echo count($all_users); ?></p>
            </div>
            <div class="bg-white rounded-xl shadow p-6">
                <h3 class="text-gray-600 text-sm font-medium">Username ที่อาจมีปัญหา</h3>
                <p class="text-3xl font-bold text-orange-600 mt-2"><?php echo count($problem_users); ?></p>
            </div>
            <div class="bg-white rounded-xl shadow p-6">
                <h3 class="text-gray-600 text-sm font-medium">Username ที่ถูกต้อง</h3>
                <p class="text-3xl font-bold text-green-600 mt-2">
                    <?php echo count($all_users) - count($problem_users); ?>
                </p>
            </div>
        </div>

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

        <!-- Problem Users List -->
        <?php if (!empty($problem_users)): ?>
            <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Username ที่อาจมีปัญหา</h2>
                    <form method="post" class="flex items-center gap-4"
                        onsubmit="return confirm('คุณต้องการแก้ไข username ทั้งหมดใช่หรือไม่?');">
                        <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                        <label class="flex items-center text-sm">
                            <input type="checkbox" name="include_numbered" class="mr-2">
                            รวม username ที่มีตัวเลขด้วย
                        </label>
                        <button type="submit" name="fix_all"
                            class="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors">
                            🔧 แก้ไขทั้งหมด
                        </button>
                    </form>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-gray-100 border-b">
                                <th class="text-left p-3">ID</th>
                                <th class="text-left p-3">รหัสพนักงาน</th>
                                <th class="text-left p-3">ชื่อ-นามสกุล (ไทย)</th>
                                <th class="text-left p-3">ชื่อ-นามสกุล (อังกฤษ)</th>
                                <th class="text-left p-3">Username ปัจจุบัน</th>
                                <th class="text-left p-3">Username ที่คาดหวัง</th>
                                <th class="text-left p-3">สถานะ</th>
                                <th class="text-center p-3">การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($problem_users as $user): ?>
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="p-3"><?php echo htmlspecialchars($user['id']); ?></td>
                                    <td class="p-3 font-mono"><?php echo htmlspecialchars($user['employee_id']); ?></td>
                                    <td class="p-3"><?php echo htmlspecialchars($user['name']); ?></td>
                                    <td class="p-3"><?php echo htmlspecialchars($user['eng_name']); ?></td>
                                    <td class="p-3">
                                        <span class="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                                            <?php echo htmlspecialchars($user['current_username']); ?>
                                        </span>
                                    </td>
                                    <td class="p-3">
                                        <span class="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                                            <?php echo htmlspecialchars($user['expected_username']); ?>
                                        </span>
                                    </td>
                                    <td class="p-3">
                                        <?php if ($user['is_numbered']): ?>
                                            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">มีตัวเลขต่อท้าย</span>
                                        <?php else: ?>
                                            <span class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">ผิดปกติ</span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="p-3 text-center">
                                        <form method="post" class="inline"
                                            onsubmit="return confirm('แก้ไข username เป็น <?php echo htmlspecialchars($user['expected_username']); ?> ใช่หรือไม่?');">
                                            <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                            <input type="hidden" name="fix_user_id" value="<?php echo $user['id']; ?>">
                                            <input type="hidden" name="expected_username"
                                                value="<?php echo htmlspecialchars($user['expected_username']); ?>">
                                            <button type="submit"
                                                class="bg-green-600 text-white text-xs font-bold py-1 px-3 rounded hover:bg-green-700 transition-colors">
                                                แก้ไข
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php else: ?>
            <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
                <div class="text-center py-8">
                    <svg class="mx-auto h-12 w-12 text-green-500 mb-4" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">ไม่พบ Username ที่มีปัญหา</h3>
                    <p class="text-gray-600">Username ทั้งหมดในระบบถูกต้องตามรูปแบบที่กำหนด</p>
                </div>
            </div>
        <?php endif; ?>

        <!-- Instructions -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 md:p-8">
            <h2 class="text-xl font-bold mb-4 text-yellow-800">💡 คำแนะนำ</h2>
            <ul class="space-y-2 text-sm text-yellow-700">
                <li><strong>Username ที่ถูกต้อง:</strong> ชื่ออังกฤษ (lowercase) + 2 ตัวอักษรแรกของนามสกุลอังกฤษ
                    (lowercase)</li>
                <li><strong>ตัวอย่าง:</strong> KANNIKA PANKAEW → kannikapa</li>
                <li><strong>กรณีซ้ำ:</strong> ระบบจะเพิ่มตัวเลขต่อท้ายอัตโนมัติ (kannikapa1, kannikapa2, ...)</li>
                <li><strong>การแก้ไข:</strong> หากพบ username ที่ไม่ถูกต้อง ให้ตรวจสอบชื่ออังกฤษในฐานข้อมูล และแก้ไขผ่าน
                    manage_officers.php</li>
            </ul>
        </div>
    </div>

</body>

</html>
<?php
$conn->close();
?>