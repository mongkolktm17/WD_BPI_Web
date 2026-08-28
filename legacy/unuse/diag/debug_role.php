<?php
require_once 'config.php';

// Check if the user is logged in
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    echo "Please login first!<br>";
    echo "<a href='login.php'>Go to Login</a>";
    exit;
}

echo "<h2>Debug: User Role Display</h2>\n";

// Get current user's role name for display (same logic as dashboard.php)
$current_user_role_name = 'เจ้าหน้าที่';
if (isset($_SESSION['user_type']) && $_SESSION['user_type'] === 'admin') {
    $current_user_role_name = 'ผู้ดูแลระบบ';
} elseif (isset($_SESSION['role_id'])) {
    $stmt = $conn->prepare('SELECT role_name FROM roles WHERE id = ?');
    $stmt->bind_param('i', $_SESSION['role_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $current_user_role_name = $row['role_name'];
    }
    $stmt->close();
}

echo "<h3>Session Data:</h3>\n";
echo "<pre>\n";
echo "Username: " . ($_SESSION['username'] ?? 'N/A') . "\n";
echo "User Type: " . ($_SESSION['user_type'] ?? 'N/A') . "\n";
echo "Role ID: " . ($_SESSION['role_id'] ?? 'N/A') . "\n";
echo "First Name: " . ($_SESSION['first_name'] ?? 'N/A') . "\n";
echo "Last Name: " . ($_SESSION['last_name'] ?? 'N/A') . "\n";
echo "</pre>\n";

echo "<h3>Calculated Values (What should appear in dashboard):</h3>\n";
echo "<pre>\n";
$display_name = isset($_SESSION['first_name']) && isset($_SESSION['last_name'])
    ? htmlspecialchars($_SESSION['first_name'] . ' ' . $_SESSION['last_name'])
    : htmlspecialchars($_SESSION['username']);
echo "Display Name: " . $display_name . "\n";
echo "Display Role: " . htmlspecialchars($current_user_role_name) . "\n";
echo "</pre>\n";

echo "<h3>JavaScript Config (as it would be generated):</h3>\n";
echo "<pre>\n";
echo "const defaultConfig = {\n";
echo "    user_name: \"" . $display_name . "\",\n";
echo "    user_role: \"" . htmlspecialchars($current_user_role_name) . "\"\n";
echo "};\n";
echo "</pre>\n";

echo "<h3>HTML Source Check:</h3>\n";
echo "<p>Open dashboard.php and view page source (Ctrl+U), then search for 'user_role' to see what value is actually being set.</p>\n";

echo "<hr>\n";
echo "<a href='dashboard.php' style='background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Go to Dashboard</a> ";
echo "<a href='logout.php' style='background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-left: 10px;'>Logout</a>";

$conn->close();
?>