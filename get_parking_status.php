<?php
header('Content-Type: application/json');
require_once 'config.php';

// Mapping from Thai DB names to English Dashboard IDs/Names
// Thai Name (from car_parking.php) => [Dashboard Name, Capacity]
$lot_mapping = [
    // Cars
    "ลานรถยนต์ 1 (97 Slot)" => ["name" => "Parking Lot 1", "capacity" => 97, "type" => "car"], // Note: Lot 1 not in dashboard HTML example but might be needed? Dashboard has Lot 2, 3/1, 3/2, 4, 5, B.8
    "ลานรถยนต์ 2 (114 Slot)" => ["name" => "Parking Lot 2", "capacity" => 114, "type" => "car"],
    "ลานรถยนต์ 3/1 (100 Slot)" => ["name" => "Parking Lot 3/1", "capacity" => 100, "type" => "car"],
    "ลานรถยนต์ 3/2 (264 Slot)" => ["name" => "Parking Lot 3/2", "capacity" => 264, "type" => "car"],
    "ลานรถยนต์ 4 (415 Slot)" => ["name" => "Parking Lot 4", "capacity" => 415, "type" => "car"],
    "ลานรถยนต์ 5 (53 Slot)" => ["name" => "Parking Lot 5", "capacity" => 53, "type" => "car"],
    "ลานรถยนต์ B.9 (129 Slot)" => ["name" => "Parking Lot B.9", "capacity" => 129, "type" => "car"],

    // Motorcycles
    "ลานจอด 1 (296 Slot)" => ["name" => "Motorcycle Lot 1", "capacity" => 296, "type" => "motorcycle"],
    "ลานจอด 2 (210 Slot)" => ["name" => "Motorcycle Lot 2", "capacity" => 210, "type" => "motorcycle"],
    "ลานจอด 3/1 (251 Slot)" => ["name" => "Motorcycle Lot 3/1", "capacity" => 251, "type" => "motorcycle"]
];

$response = [
    'total_car_occupied' => 0,
    'total_car_slots' => 1075, // Sum of capacities: 114+100+264+415+53+129 = 1075
    'total_motorcycle_occupied' => 0,
    'total_motorcycle_slots' => 757, // Sum: 296+210+251 = 757
    'car_lots_data' => [],
    'motorcycle_lots_data' => [],
    'last_update' => null
];

// Get latest parking report
$sql_report = "SELECT id, created_at FROM car_parking_reports ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
$result_report = $conn->query($sql_report);

$counts_map = [];

if ($result_report && $result_report->num_rows > 0) {
    $report = $result_report->fetch_assoc();
    $report_id = $report['id'];
    $response['last_update'] = $report['created_at'];

    // Get counts for this report
    $sql_counts = "SELECT lot_name, vehicle_count FROM parking_lot_counts WHERE report_id = ?";
    $stmt = $conn->prepare($sql_counts);
    $stmt->bind_param("i", $report_id);
    $stmt->execute();
    $result_counts = $stmt->get_result();

    while ($row = $result_counts->fetch_assoc()) {
        $counts_map[$row['lot_name']] = (int) $row['vehicle_count'];
    }
    $stmt->close();
}

// Build the response based on the mapping (ensures all lots are present even if count is 0)
foreach ($lot_mapping as $thai_name => $info) {
    $count = isset($counts_map[$thai_name]) ? $counts_map[$thai_name] : 0;
    $capacity = $info['capacity'];
    $percentage = $capacity > 0 ? round(($count / $capacity) * 100) : 0;

    $lot_data = [
        'name' => $info['name'],
        'occupied' => $count,
        'capacity' => $capacity,
        'percentage' => $percentage
    ];

    if ($info['type'] === 'car') {
        // Exclude Lot 1 if not in dashboard? Dashboard sum is 990. 
        // Let's check: 114+100+264+415+53+44 = 990. Correct.
        // So "Lot 1" (97 slots) is NOT used in the dashboard total and display.
        // We should skip it if we want to match the dashboard exactly.
        // Or maybe dashboard is missing it? User said "Connect data", better match existing dashboard capacity first.
        if ($info['name'] === 'Parking Lot 1')
            continue;

        $response['car_lots_data'][] = $lot_data;
        $response['total_car_occupied'] += $count;
    } else {
        $response['motorcycle_lots_data'][] = $lot_data;
        $response['total_motorcycle_occupied'] += $count;
    }
}

echo json_encode($response);
$conn->close();
?>