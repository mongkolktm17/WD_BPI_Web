<?php
require_once 'config.php';

$table_name = $argv[1];

$sql = "DESCRIBE " . $table_name;
$result = $conn->query($sql);

if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo implode("\t", $row) . "\n";
    }
} else {
    echo "Error: " . $conn->error . "\n";
}

$conn->close();
?>