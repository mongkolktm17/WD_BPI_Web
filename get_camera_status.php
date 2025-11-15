<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

$response = [
    'buildings' => [],
    'last_update' => null
];

// Get the latest report_id for each building
$latest_report_ids_sql = "SELECT building, MAX(created_at) as latest_created_at
                          FROM cctv_reports
                          GROUP BY building";
$latest_report_ids_result = $conn->query($latest_report_ids_sql);

$latest_reports_by_building = [];
$overall_latest_update = null;

if ($latest_report_ids_result && $latest_report_ids_result->num_rows > 0) {
    while ($row = $latest_report_ids_result->fetch_assoc()) {
        $building = $row['building'];
        $latest_created_at = $row['latest_created_at'];
        
        // Find the actual report_id for this latest timestamp and building
        $report_id_sql = "SELECT id FROM cctv_reports WHERE building = ? AND created_at = ? LIMIT 1";
        $stmt_report_id = $conn->prepare($report_id_sql);
        $stmt_report_id->bind_param("ss", $building, $latest_created_at);
        $stmt_report_id->execute();
        $report_id_result = $stmt_report_id->get_result();
        
        if ($report_id_result && $report_id_result->num_rows > 0) {
            $report_id_row = $report_id_result->fetch_assoc();
            $latest_reports_by_building[$building] = [
                'report_id' => $report_id_row['id'],
                'created_at' => $latest_created_at
            ];
            
            // Track overall latest update
            if ($overall_latest_update === null || $latest_created_at > $overall_latest_update) {
                $overall_latest_update = $latest_created_at;
            }
        }
        $stmt_report_id->close();
    }
}

foreach ($latest_reports_by_building as $building => $info) {
    $report_id = $info['report_id'];
    $response['buildings'][$building] = [];

    // Fetch NVR details for this latest report_id
    $nvr_details_sql = "SELECT nvr_name, total_channels, online_channels
                        FROM cctv_report_details
                        WHERE report_id = ?";
    $stmt_nvr_details = $conn->prepare($nvr_details_sql);
    $stmt_nvr_details->bind_param("i", $report_id);
    $stmt_nvr_details->execute();
    $nvr_details_result = $stmt_nvr_details->get_result();

    if ($nvr_details_result && $nvr_details_result->num_rows > 0) {
        while ($nvr_row = $nvr_details_result->fetch_assoc()) {
            $nvr_name = $nvr_row['nvr_name'];
            $total_channels = (int)$nvr_row['total_channels'];
            $online_channels = (int)$nvr_row['online_channels'];
            $percentage = $total_channels > 0 ? round(($online_channels / $total_channels) * 100) : 0;

            $response['buildings'][$building][] = [
                'nvr_name' => $nvr_name,
                'total_channels' => $total_channels,
                'online_channels' => $online_channels,
                'percentage' => $percentage
            ];
        }
    }
    $stmt_nvr_details->close();
}

$response['last_update'] = $overall_latest_update;

$conn->close();

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>