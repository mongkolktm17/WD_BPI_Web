<?php
header('Content-Type: application/json');
require_once 'config.php';

$response = [
    'battery_status' => 'Unknown',
    'led_status' => 'Unknown',
    'detection_status' => 'Unknown',
    'alarm_status' => 'Unknown',
    'last_update' => null
];

$sql = "SELECT battery_status, led_status, detection_test_status, alarm_status, created_at FROM hand_held_checks ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $response['battery_status'] = $row['battery_status'];
    $response['led_status'] = $row['led_status'];
    $response['detection_status'] = $row['detection_test_status'];
    $response['alarm_status'] = $row['alarm_status'];
    $response['last_update'] = $row['created_at'];
}

echo json_encode($response);
$conn->close();
?>