<?php
error_reporting(0);
ini_set('display_errors', 0);
$_SESSION['loggedin'] = true;
$_SESSION['user_id'] = 1;

require_once 'config.php';

echo "--- DASHBOARD STATUS ---\n";
include 'get_parking_status.php';
echo "\n\n--- STATS DATA (REPORT) ---\n";
$_GET['range'] = 'month';
include 'get_stats_data.php';
?>
