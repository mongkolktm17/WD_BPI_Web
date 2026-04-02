<?php
header('Content-Type: application/json');
require_once 'config.php';

$response = [
    'zones' => [],
    'online_count' => 0,
    'offline_count' => 0,
    'maintenance_count' => 0,
    'last_update' => null,
    'total_reports' => 0,
    'summary' => []
];

// Get the latest report (existing behavior)
$sql = "SELECT zone1_status, zone2_status, zone3_status, zone4_status, zone5_status, zone6_status, created_at FROM metal_detector_checks WHERE is_deleted = 0 ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $response['last_update'] = $row['created_at'];

    for ($i = 1; $i <= 6; $i++) {
        $status = $row["zone{$i}_status"];

        $type = 'offline';
        if (stripos($status, 'Normal') !== false || stripos($status, 'Pass') !== false || stripos($status, 'Online') !== false || $status === 'พร้อมใช้งาน') {
            $type = 'online';
            $response['online_count']++;
        } elseif (stripos($status, 'Maintenance') !== false || $status === 'อื่นๆ') {
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

// Get aggregate pass/fail/other counts across ONLY THE LATEST report for each guard_post
$sql_summary = "SELECT 
    COUNT(*) as total_reports";

for ($i = 1; $i <= 6; $i++) {
    $sql_summary .= ",
    SUM(CASE WHEN zone{$i}_status = 'พร้อมใช้งาน' THEN 1 ELSE 0 END) as zone{$i}_pass,
    SUM(CASE WHEN zone{$i}_status = 'ไม่พร้อมใช้งาน' THEN 1 ELSE 0 END) as zone{$i}_fail,
    SUM(CASE WHEN zone{$i}_status = 'อื่นๆ' THEN 1 ELSE 0 END) as zone{$i}_other";
}

$sql_summary .= " FROM (
    SELECT * FROM metal_detector_checks m1 
    WHERE is_deleted = 0 AND id = (SELECT MAX(id) FROM metal_detector_checks m2 WHERE m2.guard_post = m1.guard_post AND m2.is_deleted = 0)
) as latest_checks";

$result_summary = $conn->query($sql_summary);

if ($result_summary && $result_summary->num_rows > 0) {
    $summary_row = $result_summary->fetch_assoc();
    $response['total_reports'] = (int) $summary_row['total_reports'];

    for ($i = 1; $i <= 6; $i++) {
        $response['summary']["zone{$i}"] = [
            'pass' => (int) $summary_row["zone{$i}_pass"],
            'fail' => (int) $summary_row["zone{$i}_fail"],
            'other' => (int) $summary_row["zone{$i}_other"]
        ];
    }
}


echo json_encode($response);
$conn->close();
?>