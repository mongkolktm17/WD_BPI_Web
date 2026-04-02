<?php
header('Content-Type: application/json');
require_once 'config.php';

$response = [
    'morning_shift' => 0,
    'morning_shift_contract' => null,
    'evening_shift' => 0,
    'evening_shift_contract' => null,
    'total_actual' => 0,
    'total_contract' => 0,
    'last_update' => null
];


$sql = "SELECT morning_shift, morning_shift_contract, evening_shift, evening_shift_contract, created_at FROM security_guard_counts WHERE is_deleted = 0 ORDER BY record_date DESC, created_at DESC LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $response['morning_shift'] = (int) $row['morning_shift'];
    $response['morning_shift_contract'] = is_null($row['morning_shift_contract']) ? null : (int) $row['morning_shift_contract'];
    $response['evening_shift'] = (int) $row['evening_shift'];
    $response['evening_shift_contract'] = is_null($row['evening_shift_contract']) ? null : (int) $row['evening_shift_contract'];
    $response['last_update'] = $row['created_at'];

    $response['total_actual'] = $response['morning_shift'] + $response['evening_shift'];
    $contract_day = $response['morning_shift_contract'] ?? 0;
    $contract_night = $response['evening_shift_contract'] ?? 0;
    $response['total_contract'] = $contract_day + $contract_night;
}

echo json_encode($response);
$conn->close();
?>