<?php
/**
 * manage_officers.php
 * 
 * Admin page for creating, viewing, and deleting officer accounts.
 */

// 1. Includes and Initial Setup
// This handles session, DB connection, and ensures only admins can access.
require_once "check_permissions.php";

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

// --- Function Definitions ---

/**
 * Fetches all roles from the database.
 * @param mysqli $conn The database connection.
 * @return array|null An array of roles or null on failure.
 */
function getRoles($conn) {
    $roles = [];
    $sql = "SELECT id, role_name FROM roles ORDER BY role_name";
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $roles[] = $row;
        }
        $stmt->close();
        return $roles;
    }
    return null; // Query failed
}

/**
 * Fetches all officers from the database.
 * @param mysqli $conn The database connection.
 * @return array|null An array of officers or null on failure.
 */
function getOfficers($conn) {
    $officers = [];
    $sql = "SELECT u.id, u.first_name, u.last_name, u.employee_id, u.phone_number, u.username, r.role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.user_type = 'officer' 
            ORDER BY u.first_name, u.last_name";
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $officers[] = $row;
        }
        $stmt->close();
        return $officers;
    }
    return null; // Query failed
}

/**
 * Adds a new officer to the database.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data from the form.
 * @return array An array with 'message' and 'error' keys.
 */
function addOfficer($conn, $data) {
    $first_name = trim($data['first_name']);
    $last_name = trim($data['last_name']);
    $employee_id = trim($data['employee_id']);
    $phone_number = trim($data['phone_number']);
    $username = trim($data['username']);
    $password = trim($data['password']);
    $role_id = trim($data['role_id']);

    if (empty($first_name) || empty($last_name) || empty($employee_id) || empty($phone_number) || empty($username) || empty($password) || empty($role_id)) {
        return ['message' => '', 'error' => 'กรุณากรอกข้อมูลให้ครบทุกช่อง'];
    }
    if (!preg_match("/^[0-9]{8}$/", $employee_id)) {
        return ['message' => '', 'error' => 'รหัสพนักงานต้องเป็นตัวเลข 8 หลัก'];
    }

    // Check for existing user
    $sql_check = "SELECT id FROM users WHERE employee_id = ? OR username = ?";
    $stmt_check = $conn->prepare($sql_check);
    $stmt_check->bind_param("ss", $employee_id, $username);
    $stmt_check->execute();
    if ($stmt_check->get_result()->num_rows > 0) {
        return ['message' => '', 'error' => 'รหัสพนักงานหรือชื่อผู้ใช้นี้มีอยู่แล้ว'];
    }
    $stmt_check->close();

    // Insert new user
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $sql_insert = "INSERT INTO users (first_name, last_name, employee_id, phone_number, username, password, user_type, role_id) VALUES (?, ?, ?, ?, ?, ?, 'officer', ?)";
    $stmt_insert = $conn->prepare($sql_insert);
    $stmt_insert->bind_param("ssssssi", $first_name, $last_name, $employee_id, $phone_number, $username, $hashed_password, $role_id);
    
    if ($stmt_insert->execute()) {
        return ['message' => 'เพิ่มเจ้าหน้าที่เรียบร้อยแล้ว', 'error' => ''];
    } else {
        return ['message' => '', 'error' => 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล: ' . $stmt_insert->error];
    }
}

/**
 * Removes an officer from the database.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data from the form.
 * @return array An array with 'message' and 'error' keys.
 */
function removeOfficer($conn, $data) {
    $officer_id = $data['officer_id'];
    $sql = "DELETE FROM users WHERE id = ? AND user_type = 'officer'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $officer_id);
    if ($stmt->execute()) {
        return ['message' => 'ลบเจ้าหน้าที่เรียบร้อยแล้ว', 'error' => ''];
    } else {
        return ['message' => '', 'error' => 'เกิดข้อผิดพลาดในการลบข้อมูล: ' . $stmt->error];
    }
}

// --- Main Logic ---

$message = "";
$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token. การดำเนินการถูกยกเลิกเพื่อความปลอดภัย";
    } else {
        if (isset($_POST['add_officer'])) {
            $result = addOfficer($conn, $_POST);
            $message = $result['message'];
            $error = $result['error'];
        } elseif (isset($_POST['remove_officer'])) {
            $result = removeOfficer($conn, $_POST);
            $message = $result['message'];
            $error = $result['error'];
        }
    }
}

