<?php
require_once 'config.php';

header('Content-Type: text/plain');

echo "--- CCTV Devices (Distinct Buildings) ---\n";
$res = $conn->query("SELECT DISTINCT building FROM cctv_devices");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        echo $row['building'] . "\n";
    }
} else {
    echo "Error: " . $conn->error . "\n";
}

echo "\n--- CCTV Reports (Latest 5) ---\n";
$res = $conn->query("SELECT id, building, report_time FROM cctv_reports ORDER BY report_time DESC LIMIT 5");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        echo "ID: " . $row['id'] . ", Building: '" . $row['building'] . "', Time: " . $row['report_time'] . "\n";
    }
} else {
    echo "Error: " . $conn->error . "\n";
}

echo "\n--- CCTV Report Details (Count) ---\n";
$res = $conn->query("SELECT COUNT(*) as count FROM cctv_report_details");
$row = $res->fetch_assoc();
echo "Total details rows: " . $row['count'] . "\n";

echo "\n--- Debugging get_camera_status.php query logic ---\n";
$latest_report_ids_sql = "SELECT building, MAX(report_time) as latest_created_at FROM cctv_reports GROUP BY building";
$res = $conn->query($latest_report_ids_sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        echo "Grouped Building: '" . $row['building'] . "', Max Time: " . $row['latest_created_at'] . "\n";
    }
}
?>