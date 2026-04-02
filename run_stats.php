<?php
error_reporting(0);
ini_set('display_errors', 0);
define('SECURE_STATS', true);
$_GET['range'] = 'month';
$_SESSION['loggedin'] = true;
$_SESSION['user_id'] = 1;

require_once 'config.php';
include 'get_stats_data.php';
?>
