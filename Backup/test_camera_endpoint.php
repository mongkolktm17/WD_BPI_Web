<?php
// Simulate browser request to get_camera_status.php
ob_start();
include 'get_camera_status.php';
$output = ob_get_clean();

// Display the output
echo "=== get_camera_status.php Output ===\n";
echo $output;
echo "\n\n=== JSON Validation ===\n";
$decoded = json_decode($output, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo "✓ Valid JSON\n";
    echo "Buildings count: " . count($decoded['buildings']) . "\n";
    echo "Last update: " . ($decoded['last_update'] ?? 'null') . "\n";
    if (!empty($decoded['buildings'])) {
        foreach ($decoded['buildings'] as $building => $nvrs) {
            echo "\nBuilding: $building\n";
            foreach ($nvrs as $nvr) {
                echo "  - {$nvr['nvr_name']}: {$nvr['online_channels']}/{$nvr['total_channels']} ({$nvr['percentage']}%)\n";
            }
        }
    }
} else {
    echo "✗ Invalid JSON: " . json_last_error_msg() . "\n";
}
?>