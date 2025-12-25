<?php
require_once 'config.php';

$queries = [
    "UPDATE cctv_devices SET building = 'B2' WHERE building = 'B.2'",
    "UPDATE cctv_devices SET building = 'B3' WHERE building = 'B.3'",
    "UPDATE cctv_devices SET building = 'B4' WHERE building = 'B.4'",
    "UPDATE cctv_devices SET building = 'B9' WHERE building = 'B.8'",

    "UPDATE cctv_reports SET building = 'B2' WHERE building = 'B.2'",
    "UPDATE cctv_reports SET building = 'B3' WHERE building = 'B.3'",
    "UPDATE cctv_reports SET building = 'B4' WHERE building = 'B.4'",
    "UPDATE cctv_reports SET building = 'B9' WHERE building = 'B.8'",

    "UPDATE cctv_camera_names SET building = 'B2' WHERE building = 'B.2'",
    "UPDATE cctv_camera_names SET building = 'B3' WHERE building = 'B.3'",
    "UPDATE cctv_camera_names SET building = 'B4' WHERE building = 'B.4'",
    "UPDATE cctv_camera_names SET building = 'B9' WHERE building = 'B.8'"
];

echo "Starting migration...\n";

foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "Successfully executed: $sql (Affected rows: " . $conn->affected_rows . ")\n";
    } else {
        echo "Error executing: $sql - " . $conn->error . "\n";
    }
}

echo "Migration completed.\n";
$conn->close();
?>