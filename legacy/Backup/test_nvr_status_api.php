<?php
// Test get_nvr_status.php output
ob_start();
include 'get_nvr_status.php';
$output = ob_get_clean();

echo "=== get_nvr_status.php Output ===\n\n";
echo $output;
echo "\n\n=== JSON Validation ===\n";
$decoded = json_decode($output, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo "✓ Valid JSON\n\n";
    echo "=== Parsed Data ===\n";
    echo "Total Expected NVRs: " . ($decoded['total_expected_nvrs'] ?? 'N/A') . "\n";
    echo "Last Update: " . ($decoded['last_update'] ?? 'N/A') . "\n";
    echo "\nBuildings:\n";

    if (!empty($decoded['buildings'])) {
        foreach ($decoded['buildings'] as $building => $data) {
            echo "\n  Building: {$building}\n";
            echo "    - NVR Count: {$data['nvr_count']}\n";
            echo "    - Pass Count: {$data['nvr_pass_count']}\n";
            echo "    - Fail Count: {$data['nvr_fail_count']}\n";
            echo "    - Submitted: {$data['nvr_submitted_count']}\n";
            echo "    - Total Channels: {$data['total']}\n";
            echo "    - Online: {$data['online']}\n";
            echo "    - Percentage: {$data['percent']}%\n";
        }

        // Calculate totals
        $totalPass = 0;
        $totalExpected = $decoded['total_expected_nvrs'] ?? 0;
        foreach ($decoded['buildings'] as $data) {
            $totalPass += $data['nvr_pass_count'];
        }
        $overallPercent = $totalExpected > 0 ? round(($totalPass / $totalExpected) * 100) : 0;

        echo "\n=== Summary ===\n";
        echo "Total Passed: {$totalPass}/{$totalExpected} ({$overallPercent}%)\n";
    } else {
        echo "  No buildings data\n";
    }
} else {
    echo "✗ Invalid JSON: " . json_last_error_msg() . "\n";
}
?>