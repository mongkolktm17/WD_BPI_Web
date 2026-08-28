<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

$response = [
    'zones' => [],
    'online_count' => 0,
    'maintenance_count' => 0,
    'offline_count' => 0,
    'total_zones' => 6,
    'operational_percentage' => 0,
    'last_update' => null
];

// Get the latest metal_detector_checks report
$sql = "SELECT created_at, zone1_status, zone2_status, zone3_status, zone4_status, zone5_status, zone6_status
        FROM metal_detector_checks
        ORDER BY created_at DESC
        LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();

    $response['last_update'] = $row['created_at'];

    for ($i = 1; $i <= $response['total_zones']; $i++) {
        $zone_status_db = $row["zone{$i}_status"];
        $display_status = '';
        $status_class = '';

        switch ($zone_status_db) {
            case 'พร้อมใช้งาน':
                $display_status = 'Online';
                $status_class = 'status-online';
                $response['online_count']++;
                break;
            case 'ไม่พร้อมใช้งาน':
                $display_status = 'Offline';
                $status_class = 'status-offline';
                $response['offline_count']++;
                break;
            case 'อื่นๆ': // Assuming 'อื่นๆ' maps to Maintenance
                $display_status = 'Maintenance';
                $status_class = 'status-warning';
                $response['maintenance_count']++;
                break;
            default:
                $display_status = 'Unknown';
                $status_class = 'status-offline'; // Default to offline if unknown
                $response['offline_count']++;
                break;
        }

        $response['zones'][] = [
            'zone_number' => $i,
            'status_db' => $zone_status_db,
            'display_status' => $display_status,
            'status_class' => $status_class
        ];
    }

    $operational_zones = $response['online_count'] + $response['maintenance_count'];
    if ($response['total_zones'] > 0) {
        $response['operational_percentage'] = round(($operational_zones / $response['total_zones']) * 100);
    }
}

$conn->close();

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>