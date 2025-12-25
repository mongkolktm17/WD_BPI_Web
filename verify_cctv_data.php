<?php
require_once 'config.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== CCTV Database Verification ===\n\n";

// Check cctv_devices table
echo "1. CCTV Devices Configuration:\n";
echo str_repeat("-", 50) . "\n";
$result = $conn->query("SELECT building, nvr_name, channels FROM cctv_devices ORDER BY building, nvr_name");
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "Building: {$row['building']}, NVR: {$row['nvr_name']}, Channels: {$row['channels']}\n";
    }
} else {
    echo "No devices configured or error: " . $conn->error . "\n";
}

// Check cctv_reports table
echo "\n2. CCTV Reports (Latest 10):\n";
echo str_repeat("-", 50) . "\n";
$result = $conn->query("SELECT id, building, total_channels, online_channels, offline_channels, online_percentage, report_time, submitted_by_id FROM cctv_reports ORDER BY report_time DESC LIMIT 10");
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "ID: {$row['id']}, Building: '{$row['building']}', Online: {$row['online_channels']}/{$row['total_channels']} ({$row['online_percentage']}%), Time: {$row['report_time']}\n";
    }
} else {
    echo "No reports found or error: " . $conn->error . "\n";
}

// Check cctv_report_details table
echo "\n3. CCTV Report Details Count:\n";
echo str_repeat("-", 50) . "\n";
$result = $conn->query("SELECT COUNT(*) as count FROM cctv_report_details");
$row = $result->fetch_assoc();
echo "Total detail records: {$row['count']}\n";

// Test get_camera_status.php logic
echo "\n4. Testing get_camera_status.php Query:\n";
echo str_repeat("-", 50) . "\n";
$result = $conn->query("SELECT building, MAX(report_time) as latest_time FROM cctv_reports GROUP BY building");
if ($result && $result->num_rows > 0) {
    echo "Latest reports by building:\n";
    while ($row = $result->fetch_assoc()) {
        echo "  Building: '{$row['building']}' => {$row['latest_time']}\n";
    }
} else {
    echo "No grouped results (empty table)\n";
}

// Check distinct buildings in reports
echo "\n5. Buildings with Reports:\n";
echo str_repeat("-", 50) . "\n";
$result = $conn->query("SELECT DISTINCT building FROM cctv_reports");
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "  - '{$row['building']}'\n";
    }
} else {
    echo "No buildings with reports\n";
}

$conn->close();
echo "\n=== Verification Complete ===\n";
?>