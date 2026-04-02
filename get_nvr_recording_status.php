<?php
header('Content-Type: application/json');
require_once 'config.php';

// NVR Status Counts for 62-day criteria
$nvr_status_counts = [];
// Use correct buildings list from DB
$buildings_to_count = ['B2', 'B3', 'B4', 'B9'];

// Initialize counts
foreach ($buildings_to_count as $bldg) {
    $count_query = "SELECT COUNT(*) as total FROM cctv_devices WHERE building = ?";
    $stmt_count = $conn->prepare($count_query);
    $stmt_count->bind_param("s", $bldg);
    $stmt_count->execute();
    $count_result = $stmt_count->get_result();
    $count_row = $count_result->fetch_assoc();
    $nvr_status_counts[$bldg] = [
        'total' => (int) $count_row['total'],
        'passed' => 0
    ];
    $stmt_count->close();
}

$latest_update_time = null;

// Calculate passed counts
$sql_latest_nvr_data = "
    SELECT
        cr.building,
        crd.nvr_name,
        crd.recording_days,
        cr.report_time
    FROM
        nvr_recording_reports cr
    JOIN
        nvr_recording_details crd ON cr.id = crd.report_id
    WHERE
        cr.is_deleted = 0 AND
        (cr.building, crd.nvr_name, cr.report_time) IN (
            SELECT
                cr_inner.building,
                crd_inner.nvr_name,
                MAX(cr_inner.report_time)
            FROM
                nvr_recording_reports cr_inner
            JOIN
                nvr_recording_details crd_inner ON cr_inner.id = crd_inner.report_id
            WHERE cr_inner.is_deleted = 0
            GROUP BY
                cr_inner.building,
                crd_inner.nvr_name
        )
";

$result_latest = $conn->query($sql_latest_nvr_data);

if ($result_latest && $result_latest->num_rows > 0) {
    while ($row = $result_latest->fetch_assoc()) {
        $building = $row['building'];
        // Normalize building name if still needed (though DB is normalized now)
        $building = str_replace('.', '', $building);
        if ($building === 'B8')
            $building = 'B9'; // Fallback mapping

        $recording_days = (int) $row['recording_days'];

        // Track latest update time
        if (!$latest_update_time || $row['report_time'] > $latest_update_time) {
            $latest_update_time = $row['report_time'];
        }

        if (isset($nvr_status_counts[$building]) && $recording_days >= 62) {
            $nvr_status_counts[$building]['passed']++;
        }
    }
}

// Calculate totals
$total_nvrs = 0;
$total_passed = 0;
foreach ($nvr_status_counts as $counts) {
    $total_nvrs += $counts['total'];
    $total_passed += $counts['passed'];
}

echo json_encode([
    'total_nvrs' => $total_nvrs,
    'total_passed' => $total_passed,
    'buildings' => $nvr_status_counts,
    'last_update' => $latest_update_time
]);

$conn->close();
?>