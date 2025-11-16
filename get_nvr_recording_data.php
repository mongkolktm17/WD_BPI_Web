<?php
require_once 'config.php';

header('Content-Type: application/json');

$response = [
    'last_update' => null,
    'total_online_channels' => 0,
    'total_offline_channels' => 0,
    'total_all_channels' => 0,
    'overall_percentage' => 0,
    'buildings' => []
];

try {
    // Find the latest submission_id
    $sql_latest_submission = "SELECT submission_id, MAX(report_time) as latest_report_time 
                              FROM cctv_reports 
                              GROUP BY submission_id 
                              ORDER BY latest_report_time DESC 
                              LIMIT 1";
    $result_latest_submission = $conn->query($sql_latest_submission);

    if ($result_latest_submission && $result_latest_submission->num_rows > 0) {
        $latest_submission = $result_latest_submission->fetch_assoc();
        $latest_submission_id = $latest_submission['submission_id'];
        $response['last_update'] = $latest_submission['latest_report_time'];

        // Fetch all reports for the latest submission_id
        $sql_reports = "SELECT 
                            cr.building, 
                            cr.total_channels, 
                            cr.online_channels, 
                            cr.offline_channels, 
                            cr.online_percentage,
                            cr.report_time, /* Added report_time */
                            crd.nvr_name,
                            cd.target_days
                        FROM cctv_reports cr
                        JOIN cctv_report_details crd ON cr.id = crd.report_id
                        JOIN cctv_devices cd ON cr.building = cd.building AND crd.nvr_name = cd.nvr_name
                        WHERE cr.submission_id = ?
                        ORDER BY cr.building, cd.nvr_name";
        
        $stmt_reports = $conn->prepare($sql_reports);
        $stmt_reports->bind_param("s", $latest_submission_id);
        $stmt_reports->execute();
        $result_reports = $stmt_reports->get_result();

        $building_data = [];
        $overall_total_channels = 0;
        $overall_online_channels = 0;

        if ($result_reports->num_rows > 0) {
            while ($row = $result_reports->fetch_assoc()) {
                $building = $row['building'];
                $nvr_name = $row['nvr_name'];
                $total_channels = (int)$row['total_channels'];
                $online_channels_reported = (int)$row['online_channels']; // This is the 'days' input from the form
                $target_days = (int)$row['target_days'];
                $report_time = $row['report_time']; // Get report_time

                if (!isset($building_data[$building])) {
                    $building_data[$building] = [
                        'total' => 0,
                        'online' => 0, // Channels that meet target_days
                        'below' => 0, // Channels that do NOT meet target_days
                        'nvrs' => []
                    ];
                }

                $building_data[$building]['total'] += $total_channels;
                $overall_total_channels += $total_channels;

                $nvr_pass_status = ($online_channels_reported >= $target_days);
                if ($nvr_pass_status) {
                    $building_data[$building]['online'] += $total_channels;
                    $overall_online_channels += $total_channels;
                } else {
                    $building_data[$building]['below'] += $total_channels;
                }

                $nvr_status_text = $nvr_pass_status ? "Recording (Passed)" : "Recording (Failed)";

                $building_data[$building]['nvrs'][] = [
                    'nvr_name' => $nvr_name,
                    'total_channels' => $total_channels,
                    'recorded_days' => $online_channels_reported, // This is the 'days' input
                    'target_days' => $target_days,
                    'pass_standard' => $nvr_pass_status,
                    'percentage' => $nvr_pass_status ? 100 : 0, // Percentage for this NVR based on pass/fail
                    'last_recorded' => $report_time, // Added last_recorded
                    'status' => $nvr_status_text // Added status
                ];
            }
        }

        foreach ($building_data as $building => &$data) {
            $data['percent'] = $data['total'] > 0 ? round(($data['online'] / $data['total']) * 100) : 0;
        }
        unset($data); // Unset reference to avoid issues

        $response['total_all_channels'] = $overall_total_channels;
        $response['total_online_channels'] = $overall_online_channels;
        $response['total_offline_channels'] = $overall_total_channels - $overall_online_channels;
        $response['overall_percentage'] = $overall_total_channels > 0 ? round(($overall_online_channels / $overall_total_channels) * 100) : 0;
        $response['buildings'] = $building_data;

    } else {
        // No reports found, return empty data
        $response['last_update'] = date('Y-m-d H:i:s'); // Current time as last update
    }

} catch (Exception $e) {
    http_response_code(500);
    $response = ['error' => $e->getMessage()];
} finally {
    $conn->close();
}

echo json_encode($response);
?>