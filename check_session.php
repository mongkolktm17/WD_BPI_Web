<?php
session_start();

echo "<h2>Current Session Data</h2>\n";
echo "<pre>\n";
echo "Session ID: " . session_id() . "\n\n";

if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
    echo "Logged in: Yes\n";
    echo "User ID: " . ($_SESSION['id'] ?? 'N/A') . "\n";
    echo "Username: " . ($_SESSION['username'] ?? 'N/A') . "\n";
    echo "User Type: " . ($_SESSION['user_type'] ?? 'N/A') . "\n";
    echo "Role ID: " . ($_SESSION['role_id'] ?? 'N/A') . "\n";
    echo "First Name: " . ($_SESSION['first_name'] ?? 'N/A') . "\n";
    echo "Last Name: " . ($_SESSION['last_name'] ?? 'N/A') . "\n";
    echo "Employee ID: " . ($_SESSION['employee_id'] ?? 'N/A') . "\n";
    echo "\nPermissions: ";
    print_r($_SESSION['permissions'] ?? 'N/A');
} else {
    echo "Not logged in\n";
}

echo "</pre>\n";

echo "<h3>Actions</h3>\n";
echo "<a href='logout.php' style='background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;'>Logout</a> ";
echo "<a href='dashboard.php' style='background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-left: 10px;'>Go to Dashboard</a>";
echo "<br><br>";
echo "<p><strong>คำแนะนำ:</strong> ถ้ายังแสดงผลเป็น Admin อยู่ ให้กด Logout แล้ว Login ใหม่อีกครั้ง</p>";
?>