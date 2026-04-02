<?php
header('Content-Type: application/json');
require_once 'config.php';

$response = [
    'battery_status' => 'Unknown',
    'led_status' => 'Unknown',
    'detection_status' => 'Unknown',
    'alarm_status' => 'Unknown',
    'last_update' => null,
    'total_reports' => 0,
    'summary' => [
        'battery' => ['pass' => 0, 'fail' => 0],
        'led' => ['pass' => 0, 'fail' => 0],
        'detection' => ['pass' => 0, 'fail' => 0],
        'alarm' => ['pass' => 0, 'fail' => 0]
    ]
];

// Get the latest report (existing behavior)
$sql = "SELECT battery_status, led_status, detection_test_status, alarm_status, created_at FROM hand_held_checks WHERE is_deleted = 0 ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $response['battery_status'] = $row['battery_status'];
    $response['led_status'] = $row['led_status'];
    $response['detection_status'] = $row['detection_test_status'];
    $response['alarm_status'] = $row['alarm_status'];
    $response['last_update'] = $row['created_at'];
}

// Get aggregate pass/fail counts across ONLY THE LATEST report for each guard_post
$sql_summary = "SELECT 
    COUNT(*) as total_reports,
    SUM(CASE WHEN battery_status = 'พร้อมใช้งาน' THEN 1 ELSE 0 END) as battery_pass,
    SUM(CASE WHEN battery_status != 'พร้อมใช้งาน' THEN 1 ELSE 0 END) as battery_fail,
    SUM(CASE WHEN led_status = 'ผ่านการทดสอบ' THEN 1 ELSE 0 END) as led_pass,
    SUM(CASE WHEN led_status != 'ผ่านการทดสอบ' THEN 1 ELSE 0 END) as led_fail,
    SUM(CASE WHEN detection_test_status = 'ผ่านการทดสอบ' THEN 1 ELSE 0 END) as detection_pass,
    SUM(CASE WHEN detection_test_status != 'ผ่านการทดสอบ' THEN 1 ELSE 0 END) as detection_fail,
    SUM(CASE WHEN alarm_status = 'ผ่านการทดสอบ' THEN 1 ELSE 0 END) as alarm_pass,
    SUM(CASE WHEN alarm_status != 'ผ่านการทดสอบ' THEN 1 ELSE 0 END) as alarm_fail
FROM (
    SELECT * FROM hand_held_checks h1 
    WHERE is_deleted = 0 AND id = (SELECT MAX(id) FROM hand_held_checks h2 WHERE h2.guard_post = h1.guard_post AND h2.is_deleted = 0)
) as latest_checks";


$result_summary = $conn->query($sql_summary);

if ($result_summary && $result_summary->num_rows > 0) {
    $summary_row = $result_summary->fetch_assoc();
    $response['total_reports'] = (int) $summary_row['total_reports'];
    $response['summary'] = [
        'battery' => [
            'pass' => (int) $summary_row['battery_pass'],
            'fail' => (int) $summary_row['battery_fail']
        ],
        'led' => [
            'pass' => (int) $summary_row['led_pass'],
            'fail' => (int) $summary_row['led_fail']
        ],
        'detection' => [
            'pass' => (int) $summary_row['detection_pass'],
            'fail' => (int) $summary_row['detection_fail']
        ],
        'alarm' => [
            'pass' => (int) $summary_row['alarm_pass'],
            'fail' => (int) $summary_row['alarm_fail']
        ]
    ];
}

echo json_encode($response);
$conn->close();
?>