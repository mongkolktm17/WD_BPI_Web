<?php
require_once 'config.php';

$tables = [
    'car_parking_reports',
    'cctv_inspections',
    'hand_held_checks',
    'patrol_reports',Microsoft Teams
    
    
    
    'security_guard_counts',
    'cctv_reports',
    'cctv_angle_reports',
    'metal_detector_checks'
];

foreach ($tables as $table) {
    echo "Processing table: $table...<br>";

    // Check and add soft delete columns
    $result = $conn->query("SHOW COLUMNS FROM `$table` LIKE 'is_deleted'");
    if ($result->num_rows == 0) {
        $sql = "ALTER TABLE `$table` 
                ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
                ADD COLUMN deleted_by VARCHAR(100) DEFAULT NULL,
                ADD COLUMN deleted_at DATETIME DEFAULT NULL";

        if ($conn->query($sql)) {
            echo "&nbsp;&nbsp;✓ Soft delete columns added successfully.<br>";
        } else {
            echo "&nbsp;&nbsp;✗ Error adding soft delete columns: " . $conn->error . "<br>";
        }
    } else {
        echo "&nbsp;&nbsp;✓ Soft delete columns already exist.<br>";
    }

    // Check and add updated_by column
    $result = $conn->query("SHOW COLUMNS FROM `$table` LIKE 'updated_by'");
    if ($result->num_rows == 0) {
        $sql = "ALTER TABLE `$table` 
                ADD COLUMN updated_by VARCHAR(100) DEFAULT NULL,
                ADD COLUMN updated_at DATETIME DEFAULT NULL";

        if ($conn->query($sql)) {
            echo "&nbsp;&nbsp;✓ Update tracking columns added successfully.<br>";
        } else {
            echo "&nbsp;&nbsp;✗ Error adding update tracking columns: " . $conn->error . "<br>";
        }
    } else {
        echo "&nbsp;&nbsp;✓ Update tracking columns already exist.<br>";
    }

    echo "<br>";
}

echo "<hr><strong>Migration completed!</strong>";
$conn->close();
?>