<?php
/**
 * manage_roles.php
 * 
 * Admin page for creating, viewing, and deleting user roles and their permissions.
 */

// 1. Includes and Initial Setup
require_once "check_permissions.php"; // Ensures only admins can access

// --- CSRF Protection ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

// --- Function Definitions ---

/**
 * Gets a list of all available pages for setting permissions.
 * @return array A list of PHP filenames.
 */
function getAvailablePages() {
    $all_pages = glob("*.php");
    $excluded_pages = [
        // Core/Auth
        'login.php', 'logout.php', 'config.php', 'check_permissions.php',
        // Setup Scripts
        'setup.php', 'reset.php',
        // Admin/Management
        'manage_roles.php', 'manage_officers.php',
        // Debugging
        'debug.py', 'debug_officers.php', 'debug_reports.php', 'debug_roles.php', 'converter.py'
    ];
    return array_diff($all_pages, $excluded_pages);
}

/**
 * Fetches all roles and their associated permissions.
 * @param mysqli $conn The database connection.
 * @return array|null An array of roles or null on failure.
 */
function getRolesWithPermissions($conn) {
    $roles = [];
    $sql = "SELECT r.id, r.role_name, GROUP_CONCAT(rp.page_name SEPARATOR ', ') as permissions 
            FROM roles r 
            LEFT JOIN role_permissions rp ON r.id = rp.role_id 
            GROUP BY r.id";
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
    return null;
}

/**
 * Adds a new role and its permissions in a transaction.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data.
 * @return array A result array with 'message' and 'error' keys.
 */
function addRoleWithPermissions($conn, $data) {
    $role_name = trim($data['role_name']);
    $permissions = isset($data['permissions']) ? $data['permissions'] : [];

    if (empty($role_name)) {
        return ['message' => '', 'error' => 'กรุณากรอกชื่อ Role'];
    }

    $conn->begin_transaction();
    try {
        // Check if role name already exists
        $sql_check = "SELECT id FROM roles WHERE role_name = ?";
        $stmt_check = $conn->prepare($sql_check);
        $stmt_check->bind_param("s", $role_name);
        $stmt_check->execute();
        if ($stmt_check->get_result()->num_rows > 0) {
            throw new Exception("Role นี้มีอยู่แล้ว");
        }
        $stmt_check->close();

        // Insert new role
        $sql_insert_role = "INSERT INTO roles (role_name) VALUES (?)";
        $stmt_insert_role = $conn->prepare($sql_insert_role);
        $stmt_insert_role->bind_param("s", $role_name);
        $stmt_insert_role->execute();
        $role_id = $stmt_insert_role->insert_id;
        $stmt_insert_role->close();

        // Insert permissions
        if (!empty($permissions)) {
            $sql_insert_perm = "INSERT INTO role_permissions (role_id, page_name) VALUES (?, ?)";
            $stmt_insert_perm = $conn->prepare($sql_insert_perm);
            foreach ($permissions as $page) {
                $stmt_insert_perm->bind_param("is", $role_id, $page);
                $stmt_insert_perm->execute();
            }
            $stmt_insert_perm->close();
        }

        $conn->commit();
        return ['message' => 'เพิ่ม Role เรียบร้อยแล้ว', 'error' => ''];

    } catch (Exception $e) {
        $conn->rollback();
        return ['message' => '', 'error' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()];
    }
}

/**
 * Removes a role from the database.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data.
 * @return array A result array with 'message' and 'error' keys.
 */
function removeRole($conn, $data) {
    $role_id = $data['role_id'];
    // Deleting a role will also delete related permissions due to ON DELETE CASCADE.
    $sql = "DELETE FROM roles WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $role_id);
    if ($stmt->execute()) {
        return ['message' => 'ลบ Role เรียบร้อยแล้ว', 'error' => ''];
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
        if (isset($_POST['add_role'])) {
            $result = addRoleWithPermissions($conn, $_POST);
            $message = $result['message'];
            $error = $result['error'];
        } elseif (isset($_POST['remove_role'])) {
            $result = removeRole($conn, $_POST);
            $message = $result['message'];
            $error = $result['error'];
        }
    }
}

// Fetch data for display
$roles = getRolesWithPermissions($conn);
$available_pages = getAvailablePages();

if ($roles === null) {
    $error = "เกิดข้อผิดพลาดในการดึงข้อมูล Roles";
    $roles = [];
}

$conn->close();

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>จัดการ Role</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style> body { font-family: 'Sarabun', sans-serif; } </style>
</head>
<body class="bg-gray-100">

    <div class="container mx-auto p-4 sm:p-6 lg:p-8">
        <header class="mb-8">
            <div class="flex justify-between items-center">
                 <h1 class="text-3xl font-bold text-gray-800">จัดการ Role</h1>
                 <a href="report_page.php" class="text-sm bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">กลับ Dashboard</a>
            </div>
        </header>

        <?php if (!empty($message)): ?>
            <div class="mb-4 p-4 rounded-lg bg-green-100 text-green-700"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        <?php if (!empty($error)): ?>
            <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <!-- Add Role Form -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">เพิ่ม Role ใหม่</h2>
            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                <div class="mb-4">
                    <label for="role_name" class="block text-sm font-medium text-gray-700 mb-1">ชื่อ Role</label>
                    <input type="text" name="role_name" id="role_name" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" required>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">สิทธิ์การเข้าถึง</label>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <?php foreach ($available_pages as $page): ?>
                            <div>
                                <input type="checkbox" name="permissions[]" value="<?php echo $page; ?>" id="<?php echo $page; ?>" class="form-checkbox h-5 w-5 text-blue-600">
                                <label for="<?php echo $page; ?>" class="ml-2 text-sm text-gray-700"><?php echo $page; ?></label>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <div class="mt-8">
                    <button type="submit" name="add_role" class="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700">เพิ่ม Role</button>
                </div>
            </form>
        </div>

        <!-- Roles List -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">รายการ Role</h2>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ Role</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สิทธิ์การเข้าถึง</th>
                            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <?php
                        if (empty($roles)) {
                            echo '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูล Role</td></tr>';
                        } else {
                            foreach ($roles as $role) {
                                echo '<tr>' .
                                     '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">' . htmlspecialchars($role['role_name']) . '</td>' .
                                     '<td class="px-6 py-4 text-sm text-gray-500">' . htmlspecialchars($role['permissions'] ?? 'N/A') . '</td>' .
                                     '<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">' .
                                     '<a href="edit_role.php?id=' . $role['id'] . '" class="text-blue-600 hover:text-blue-900 mr-4">แก้ไข</a>' .
                                     '<form action="' . htmlspecialchars($_SERVER["PHP_SELF"]) . '" method="post" onsubmit="return confirm(\'คุณแน่ใจหรือไม่ว่าต้องการลบ Role นี้? การลบ Role จะทำให้ผู้ใช้ที่อยู่ใน Role นี้ไม่มีตำแหน่ง\');" style="display: inline;">' .
                                     '<input type="hidden" name="role_id" value="' . $role['id'] . '">' .
                                     '<input type="hidden" name="csrf_token" value="' . $csrf_token . '">' .
                                     '<button type="submit" name="remove_role" class="text-red-600 hover:text-red-900">ลบ</button>' .
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