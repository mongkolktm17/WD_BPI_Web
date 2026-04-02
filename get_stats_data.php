<?php
require_once 'config.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$range = isset($_GET['range']) ? $_GET['range'] : 'week';
$sel_month = isset($_GET['month']) ? (int)$_GET['month'] : null;
$sel_year = isset($_GET['year']) ? (int)$_GET['year'] : null;

// Determine start and end dates based on range
$dates = [];
$group_format = "%Y-%m-%d";
$display_format = "D, d M";
$start_date = "";
$end_date = date('Y-m-d'); // Default to today

if ($range === 'week') {
    $start_date = date('Y-m-d', strtotime('-6 days'));
    // Generate last 7 days including today
    for ($i = 0; $i < 7; $i++) {
        $dates[] = date('Y-m-d', strtotime("-$i days"));
    }
    $dates = array_reverse($dates);
} elseif ($range === 'month') {
    if ($sel_month && $sel_year) {
        // Specific month
        $start_date = "$sel_year-" . str_pad($sel_month, 2, '0', STR_PAD_LEFT) . "-01";
        $days_in_month = cal_days_in_month(CAL_GREGORIAN, $sel_month, $sel_year);
        $end_date = "$sel_year-" . str_pad($sel_month, 2, '0', STR_PAD_LEFT) . "-$days_in_month";
        for ($i = 1; $i <= $days_in_month; $i++) {
            $dates[] = "$sel_year-" . str_pad($sel_month, 2, '0', STR_PAD_LEFT) . "-" . str_pad($i, 2, '0', STR_PAD_LEFT);
        }
    } else {
        // Default last 30 days
        $start_date = date('Y-m-d', strtotime('-29 days'));
        for ($i = 0; $i < 30; $i++) {
            $dates[] = date('Y-m-d', strtotime("-$i days"));
        }
        $dates = array_reverse($dates);
    }
} elseif ($range === 'year') {
    $group_format = "%Y-%m";
    $display_format = "M Y";
    $start_date = date('Y-m-01', strtotime('-11 months'));
    for ($i = 0; $i < 12; $i++) {
        $dates[] = date('Y-m', strtotime("-$i months"));
    }
    $dates = array_reverse($dates);
}

// Common filters for queries
$where_range_security = "created_at BETWEEN '$start_date 00:00:00' AND '$end_date 23:59:59'";
$where_range_parking = "r.created_at BETWEEN '$start_date 00:00:00' AND '$end_date 23:59:59'";
$where_range_cctv = "r.report_time BETWEEN '$start_date 00:00:00' AND '$end_date 23:59:59'";
$where_range_hh = "created_at BETWEEN '$start_date 00:00:00' AND '$end_date 23:59:59'";
$where_range_wt = "created_at BETWEEN '$start_date 00:00:00' AND '$end_date 23:59:59'";

// 1. Security Guard Counts
$sql_security = "
    SELECT 
        group_date,
        AVG(morning_shift) as avg_morning,
        AVG(evening_shift) as avg_evening
    FROM (
        SELECT 
            DATE_FORMAT(created_at, '$group_format') as group_date,
            morning_shift,
            evening_shift,
            ROW_NUMBER() OVER (
                PARTITION BY DATE_FORMAT(created_at, '$group_format') 
                ORDER BY created_at DESC
            ) as rn
        FROM security_guard_counts
        WHERE is_deleted = 0 AND $where_range_security
    ) t
    WHERE rn = 1
    GROUP BY group_date
    ORDER BY group_date ASC
";
$res_security = $conn->query($sql_security);
$security_data = [];
while ($row = $res_security->fetch_assoc()) {
    $security_data[$row['group_date']] = $row;
}

// 2. Parking Lot Counts (Site-wide Snapshot Logic)
// First, find all lot names to track
$lot_names_res = $conn->query("SELECT DISTINCT lot_name FROM parking_lot_counts");
$all_lots = [];
while ($l = $lot_names_res->fetch_row()) $all_lots[] = $l[0];

// Get initial state (last known counts before $start_date)
$parking_state = [];
foreach ($all_lots as $lot) $parking_state[$lot] = ['car' => 0, 'moto' => 0];

$sql_init_parking = "
    SELECT c.lot_name, c.vehicle_count, r.created_at
    FROM car_parking_reports r
    JOIN parking_lot_counts c ON r.id = c.report_id
    WHERE r.is_deleted = 0 AND r.created_at < '$start_date 00:00:00'
    AND r.id = (
        SELECT MAX(r2.id) 
        FROM car_parking_reports r2 
        JOIN parking_lot_counts c2 ON r2.id = c2.report_id 
        WHERE c2.lot_name = c.lot_name AND r2.is_deleted = 0 AND r2.created_at < '$start_date 00:00:00'
    )
