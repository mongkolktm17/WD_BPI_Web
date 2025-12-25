<?php
/**
 * edit_officer.php
 * 
 * Admin page for editing an existing officer's account details.
 */

// 1. Includes and Initial Setup
require_once "check_permissions.php";
require_once "config.php";

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

// --- Function Definitions ---

/**
 * Fetches all roles from the database.
 * @param mysqli $conn The database connection.
 * @return array
 */
function getRoles($conn) {
    $roles = [];
    $sql = "SELECT id, role_name FROM roles ORDER BY role_name";
    $result = $conn->query($sql);
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $roles[] = $row;
        }
    }
    return $roles;
}

/**
 * Fetches a specific officer's details.
 * @param mysqli $conn
 * @param int $officer_id
 * @return array|null
 */
function getOfficerDetails($conn, $officer_id) {
    $sql = "SELECT id, first_name, last_name, employee_id, phone_number, username, role_id FROM users WHERE id = ? AND user_type = 'officer'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $officer_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 1) {
        return $result->fetch_assoc();
    }
    return null;
}

/**
 * Updates an officer's details.
 * @param mysqli $conn
 * @param array $data
 * @return array
 */
function updateOfficer($conn, $data) {
    // Validation
    $required_fields = ['first_name', 'last_name', 'employee_id', 'phone_number', 'username', 'role_id', 'officer_id'];
    foreach ($required_fields as $field) {
        if (empty(trim($data[$field]))) {
            return ['error' => 'กรุณากรอกข้อมูลให้ครบทุกช่อง'];
        }
    }

    $officer_id = $data['officer_id'];
    $first_name = trim($data['first_name']);
    $last_name = trim($data['last_name']);
    $employee_id = trim($data['employee_id']);
    $phone_number = trim($data['phone_number']);
    $username = trim($data['username']);
    $role_id = $data['role_id'];
    $password = trim($data['password']);

    // Check for uniqueness of employee_id and username (excluding the current officer)
    $sql_check = "SELECT id FROM users WHERE (employee_id = ? OR username = ?) AND id != ?";
    $stmt_check = $conn->prepare($sql_check);
    $stmt_check->bind_param("ssi", $employee_id, $username, $officer_id);
    $stmt_check->execute();
    if ($stmt_check->get_result()->num_rows > 0) {
        return ['error' => 'รหัสพนักงานหรือชื่อผู้ใช้นี้มีอยู่แล้ว'];
    }
    $stmt_check->close();

    // Build the update query
    $params = [];
    $types = "";
    $sql = "UPDATE users SET first_name = ?, last_name = ?, employee_id = ?, phone_number = ?, username = ?, role_id = ?";
    $params = [$first_name, $last_name, $employee_id, $phone_number, $username, $role_id];
    $types = "sssssi";

    // Conditionally add password to the update
    if (!empty($password)) {
        $sql .= ", password = ?";
        $params[] = password_hash($password, PASSWORD_DEFAULT);
        $types .= "s";
    }

    $sql .= " WHERE id = ?";
    $params[] = $officer_id;
    $types .= "i";

    $stmt_update = $conn->prepare($sql);
    $stmt_update->bind_param($types, ...$params);

    if ($stmt_update->execute()) {
        $_SESSION['flash_message'] = "แก้ไขข้อมูลเจ้าหน้าที่เรียบร้อยแล้ว";
        header("location: manage_officers.php");
        exit();
    } else {
        return ['error' => 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ' . $stmt_update->error];
    }
}


// --- Main Logic ---

$error = "";
$officer_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($officer_id <= 0) {
    header("location: manage_officers.php");
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token.";
    } else {
        if (isset($_POST['update_officer']) && $_POST['officer_id'] == $officer_id) {
            $result = updateOfficer($conn, $_POST);
            $error = $result['error'] ?? '';
        }
    }
}

$officer = getOfficerDetails($conn, $officer_id);
if ($officer === null) {
    $_SESSION['flash_error'] = "ไม่พบเจ้าหน้าที่ที่ต้องการแก้ไข";
    header("location: manage_officers.php");
    exit;
}

$roles = getRoles($conn);
$conn->close();

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แก้ไขข้อมูลเจ้าหน้าที่</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style> body { font-family: 'Sarabun', sans-serif; } </style>
</head>
<body class="bg-gray-100">

    <div class="container mx-auto p-4 sm:p-6 lg:p-8">
        <header class="mb-8">
            <div class="flex justify-between items-center">
                 <h1 class="text-3xl font-bold text-gray-800">แก้ไขข้อมูล: <?php echo htmlspecialchars($officer['first_name'] . ' ' . $officer['last_name']); ?></h1>
                 <a href="manage_officers.php" class="text-sm bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">กลับไปหน้ารายการ</a>
            </div>
        </header>

        <?php if (!empty($error)):
            ?>
            <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error); ?></div>
        <?php endif;
        ?>

        <!-- Edit Officer Form -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>?id=<?php echo $officer_id; ?>" method="post">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                <input type="hidden" name="officer_id" value="<?php echo $officer_id; ?>">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                        <input type="text" name="first_name" id="first_name" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($officer['first_name']); ?>" required>
                    </div>
                    <div>
                        <label for="last_name" class="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                        <input type="text" name="last_name" id="last_name" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($officer['last_name']); ?>" required>
                    </div>
                    <div>
                        <label for="employee_id" class="block text-sm font-medium text-gray-700 mb-1">รหัสพนักงาน (8 หลัก)</label>
                        <input type="text" name="employee_id" id="employee_id" pattern="[0-9]{8}" title="รหัสพนักงานต้องเป็นตัวเลข 8 หลัก" maxlength="8" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($officer['employee_id']); ?>" required>
                    </div>
                    <div>
                        <label for="phone_number" class="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                        <input type="text" name="phone_number" id="phone_number" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($officer['phone_number']); ?>" required>
                    </div>
                     <div>
                        <label for="username" class="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้</label>
                        <input type="text" name="username" id="username" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($officer['username']); ?>" required>
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</label>
                        <input type="password" name="password" id="password" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label for="role_id" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select name="role_id" id="role_id" class="form-select w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                            <option value="">เลือก Role</option>
                            <?php foreach ($roles as $role):
                                $isSelected = $role['id'] == $officer['role_id'];
                            ?>
                                <option value="<?php echo $role['id']; ?>" <?php echo $isSelected ? 'selected' : ''; ?>><?php echo htmlspecialchars($role['role_name']); ?></option>
                            <?php endforeach;
                            ?>
                        </select>
                    </div>
                </div>

                <div class="mt-8">
                    <button type="submit" name="update_officer" class="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700">บันทึกการเปลี่ยนแปลง</button>
                </div>
            </form>
        </div>
    </div>

</body>
</html>