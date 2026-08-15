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
    'total_car_slots' => 1172, // Sum of all 7 car lots: 97+114+100+264+415+53+129 = 1172
    'total_motorcycle_occupied' => 0,
    'total_motorcycle_slots' => 757, // Sum: 296+210+251 = 757
    'car_lots_data' => [],
    'motorcycle_lots_data' => [],
    'last_update' => null
];

// Get aggregate pass/fail/other counts across ONLY THE LATEST report for each lot_name
$sql_counts = "
    SELECT lot_name, vehicle_count, created_at
    FROM (
        SELECT c.lot_name, c.vehicle_count, r.created_at,
               ROW_NUMBER() OVER (PARTITION BY c.lot_name ORDER BY r.inspection_date DESC, r.created_at DESC) as rn
        FROM car_parking_reports r
        JOIN parking_lot_counts c ON r.id = c.report_id
        WHERE r.is_deleted = 0
    ) t
    WHERE rn = 1
";

$result_counts = $conn->query($sql_counts);
$counts_map = [];
$latest_ts = null;

if ($result_counts && $result_counts->num_rows > 0) {
    while ($row = $result_counts->fetch_assoc()) {
        $counts_map[$row['lot_name']] = (int) $row['vehicle_count'];
        if ($latest_ts === null || $row['created_at'] > $latest_ts) {
            $latest_ts = $row['created_at'];
        }
    }
}
$response['last_update'] = $latest_ts;

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