<?php
require_once 'config.php';

header('Content-Type: application/json');

// Ensure the user is logged in, or handle unauthorized access appropriately
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    // For an API endpoint, it's better to return an error than redirect
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized access.']);
    exit;
}

$nvr_status_data = [];

try {
    // Select all NVRs from cctv_devices and LEFT JOIN their latest report data
    $sql = "
        SELECT
            cd.building,
            cd.nvr_name,
            cd.target_days,
            COALESCE(crd.recording_days, 0) AS recording_days, -- Use COALESCE to default to 0 if no report found
            cr.report_time AS last_report_time
        FROM cctv_devices cd
        LEFT JOIN (
            SELECT
                cr_inner.building,
                crd_inner.nvr_name,
                MAX(cr_inner.report_time) AS latest_report_time
            FROM cctv_reports cr_inner
            JOIN cctv_report_details crd_inner ON cr_inner.id = crd_inner.report_id
            GROUP BY cr_inner.building, crd_inner.nvr_name
        ) AS latest_reports ON cd.building = latest_reports.building AND cd.nvr_name = latest_reports.nvr_name
        LEFT JOIN cctv_reports cr ON latest_reports.building = cr.building AND latest_reports.nvr_name = cr.nvr_name AND latest_reports.latest_report_time = cr.report_time
        LEFT JOIN cctv_report_details crd ON cr.id = crd.report_id AND cd.nvr_name = crd.nvr_name
        ORDER BY cd.building, cd.nvr_name
    ";

    $result = $conn->query($sql);

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $building = $row['building'];
            $nvr_name = $row['nvr_name'];
            $recording_days = (int)$row['recording_days'];
            $target_days = (int)$row['target_days'];

            if (!isset($nvr_status_data[$building])) {
                $nvr_status_data[$building] = [];
            }
            $nvr_status_data[$building][] = [
                'nvr_name' => $nvr_name,
                'recording_days' => $recording_days,
                'target_days' => $target_days
            ];
        }
    } else {
        throw new Exception("Database query failed: " . $conn->error);
    }

    echo json_encode($nvr_status_data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} finally {
    $conn->close();
}
?>