<?php
header('Content-Type: text/html; charset=utf-8');

require_once 'config.php';

echo "<h1>Admin Password Reset</h1>";

// The password to set for the admin user
$new_password = 'admin123';

// Hash the new password
$hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

if ($hashed_password === false) {
    die("Error: Failed to hash the password. Please check your PHP installation.");
}

echo "<p>Plain password: " . htmlspecialchars($new_password) . "</p>";
echo "<p>Generated Hash: " . htmlspecialchars($hashed_password) . "</p>";

// SQL to update the admin's password
$sql = "UPDATE users SET password = ? WHERE username = 'admin'";

if ($stmt = $conn->prepare($sql)) {
    $stmt->bind_param("s", $hashed_password);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo "<p style='color:green; font-weight:bold;'>Admin password has been successfully reset.</p>";
        } else {
            echo "<p style='color:orange; font-weight:bold;'>Could not find an 'admin' user to update. Please run setup_database.php first.</p>";
        }
    } else {
        echo "<p style='color:red; font-weight:bold;'>Error executing the update: " . htmlspecialchars($stmt->error) . "</p>";
    }

    $stmt->close();
} else {
    echo "<p style='color:red; font-weight:bold;'>Error preparing the SQL statement: " . htmlspecialchars($conn->error) . "</p>";
}

$conn->close();

echo "<br><p>You can now try to <a href='login.php'>log in</a> again with username 'admin' and password 'admin123'.</p>";

?>
