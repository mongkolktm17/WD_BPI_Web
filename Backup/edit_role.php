<?php
/**
 * edit_role.php
 * 
 * Admin page for editing an existing user role and its permissions.
 */

// 1. Includes and Initial Setup
require_once "check_permissions.php"; // Ensures only admins can access
require_once "config.php"; // Database connection and session start

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
        'login.php', 'logout.php', 'config.php', 'check_permissions.php',
        'setup.php', 'reset.php',
        'manage_roles.php', 'manage_officers.php', 'edit_role.php', 'edit_officer.php',
        'debug.py', 'debug_officers.php', 'debug_reports.php', 'debug_roles.php', 'converter.py'
    ];
    return array_diff($all_pages, $excluded_pages);
}

/**
 * Fetches a specific role and its permissions.
 * @param mysqli $conn The database connection.
 * @param int $role_id The ID of the role to fetch.
 * @return array|null An array with role details or null if not found.
 */
function getRoleDetails($conn, $role_id) {
    $role = [];
    // Fetch role name
    $sql_role = "SELECT id, role_name FROM roles WHERE id = ?";
    $stmt_role = $conn->prepare($sql_role);
    $stmt_role->bind_param("i", $role_id);
    $stmt_role->execute();
    $result_role = $stmt_role->get_result();
    if ($result_role->num_rows !== 1) {
        return null;
    }
    $role = $result_role->fetch_assoc();
    $stmt_role->close();

    // Fetch permissions
    $role['permissions'] = [];
    $sql_perms = "SELECT page_name FROM role_permissions WHERE role_id = ?";
    $stmt_perms = $conn->prepare($sql_perms);
    $stmt_perms->bind_param("i", $role_id);
    $stmt_perms->execute();
    $result_perms = $stmt_perms->get_result();
    while ($row = $result_perms->fetch_assoc()) {
        $role['permissions'][] = $row['page_name'];
    }
    $stmt_perms->close();
    
    return $role;
}

/**
 * Updates a role and its permissions in a transaction.
 * @param mysqli $conn The database connection.
 * @param array $data The POST data.
 * @return array A result array with 'message' and 'error' keys.
 */
function updateRoleWithPermissions($conn, $data) {
    $role_id = $data['role_id'];
    $role_name = trim($data['role_name']);
    $permissions = isset($data['permissions']) ? $data['permissions'] : [];

    if (empty($role_name)) {
        return ['message' => '', 'error' => 'กรุณากรอกชื่อ Role'];
    }

    $conn->begin_transaction();
    try {
        // Check if new role name already exists for a DIFFERENT role
        $sql_check = "SELECT id FROM roles WHERE role_name = ? AND id != ?";
        $stmt_check = $conn->prepare($sql_check);
        $stmt_check->bind_param("si", $role_name, $role_id);
        $stmt_check->execute();
        if ($stmt_check->get_result()->num_rows > 0) {
            throw new Exception("Role นี้มีอยู่แล้ว");
        }
        $stmt_check->close();

        // Update role name
        $sql_update_role = "UPDATE roles SET role_name = ? WHERE id = ?";
        $stmt_update_role = $conn->prepare($sql_update_role);
        $stmt_update_role->bind_param("si", $role_name, $role_id);
        $stmt_update_role->execute();
        $stmt_update_role->close();

        // Delete old permissions
        $sql_delete_perms = "DELETE FROM role_permissions WHERE role_id = ?";
        $stmt_delete_perms = $conn->prepare($sql_delete_perms);
        $stmt_delete_perms->bind_param("i", $role_id);
        $stmt_delete_perms->execute();
        $stmt_delete_perms->close();

        // Insert new permissions
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
        // Redirect on success to avoid form re-submission
        $_SESSION['flash_message'] = "แก้ไข Role เรียบร้อยแล้ว";
        header("location: manage_roles.php");
        exit();

    } catch (Exception $e) {
        $conn->rollback();
        return ['message' => '', 'error' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()];
    }
}

// --- Main Logic ---

$message = "";
$error = "";
$role_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($role_id <= 0) {
    header("location: manage_roles.php");
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = "Invalid CSRF token. การดำเนินการถูกยกเลิกเพื่อความปลอดภัย";
    } else {
        // Ensure the submitted role_id matches the one in the URL
        if (isset($_POST['update_role']) && $_POST['role_id'] == $role_id) {
            $result = updateRoleWithPermissions($conn, $_POST);
            // Error will be set if the update function fails and returns it
            $error = $result['error'] ?? '';
        }
    }
}

// Fetch current role data for the form
$role = getRoleDetails($conn, $role_id);
if ($role === null) {
    $_SESSION['flash_error'] = "ไม่พบ Role ที่ต้องการแก้ไข";
    header("location: manage_roles.php");
    exit;
}

$available_pages = getAvailablePages();
$conn->close();

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แก้ไข Role</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style> body { font-family: 'Sarabun', sans-serif; } </style>
</head>
<body class="bg-gray-100">

    <div class="container mx-auto p-4 sm:p-6 lg:p-8">
        <header class="mb-8">
            <div class="flex justify-between items-center">
                 <h1 class="text-3xl font-bold text-gray-800">แก้ไข Role: <?php echo htmlspecialchars($role['role_name']); ?></h1>
                 <a href="manage_roles.php" class="text-sm bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">กลับไปหน้ารายการ</a>
            </div>
        </header>

        <?php if (!empty($error)):
            ?>
            <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error); ?></div>
        <?php endif;
        ?>

        <!-- Edit Role Form -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>?id=<?php echo $role_id; ?>" method="post">
                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                <input type="hidden" name="role_id" value="<?php echo $role_id; ?>">
                
                <div class="mb-4">
                    <label for="role_name" class="block text-sm font-medium text-gray-700 mb-1">ชื่อ Role</label>
                    <input type="text" name="role_name" id="role_name" class="form-input w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($role['role_name']); ?>" required>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">สิทธิ์การเข้าถึง</label>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <?php foreach ($available_pages as $page):
                            $isChecked = in_array($page, $role['permissions']);
                        ?>
                            <div>
                                <input type="checkbox" name="permissions[]" value="<?php echo $page; ?>" id="<?php echo $page; ?>" class="form-checkbox h-5 w-5 text-blue-600" <?php echo $isChecked ? 'checked' : ''; ?>>
                                <label for="<?php echo $page; ?>" class="ml-2 text-sm text-gray-700"><?php echo $page; ?></label>
                            </div>
                        <?php endforeach;
                        ?>
                    </div>
                </div>
                
                <div class="mt-8">
                    <button type="submit" name="update_role" class="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700">บันทึกการเปลี่ยนแปลง</button>
                </div>
            </form>
        </div>
    </div>

</body>
</html>