";
$res_init_p = $conn->query($sql_init_parking);
if ($res_init_p) {
    while ($row = $res_init_p->fetch_assoc()) {
        $type = (strpos($row['lot_name'], 'ลานรถยนต์') !== false) ? 'car' : 'moto';
        $parking_state[$row['lot_name']][$type] = (int)$row['vehicle_count'];
    }
}

// Get all activity during the range
$sql_parking_activity = "
    SELECT 
        DATE_FORMAT(r.created_at, '$group_format') as group_date,
        c.lot_name,
        c.vehicle_count
    FROM car_parking_reports r
    JOIN parking_lot_counts c ON r.id = c.report_id
    WHERE r.is_deleted = 0 AND $where_range_parking
    ORDER BY r.created_at ASC
";
$res_p_activity = $conn->query($sql_parking_activity);
$parking_activity = [];
while ($row = $res_p_activity->fetch_assoc()) {
    $parking_activity[$row['group_date']][] = $row;
}

$parking_data = [];
foreach ($dates as $d) {
    if (isset($parking_activity[$d])) {
        foreach ($parking_activity[$d] as $act) {
            $type = (strpos($act['lot_name'], 'ลานรถยนต์') !== false) ? 'car' : 'moto';
            $parking_state[$act['lot_name']][$type] = (int)$act['vehicle_count'];
        }
    }
    
    $total_car = 0;
    $total_moto = 0;
    foreach ($parking_state as $lot => $vals) {
        $total_car += $vals['car'];
        $total_moto += $vals['moto'];
    }
    
    $parking_data[$d] = [
        'group_date' => $d,
        'avg_car' => $total_car, // Now actually SUM, but variable name kept for frontend compatibility
        'avg_moto' => $total_moto
    ];
}

// 3. CCTV Online Status (%) - Site-wide Snapshot Logic
$nvr_names_res = $conn->query("SELECT DISTINCT nvr_name FROM cctv_report_details");
$all_nvrs = [];
while ($n = $nvr_names_res->fetch_row()) $all_nvrs[] = $n[0];

$cctv_state = [];
foreach ($all_nvrs as $nvr) $cctv_state[$nvr] = ['online' => 0, 'total' => 0];

// Get initial state
$sql_init_cctv = "
    SELECT d.nvr_name, d.online_channels, d.total_channels
    FROM cctv_reports r
    JOIN cctv_report_details d ON r.id = d.report_id
    WHERE r.is_deleted = 0 AND r.report_time < '$start_date 00:00:00'
    AND d.id = (
        SELECT MAX(d2.id)
        FROM cctv_reports r2
        JOIN cctv_report_details d2 ON r2.id = d2.report_id
        WHERE d2.nvr_name = d.nvr_name AND r2.is_deleted = 0 AND r2.report_time < '$start_date 00:00:00'
    )
";
$res_init_c = $conn->query($sql_init_cctv);
if ($res_init_c) {
    while ($row = $res_init_c->fetch_assoc()) {
        $cctv_state[$row['nvr_name']] = [
            'online' => (int)$row['online_channels'],
            'total' => (int)$row['total_channels']
        ];
    }
}

// Get all activity
$sql_cctv_activity = "
    SELECT 
        DATE_FORMAT(r.report_time, '$group_format') as group_date,
        d.nvr_name,
        d.online_channels,
        d.total_channels
    FROM cctv_reports r
    JOIN cctv_report_details d ON r.id = d.report_id
    WHERE r.is_deleted = 0 AND $where_range_cctv
    ORDER BY r.report_time ASC
";
$res_c_activity = $conn->query($sql_cctv_activity);
$cctv_activity = [];
while ($row = $res_c_activity->fetch_assoc()) {
    $cctv_activity[$row['group_date']][] = $row;
}

$cctv_data = [];
foreach ($dates as $d) {
    if (isset($cctv_activity[$d])) {
        foreach ($cctv_activity[$d] as $act) {
            $cctv_state[$act['nvr_name']] = [
                'online' => (int)$act['online_channels'],
                'total' => (int)$act['total_channels']
            ];
        }
    }
    
    $total_online = 0;
    $total_channels = 0;
    foreach ($cctv_state as $nvr => $vals) {
        $total_online += $vals['online'];
        $total_channels += $vals['total'];
    }
    
    $avg_online = ($total_channels > 0) ? ($total_online * 100.0 / $total_channels) : 0;
    
    $cctv_data[$d] = [
        'group_date' => $d,
        'avg_online' => $avg_online
    ];
}

