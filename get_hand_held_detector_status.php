<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

$response = [
    'battery_status_text' => 'N/A',
    'battery_status_indicator' => 'N/A',
    'led_status_text' => 'N/A',
    'led_status_indicator' => 'N/A',
    'detection_status_text' => 'N/A',
    'detection_status_indicator' => 'N/A',
    'alarm_status_text' => 'N/A',
    'alarm_status_indicator' => 'N/A',
    'metal_detection_result' => 'N/A',
    'last_calibration' => 'N/A',
    'next_check' => 'N/A',
    'last_update' => null
];

// Get the latest hand_held_checks report
$sql = "SELECT inspection_date, battery_status, led_status, detection_test_status, alarm_status, created_at 
        FROM hand_held_checks 
        ORDER BY created_at DESC 
        LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();

    $response['last_update'] = $row['created_at'];

    // Map database statuses to display texts and indicators
    // Battery Status
    if ($row['battery_status'] === 'พร้อมใช้งาน') {
        $response['battery_status_text'] = 'All devices checked';
        $response['battery_status_indicator'] = 'Active';
    } else {
        $response['battery_status_text'] = 'Battery low/faulty';
        $response['battery_status_indicator'] = 'Inactive';
    }

    // LED Status
    if ($row['led_status'] === 'ผ่านการทดสอบ') {
        $response['led_status_text'] = 'Green LED active';
        $response['led_status_indicator'] = 'Online';
    } else {
        $response['led_status_text'] = 'LED faulty';
        $response['led_status_indicator'] = 'Offline';
    }

    // Detection Test Status
    if ($row['detection_test_status'] === 'ผ่านการทดสอบ') {
        $response['detection_status_text'] = 'Range tested OK';
        $response['detection_status_indicator'] = 'Calibrated';
    } else {
        $response['detection_status_text'] = 'Range test failed';
        $response['detection_status_indicator'] = 'Uncalibrated';
    }

    // Alarm Status
    if ($row['alarm_status'] === 'ผ่านการทดสอบ') {
        $response['alarm_status_text'] = 'Sound system OK';
        $response['alarm_status_indicator'] = 'Functional';
        $response['metal_detection_result'] = '✓ Red LED + Sound';
    } else {
        $response['alarm_status_text'] = 'Sound system faulty';
        $response['alarm_status_indicator'] = 'Malfunction';
        $response['metal_detection_result'] = '✗ No/Faulty Alert';
    }

    // Last Calibration and Next Check (simplified for now, could be derived from inspection_date)
    $inspectionDate = new DateTime($row['inspection_date']);
    $response['last_calibration'] = $inspectionDate->format('Y-m-d H:i'); // Or just date if time not relevant
    $inspectionDate->modify('+1 day'); // Assuming next check is next day
    $response['next_check'] = $inspectionDate->format('Y-m-d H:i');
    
    // For display on dashboard, it's "Today 06:00" and "Tomorrow 06:00"
    // Let's make it more dynamic based on the actual inspection_date
    $today = new DateTime();
    if ($inspectionDate->format('Y-m-d') == $today->format('Y-m-d')) {
        $response['last_calibration'] = 'Today ' . (new DateTime($row['created_at']))->format('H:i');
        $response['next_check'] = 'Tomorrow ' . (new DateTime($row['created_at']))->format('H:i');
    } else {
        $response['last_calibration'] = (new DateTime($row['inspection_date']))->format('d/m/Y H:i');
        $response['next_check'] = (new DateTime($row['inspection_date']))->modify('+1 day')->format('d/m/Y H:i');
    }

}

$conn->close();

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>