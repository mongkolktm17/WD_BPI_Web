<?php
require_once 'config.php';

// Query to get user with employee_id 50014427
$sql = "SELECT id, username, user_type, role_id, first_name, last_name, eng_first_name, eng_last_name, employee_id FROM users WHERE employee_id = '50014427'";
$result = $conn->query($sql);

echo "<h2>User with employee_id '50014427':</h2>";
echo "<pre>";

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "ID: " . $row['id'] . "\n";
        echo "Username: " . $row['username'] . "\n";
        echo "User Type: " . $row['user_type'] . "\n";
        echo "Role ID: " . $row['role_id'] . "\n";
        echo "First Name (TH): " . $row['first_name'] . "\n";
        echo "Last Name (TH): " . $row['last_name'] . "\n";
        echo "First Name (EN): " . $row['eng_first_name'] . "\n";
        echo "Last Name (EN): " . $row['eng_last_name'] . "\n";
        echo "Employee ID: " . $row['employee_id'] . "\n";
        echo "-------------------\n";

        // Show what the username SHOULD be based on the algorithm
        $eng_first = strtolower($row['eng_first_name']);
        $eng_last_2char = strtolower(substr($row['eng_last_name'], 0, 2));
        $expected_username = $eng_first . $eng_last_2char;

        echo "\n";
        echo "Expected username based on algorithm: " . $expected_username . "\n";
        echo "Actual username in database: " . $row['username'] . "\n";
        echo "Match: " . ($expected_username === $row['username'] ? "YES ✓" : "NO ✗") . "\n";
    }
} else {
    echo "No user found with employee_id '50014427'\n";
}

echo "</pre>";
$conn->close();
?>