// 4. Hand Held Metal Detector (Pass Rate)
// NOTE: battery_status uses 'พร้อมใช้งาน', but led_status, detection_test_status, alarm_status use 'ผ่านการทดสอบ'
$sql_hh = "
    SELECT 
        group_date,
        SUM(is_pass) as pass_count,
        COUNT(*) as total_count
    FROM (
        SELECT 
            DATE_FORMAT(created_at, '$group_format') as group_date,
            CASE WHEN 
                battery_status = 'พร้อมใช้งาน' AND 
                led_status = 'ผ่านการทดสอบ' AND 
                detection_test_status = 'ผ่านการทดสอบ' AND 
                alarm_status = 'ผ่านการทดสอบ' 
            THEN 1 ELSE 0 END as is_pass,
            ROW_NUMBER() OVER (
                PARTITION BY building, guard_post, shift, DATE_FORMAT(created_at, '$group_format') 
                ORDER BY created_at DESC
            ) as rn
        FROM hand_held_checks
        WHERE is_deleted = 0 AND $where_range_hh
    ) t
    WHERE rn = 1
    GROUP BY group_date
    ORDER BY group_date ASC
";
$res_hh = $conn->query($sql_hh);
$hh_data = [];
while ($row = $res_hh->fetch_assoc()) {
    $hh_data[$row['group_date']] = $row;
}

// 5. Walkthrough Metal Detector (Pass Rate)
$sql_wt = "
    SELECT 
        group_date,
        SUM(is_pass) as pass_count,
        COUNT(*) as total_count
    FROM (
        SELECT 
            DATE_FORMAT(created_at, '$group_format') as group_date,
            CASE WHEN 
                zone1_status = 'พร้อมใช้งาน' AND 
                zone2_status = 'พร้อมใช้งาน' AND 
                zone3_status = 'พร้อมใช้งาน' AND 
                zone4_status = 'พร้อมใช้งาน' AND 
                zone5_status = 'พร้อมใช้งาน' AND 
                zone6_status = 'พร้อมใช้งาน' 
            THEN 1 ELSE 0 END as is_pass,
            ROW_NUMBER() OVER (
                PARTITION BY building, guard_post, shift, DATE_FORMAT(created_at, '$group_format') 
                ORDER BY created_at DESC
            ) as rn
        FROM metal_detector_checks
        WHERE is_deleted = 0 AND $where_range_wt
    ) t
    WHERE rn = 1
    GROUP BY group_date
    ORDER BY group_date ASC
";
$res_wt = $conn->query($sql_wt);
$wt_data = [];
while ($row = $res_wt->fetch_assoc()) {
    $wt_data[$row['group_date']] = $row;
}

// Populate datasets for EVERY date in the sequence
$labels = [];
$datasets = [
    'security_morning' => [],
    'security_evening' => [],
    'security_total' => [],
    'parking_car' => [],
    'parking_moto' => [],
    'cctv_online' => [],
    'hh_pass_rate' => [],
    'wt_pass_rate' => []
];

foreach ($dates as $date) {
    // Format label for display
    $labels[] = date($display_format, strtotime($date . ($range === 'year' ? '-01' : '')));
    
    // Security
    $morning = isset($security_data[$date]) ? round($security_data[$date]['avg_morning'], 1) : null;
    $evening = isset($security_data[$date]) ? round($security_data[$date]['avg_evening'], 1) : null;
    $datasets['security_morning'][] = $morning;
    $datasets['security_evening'][] = $evening;
    $datasets['security_total'][] = ($morning !== null || $evening !== null) 
        ? round(($morning ?? 0) + ($evening ?? 0), 1) : null;
    
    // Parking
    $datasets['parking_car'][] = isset($parking_data[$date]) ? round($parking_data[$date]['avg_car'], 1) : null;
    $datasets['parking_moto'][] = isset($parking_data[$date]) ? round($parking_data[$date]['avg_moto'], 1) : null;
    
    // CCTV
    $datasets['cctv_online'][] = (isset($cctv_data[$date]) && $cctv_data[$date]['avg_online'] !== null) ? round($cctv_data[$date]['avg_online'], 1) : null;
    
    // Metal Detectors
    $datasets['hh_pass_rate'][] = (isset($hh_data[$date]) && $hh_data[$date]['total_count'] > 0) 
        ? round(($hh_data[$date]['pass_count'] / $hh_data[$date]['total_count']) * 100, 1) : null;
        
    $datasets['wt_pass_rate'][] = (isset($wt_data[$date]) && $wt_data[$date]['total_count'] > 0) 
        ? round(($wt_data[$date]['pass_count'] / $wt_data[$date]['total_count']) * 100, 1) : null;
}

echo json_encode([
    'labels' => $labels,
    'datasets' => $datasets
]);
