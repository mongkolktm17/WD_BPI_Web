<?php
header('Content-Type: application/json');
require_once 'config.php';

$response = [
    'zones' => [],
    'online_count' => 0,
    'offline_count' => 0,
    'maintenance_count' => 0,
    'last_update' => null
];

$sql = "SELECT zone1_status, zone2_status, zone3_status, zone4_status, zone5_status, zone6_status, created_at FROM metal_detector_checks ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $response['last_update'] = $row['created_at'];

    for ($i = 1; $i <= 6; $i++) {
        $status = $row["zone{$i}_status"]; // e.g. 'Normal', 'Abnormal', 'Maintenance' ? Check DB values.
        // Assuming values might be 'Normal' (Online), 'Broken' (Offline), 'Maintenance' check schema/setup calls?
        // In setup.php, type is VARCHAR(255).
        // Let's assume 'Normal' = Online, 'Maintenance' = Maintenance, others = Offline.

        $type = 'offline';
        if (stripos($status, 'Normal') !== false || stripos($status, 'Pass') !== false || stripos($status, 'Online') !== false) {
            $type = 'online';
            $response['online_count']++;
        } elseif (stripos($status, 'Maintenance') !== false) {
            $type = 'maintenance';
            $response['maintenance_count']++;
        } else {
            $response['offline_count']++;
        }

        $response['zones'][$i] = [
            'status' => $status,
            'type' => $type
        ];
    }
}

echo json_encode($response);
$conn->close();
?>