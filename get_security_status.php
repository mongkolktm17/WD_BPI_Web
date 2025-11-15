<?php
require_once 'config.php';

header('Content-Type: application/json');

$response = [
    'morning_shift' => 0,
    'evening_shift' => 0,
    'total' => 0,
    'last_update' => null
];

// Fetch the latest security guard counts
// Prefer ordering by creation time; include created_at for a reliable timestamp
$sql = "SELECT morning_shift, evening_shift, total, record_date, created_at FROM security_guard_counts ORDER BY created_at DESC LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $response['morning_shift'] = isset($row['morning_shift']) ? (int)$row['morning_shift'] : 0;
    $response['evening_shift'] = isset($row['evening_shift']) ? (int)$row['evening_shift'] : 0;
    $response['total'] = isset($row['total']) ? (int)$row['total'] : ($response['morning_shift'] + $response['evening_shift']);
    // Use created_at when available, otherwise fall back to record_date
    $response['last_update'] = !empty($row['created_at']) ? $row['created_at'] : $row['record_date'];
}

$conn->close();

echo json_encode($response);
?>