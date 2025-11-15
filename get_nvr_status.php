<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$response = ['buildings' => [], 'last_update' => null];

// Detect time column
$time_col = 'report_time';
$check = $conn->query("SHOW COLUMNS FROM cctv_reports LIKE 'report_time'");
if (!$check || $check->num_rows === 0) {
    $time_col = 'created_at';
}

// Get latest report per building
$latest_sql = "SELECT building, MAX($time_col) AS latest_time
               FROM cctv_reports
               GROUP BY building";
$latest_res = $conn->query($latest_sql);
$latest_reports = [];
if ($latest_res) {
    while ($row = $latest_res->fetch_assoc()) {
        $latest_reports[$row['building']] = $row['latest_time'];
    }
}

$last = null;

// Expected NVR counts per building (based on actual setup)
$expectedNvrCounts = [
    'B.2' => 10,
    'B.3' => 2,
    'B.4' => 6,
    'B.8' => 1
];

$total_expected_nvrs = array_sum($expectedNvrCounts);

// Aggregate data per building from latest reports
foreach ($latest_reports as $building => $report_time) {
    // Get all NVR details from the latest report for this building
    $detail_sql = "SELECT d.nvr_name, d.online_channels
                   FROM cctv_reports cr
                   JOIN cctv_report_details d ON cr.id = d.report_id
                   WHERE cr.building = ? AND cr.$time_col = ?";
    $stmt = $conn->prepare($detail_sql);
    $stmt->bind_param('ss', $building, $report_time);
    $stmt->execute();
    $detail_res = $stmt->get_result();
    
    $online_sum = 0;
    $nvr_pass_count = 0;
    $nvr_data = [];
    
    while ($row = $detail_res->fetch_assoc()) {
        $online_days = (int)$row['online_channels'];
        $nvr_name = $row['nvr_name'];
        $online_sum += $online_days;
        $nvr_data[$nvr_name] = $online_days;
        
        // Count NVRs that meet the target (≥62 days)
        if ($online_days >= 62) {
            $nvr_pass_count++;
        }
    }
    $stmt->close();
    
    // Get expected NVR count for this building (from config, not from DB)
    $expected_nvr_count = isset($expectedNvrCounts[$building]) ? $expectedNvrCounts[$building] : 0;
    
    // Calculate fail count based on submitted data
    $nvr_fail_count = max(0, count($nvr_data) - $nvr_pass_count);
    
    // Get total channels for the building
    $total = 0;
    $total_stmt = $conn->prepare("SELECT SUM(channels) AS device_total FROM cctv_devices WHERE building = ?");
    if ($total_stmt) {
        $total_stmt->bind_param('s', $building);
        $total_stmt->execute();
        $total_tmp = $total_stmt->get_result()->fetch_assoc();
        $total = isset($total_tmp['device_total']) ? (int)$total_tmp['device_total'] : 0;
        $total_stmt->close();
    }
    
    $offline = max(0, $total - $online_sum);
    $percent = $total > 0 ? round(($online_sum / $total) * 100, 1) : 0;
    $percent = max(0, min(100, $percent));
    
    if (!$last || strtotime($report_time) > strtotime($last)) {
        $last = $report_time;
    }
    
    $response['buildings'][$building] = [
        'total' => $total,
        'online' => $online_sum,
        'offline' => $offline,
        'percent' => $percent,
        'last_update' => $report_time,
        'nvr_count' => $expected_nvr_count,
        'nvr_pass_count' => $nvr_pass_count,
        'nvr_fail_count' => $nvr_fail_count,
        'nvr_submitted_count' => count($nvr_data)
    ];
}

$response['last_update'] = $last;
$response['total_expected_nvrs'] = $total_expected_nvrs;
$conn->close();

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>