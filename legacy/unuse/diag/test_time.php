<?php
require_once 'config.php';
date_default_timezone_set('Asia/Bangkok');
echo "PHP Time: " . date('Y-m-d H:i:s') . "\n";
$res = $conn->query("SELECT NOW() as now");
$row = $res->fetch_assoc();
echo "MySQL Time: " . $row['now'] . "\n";
$conn->close();
