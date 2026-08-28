<?php
require_once "config.php";

$sql = "UPDATE `parking_lot_counts` SET `lot_name` = 'ลานรถยนต์ B.9 (44 Slot)' WHERE `lot_name` = 'ลานรถยนต์ B.8 (44 Slot)'";

if ($conn->query($sql) === TRUE) {
    echo "Database updated successfully. Rows affected: " . $conn->affected_rows;
} else {
    echo "Error updating database: " . $conn->error;
}

$conn->close();
?>