<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

$response = [
    'total_car_occupied' => 0,
    'total_car_slots' => 0,
    'total_motorcycle_occupied' => 0,
    'total_motorcycle_slots' => 0,
    'car_lots_data' => [],
    'motorcycle_lots_data' => [],
    'last_update' => null
];

// Define lot capacities (assuming these are static or fetched from another config)
// These values are hardcoded based on the car_parking.php file
$car_lot_capacities = [
    "ลานรถยนต์ 1 (97 Slot)" => 97,
    "ลานรถยนต์ 2 (114 Slot)" => 114,
    "ลานรถยนต์ 3/1 (100 Slot)" => 100,
    "ลานรถยนต์ 3/2 (264 Slot)" => 264,
    "ลานรถยนต์ 4 (415 Slot)" => 415,
    "ลานรถยนต์ 5 (53 Slot)" => 53,
    "ลานรถยนต์ B.8 (44 Slot)" => 44
];

$motorcycle_lot_capacities = [
    "ลานจอด 1 (296 Slot)" => 296,
    "ลานจอด 2 (210 Slot)" => 210,
    "ลานจอด 3/1 (251 Slot)" => 251
];

// Calculate total slots
foreach ($car_lot_capacities as $capacity) {
    $response['total_car_slots'] += $capacity;
}
foreach ($motorcycle_lot_capacities as $capacity) {
    $response['total_motorcycle_slots'] += $capacity;
}

// Get the latest report_id and its created_at timestamp
$latest_report_sql = "SELECT id, created_at FROM car_parking_reports ORDER BY created_at DESC LIMIT 1";
$latest_report_result = $conn->query($latest_report_sql);

$latest_report_id = null;
if ($latest_report_result && $latest_report_result->num_rows > 0) {
    $latest_report_row = $latest_report_result->fetch_assoc();
    $latest_report_id = $latest_report_row['id'];
    $response['last_update'] = $latest_report_row['created_at'];
}

if ($latest_report_id) {
    // Fetch parking counts for the latest report
    $parking_counts_sql = "SELECT lot_name, vehicle_type, vehicle_count FROM parking_lot_counts WHERE report_id = ?";
    $stmt = $conn->prepare($parking_counts_sql);
    $stmt->bind_param("i", $latest_report_id);
    $stmt->execute();
    $parking_counts_result = $stmt->get_result();

    if ($parking_counts_result) {
        while ($row = $parking_counts_result->fetch_assoc()) {
            $lot_name = $row['lot_name'];
            $vehicle_type = $row['vehicle_type'];
            $vehicle_count = (int)$row['vehicle_count'];

            if ($vehicle_type === 'car') {
                $response['total_car_occupied'] += $vehicle_count;
                $capacity = $car_lot_capacities[$lot_name] ?? 0;
                $percentage = $capacity > 0 ? round(($vehicle_count / $capacity) * 100) : 0;
                $response['car_lots_data'][] = [
                    'name' => $lot_name,
                    'occupied' => $vehicle_count,
                    'capacity' => $capacity,
                    'percentage' => $percentage
                ];
            } elseif ($vehicle_type === 'motorcycle') {
                $response['total_motorcycle_occupied'] += $vehicle_count;
                $capacity = $motorcycle_lot_capacities[$lot_name] ?? 0;
                $percentage = $capacity > 0 ? round(($vehicle_count / $capacity) * 100) : 0;
                $response['motorcycle_lots_data'][] = [
                    'name' => $lot_name,
                    'occupied' => $vehicle_count,
                    'capacity' => $capacity,
                    'percentage' => $percentage
                ];
            }
        }
    }
    $stmt->close();
}

$conn->close();

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>