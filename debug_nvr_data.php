<?php
require_once 'config.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== NVR Recording Data Debug ===\n\n";

// Check latest NVR data by building
echo "1. Latest NVR Data by Building:\n";
echo str_repeat("-", 60) . "\n";

$sql = "
    SELECT
        cr.building,
        crd.nvr_name,
        crd.online_channels,
        cr.report_time
    FROM
        cctv_reports cr
    JOIN
        cctv_report_details crd ON cr.id = crd.report_id
    WHERE
        (cr.building, crd.nvr_name, cr.report_time) IN (
            SELECT
                cr_inner.building,
                crd_inner.nvr_name,
                MAX(cr_inner.report_time)
            FROM
                cctv_reports cr_inner
            JOIN
                cctv_report_details crd_inner ON cr_inner.id = crd_inner.report_id
            GROUP BY
                cr_inner.building,
                crd_inner.nvr_name
        )
    ORDER BY cr.building, crd.nvr_name
";

$result = $conn->query($sql);
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $status = $row['online_channels'] >= 62 ? '✓ PASS' : '✗ FAIL';
        echo "Building: '{$row['building']}' | NVR: {$row['nvr_name']} | Days: {$row['online_channels']} | {$status}\n";
    }
} else {
    echo "No data found\n";
}

// Count by building
echo "\n2. Summary Count by Building:\n";
echo str_repeat("-", 60) . "\n";

$nvr_status_counts = [
    'B2' => ['total' => 10, 'passed' => 0],
    'B3' => ['total' => 2, 'passed' => 0],
    'B4' => ['total' => 6, 'passed' => 0],
    'B9' => ['total' => 1, 'passed' => 0],
];

$result = $conn->query($sql);
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $building = $row['building'];
        $online_channels = (int) $row['online_channels'];

        if (isset($nvr_status_counts[$building]) && $online_channels >= 62) {
            $nvr_status_counts[$building]['passed']++;
        }
    }
}

foreach ($nvr_status_counts as $building => $counts) {
    $percentage = $counts['total'] > 0 ? round(($counts['passed'] / $counts['total']) * 100) : 0;
    echo "Building '{$building}': {$counts['passed']}/{$counts['total']} passed ({$percentage}%)\n";
}

// Check distinct building names
echo "\n3. Distinct Building Names in cctv_reports:\n";
echo str_repeat("-", 60) . "\n";
$result = $conn->query("SELECT DISTINCT building FROM cctv_reports ORDER BY building");
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "  - '{$row['building']}'\n";
    }
}

$conn->close();
echo "\n=== Debug Complete ===\n";
?>