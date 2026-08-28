<?php
// Mocking session and environment
$_GET['range'] = 'month'; // Check last 30 days including March 7
$_SESSION['loggedin'] = true;
$_SESSION['user_id'] = 1;

require_once 'config.php';

// Include the target file, but since it echoes JSON, we capture it.
ob_start();
include 'get_stats_data.php';
$output = ob_get_clean();

// Parse and check CCTV
$data = json_decode($output, true);
if (!$data) {
    echo "ERROR: Failed to parse JSON. Raw output: " . substr($output, 0, 500) . "\n";
} else {
    echo "JSON parsed successfully.\n";
    echo "Labels count: " . count($data['labels']) . "\n";
    $cctv_online = $data['datasets']['cctv_online'];
    $points_count = 0;
    foreach($cctv_online as $p) if ($p !== null) $points_count++;
    echo "CCTV Online points (not null): " . $points_count . "\n";
    
    // Check if March 7 is in labels and if it has a value
    $index = array_search('Sat, 07 Mar', $data['labels']); // Display format is 'D, d M'
    if ($index !== false) {
        $val = $cctv_online[$index];
        echo "Mar 7 index: $index, Value: " . ($val === null ? 'null' : $val) . "\n";
    } else {
        echo "Mar 7 not found in labels.\n";
    }
}
?>