// Fetch data for display
$roles = getRoles($conn);
$officers = getOfficers($conn);

if ($roles === null || $officers === null) {
    $error = "เกิดข้อผิดพลาดในการดึงข้อมูลจากฐานข้อมูล";
    $roles = $roles ?? [];
    $officers = $officers ?? [];
}

$conn->close();

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>จัดการเจ้าหน้าที่</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style> body { font-family: 'Sarabun', sans-serif; } </style>
</head>
<body class="bg-gray-100">

    <div class="container mx-auto p-4 sm:p-6 lg:p-8">
        <header class="mb-8">
            <div class="flex justify-between items-center">
                 <h1 class="text-3xl font-bold text-gray-800">จัดการเจ้าหน้าที่</h1>
                 <a href="report_page.php" class="text-sm bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">กลับ Dashboard</a>
            </div>
        </header>

        <?php if (!empty($message)): ?>
            <div class="mb-4 p-4 rounded-lg bg-green-100 text-green-700"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        <?php if (!empty($error)): ?>
            <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <!-- Add Officer Form -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">เพิ่มเจ้าหน้าที่ใหม่</h2>
            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                        <input type="text" name="first_name" id="first_name" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                    </div>
                    <div>
                        <label for="last_name" class="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                        <input type="text" name="last_name" id="last_name" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                    </div>
                    <div>
                        <label for="employee_id" class="block text-sm font-medium text-gray-700 mb-1">รหัสพนักงาน (8 หลัก)</label>
                        <input type="text" name="employee_id" id="employee_id" pattern="[0-9]{8}" title="รหัสพนักงานต้องเป็นตัวเลข 8 หลัก" maxlength="8" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                    </div>
                    <div>
                        <label for="phone_number" class="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                        <input type="tel" name="phone_number" id="phone_number" pattern="[0-9]{10}" maxlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '');" title="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                    </div>
                     <div>
                        <label for="username" class="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้</label>
                        <input type="text" name="username" id="username" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                        <input type="password" name="password" id="password" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                    </div>
                    <div>
                        <label for="role_id" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select name="role_id" id="role_id" class="form-select w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                            <option value="">เลือก Role</option>
                            <?php foreach ($roles as $role): ?>
                                <option value="<?php echo $role['id']; ?>"><?php echo htmlspecialchars($role['role_name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                <div class="mt-8">
                    <button type="submit" name="add_officer" class="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700">เพิ่มเจ้าหน้าที่</button>
                </div>
            </form>
        </div>

        <!-- Officers List -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">รายชื่อเจ้าหน้าที่</h2>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ - นามสกุล</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสพนักงาน</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ใช้</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ตำแหน่ง</th>
                            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <?php
                        if (empty($officers)) {
                            echo '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูลเจ้าหน้าที่</td></tr>';
                        } else {
                            foreach ($officers as $officer) {
                                echo '<tr>' .
                                     '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">' . htmlspecialchars($officer['first_name'] . ' ' . $officer['last_name']) . '</td>' .
                                     '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' . htmlspecialchars($officer['employee_id']) . '</td>' .
                                     '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' . htmlspecialchars($officer['username']) . '</td>' .
                                     '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' . htmlspecialchars($officer['role_name'] ?? 'N/A') . '</td>' .
                                     '<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">' .
                                     '<a href="edit_officer.php?id=' . $officer['id'] . '" class="text-blue-600 hover:text-blue-900 mr-4">แก้ไข</a>' .
                                     '<form action="' . htmlspecialchars($_SERVER["PHP_SELF"]) . '" method="post" onsubmit="return confirm(\'คุณแน่ใจหรือไม่ว่าต้องการลบเจ้าหน้าที่คนนี้?\');" style="display: inline;">' .
                                     '<input type="hidden" name="officer_id" value="' . $officer['id'] . '">' .
                                     '<input type="hidden" name="csrf_token" value="' . $csrf_token . '">' .
                                     '<button type="submit" name="remove_officer" class="text-red-600 hover:text-red-900">ลบ</button>' .
                                     '</form>' .
                                     '</td>' .
                                     '</tr>';
                            }
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

</body>
</html>