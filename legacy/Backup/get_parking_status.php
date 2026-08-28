<?php
header('Content-Type: application/json');
require_once 'config.php';

$response = [
    'car_total' => 0,
    'car_capacity' => 990, // Hardcoded from dashboard
    'motorcycle_total' => 0,
    'motorcycle_capacity' => 757, // Hardcoded from dashboard
    'lots' => [],
    'last_update' => null
];

// Get latest parking report
$sql_report = "SELECT id, created_at FROM car_parking_reports ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
$result_report = $conn->query($sql_report);

if ($result_report && $result_report->num_rows > 0) {
    $report = $result_report->fetch_assoc();
    $report_id = $report['id'];
    $response['last_update'] = $report['created_at'];

    // Get counts for this report
    $sql_counts = "SELECT lot_name, vehicle_type, vehicle_count FROM parking_lot_counts WHERE report_id = ?";
    $stmt = $conn->prepare($sql_counts);
    $stmt->bind_param("i", $report_id);
    $stmt->execute();
    $result_counts = $stmt->get_result();

    while ($row = $result_counts->fetch_assoc()) {
        $lot_name = $row['lot_name'];
        $count = (int) $row['vehicle_count'];
        $type = $row['vehicle_type'];

        // Normalize lot name for ID mapping if needed (e.g. "Parking Lot 2" -> "Parking-Lot-2")
        // But sending raw name is better, JS can handle mapping.

        $response['lots'][$lot_name] = [
            'count' => $count,
            'type' => $type
        ];

        if ($type == 'car') {
            $response['car_total'] += $count;
        } elseif ($type == 'motorcycle') {
            $response['motorcycle_total'] += $count;
        }
    }
    $stmt->close();
}

echo json_encode($response);
$conn->close();
?>