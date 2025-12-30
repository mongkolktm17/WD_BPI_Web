<?php
require_once 'db_connect.php';

$table = 'security_guard_counts';
$sql = "SHOW COLUMNS FROM $table";
$result = $conn->query($sql);

if ($result) {
    echo "Columns in '$table':\n";
    while ($row = $result->fetch_assoc()) {
        echo $row['Field'] . "\n";
    }
} else {
    echo "Error: " . $conn->error;
}
$conn->close();
?>