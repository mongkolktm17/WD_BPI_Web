<?php
header('Content-Type: application/json');
require_once 'config.php';

// --- Caching Logic ---
$cache_dir = __DIR__ . '/cache';
$cache_ttl = 60; // 1 minute for dashboard
$cache_key = "dashboard_walkthrough_status";
$cache_file = "$cache_dir/$cache_key.json";

if (!is_dir($cache_dir)) {
    mkdir($cache_dir, 0755, true);
}

if (file_exists($cache_file) && (time() - filemtime($cache_file) < $cache_ttl)) {
    echo file_get_contents($cache_file);
    exit;
}

ob_start(); // Start capturing output for cache

$response = [
    'zones' => [],
    'online_count' => 0,
    'offline_count' => 0,
    'maintenance_count' => 0,
    'last_update' => null,
    'total_reports' => 0,
    'summary' => []
];

// 1. Get the absolute latest report for status indicators
$sql = "SELECT zone1_status, zone2_status, zone3_status, zone4_status, zone5_status, zone6_status, created_at 
        FROM metal_detector_checks 
        WHERE is_deleted = 0 
        ORDER BY inspection_date DESC, created_at DESC 
        LIMIT 1";
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
        $response['zones'][$i] = ['status' => $status, 'type' => $type];
    }
}

// 2. Optimized Summary Query using JOIN instead of correlated subquery
$sql_summary = "SELECT 
    COUNT(*) as total_reports";

for ($i = 1; $i <= 6; $i++) {
    $sql_summary .= ",
    SUM(CASE WHEN zone{$i}_status = 'พร้อมใช้งาน' THEN 1 ELSE 0 END) as zone{$i}_pass,
    SUM(CASE WHEN zone{$i}_status = 'ไม่พร้อมใช้งาน' THEN 1 ELSE 0 END) as zone{$i}_fail,
    SUM(CASE WHEN zone{$i}_status = 'อื่นๆ' THEN 1 ELSE 0 END) as zone{$i}_other";
}

$sql_summary .= " FROM (
    SELECT m1.* FROM metal_detector_checks m1
    JOIN (
        SELECT guard_post, MAX(id) as max_id
        FROM metal_detector_checks
        WHERE is_deleted = 0
        GROUP BY guard_post
    ) m2 ON m1.id = m2.max_id
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

$output = json_encode($response);
echo $output;

// Save to cache
file_put_contents($cache_file, $output);

$conn->close();
ob_end_flush();
?>