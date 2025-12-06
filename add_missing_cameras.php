<?php
/**
 * add_missing_cameras.php
 * Add 32 missing camera names (B9: 31, B3 CH45: 1)
 */

require_once 'config.php';

echo "Adding missing camera names...\n\n";

// Add B3 NVR2 Channel 45
$stmt = $conn->prepare("INSERT IGNORE INTO cctv_camera_names (building, nvr_name, channel_number, camera_name) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssis", $building, $nvr, $channel, $name);

$building = 'B3';
$nvr = 'NVR2';
$channel = 45;
$name = 'CH45';
$stmt->execute();
echo "✓ Added B3 NVR2 CH45\n";

// Add all B9 NVR1 channels (1-31)
$building = 'B9';
$nvr = 'NVR1';
for ($i = 1; $i <= 31; $i++) {
    $channel = $i;
    $name = 'CH' . $i;
    $stmt->execute();
}
echo "✓ Added B9 NVR1 CH1-CH31 (31 cameras)\n\n";

$stmt->close();

// Verify totals
echo "==========================================\n";
echo "Verification:\n";
echo "==========================================\n";

$result = $conn->query("SELECT building, COUNT(*) as count FROM cctv_camera_names GROUP BY building ORDER BY building");
while ($row = $result->fetch_assoc()) {
    echo "{$row['building']}: {$row['count']} cameras\n";
}

$total = $conn->query("SELECT COUNT(*) as total FROM cctv_camera_names")->fetch_assoc()['total'];
echo "\nTotal in database: $total cameras\n";

if ($total == 847) {
    echo "\n✅ SUCCESS! All 847 cameras imported!\n";
} else {
    echo "\n⚠️  Expected 847, got $total\n";
}

$conn->close();
?>