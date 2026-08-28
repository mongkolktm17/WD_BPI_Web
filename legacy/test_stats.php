<?php
$_GET['range'] = 'month';
$_SESSION['loggedin'] = true;
$_SESSION['user_id'] = 1;

// Capture output
ob_start();
include 'get_stats_data.php';
$output = ob_get_clean();

file_put_contents('debug_stats.json', $output);
echo "Debug data saved to debug_stats.json\n";
?>
