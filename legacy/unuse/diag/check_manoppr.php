<?php
require_once 'config.php';

// Check user manoppr
$username = 'manoppr';
$sql = "SELECT u.id, u.username, u.user_type, u.role_id, u.first_name, u.last_name, u.employee_id, r.role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

echo "<h2>User Information: $username</h2>\n";
echo "<pre>\n";

if ($row = $result->fetch_assoc()) {
    echo "ID: " . $row['id'] . "\n";
    echo "Username: " . $row['username'] . "\n";
    echo "User Type: " . $row['user_type'] . "\n";
    echo "Role ID: " . $row['role_id'] . "\n";
    echo "Role Name: " . $row['role_name'] . "\n";
    echo "First Name: " . $row['first_name'] . "\n";
    echo "Last Name: " . $row['last_name'] . "\n";
    echo "Employee ID: " . $row['employee_id'] . "\n";
} else {
    echo "User not found!";
}

echo "</pre>\n";

// Also check all roles
echo "<h2>All Roles in Database</h2>\n";
echo "<pre>\n";
$roles_sql = "SELECT * FROM roles ORDER BY id";
$roles_result = $conn->query($roles_sql);
while ($role = $roles_result->fetch_assoc()) {
    echo "ID: {$role['id']} - {$role['role_name']}\n";
}
echo "</pre>\n";

$stmt->close();
$conn->close();
?>