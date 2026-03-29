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
        DATE_FORMAT(created_at, '$group_format') as group_date,
        AVG(morning_shift) as avg_morning,
        AVG(evening_shift) as avg_evening
    FROM security_guard_counts
    WHERE $where_range_security
    GROUP BY group_date
    ORDER BY group_date ASC
";
$res_security = $conn->query($sql_security);
$security_data = [];
while ($row = $res_security->fetch_assoc()) {
    $security_data[$row['group_date']] = $row;
}

// 2. Parking Lot Counts
$sql_parking = "
    SELECT 
        DATE_FORMAT(r.created_at, '$group_format') as group_date,
        AVG(CASE WHEN c.lot_name LIKE 'ลานรถยนต์%' THEN c.vehicle_count ELSE NULL END) as avg_car,
        AVG(CASE WHEN c.lot_name LIKE 'ลานจอด%' THEN c.vehicle_count ELSE NULL END) as avg_moto
    FROM car_parking_reports r
    JOIN parking_lot_counts c ON r.id = c.report_id
    WHERE $where_range_parking
    GROUP BY group_date
    ORDER BY group_date ASC
";
$res_parking = $conn->query($sql_parking);
$parking_data = [];
if ($res_parking) {
    while ($row = $res_parking->fetch_assoc()) {
        $parking_data[$row['group_date']] = $row;
    }
}

// 3. CCTV Online Status (%)
$sql_cctv = "
    SELECT 
        DATE_FORMAT(r.report_time, '$group_format') as group_date,
        SUM(d.online_channels) * 100.0 / NULLIF(SUM(d.total_channels), 0) as avg_online
    FROM cctv_reports r
    JOIN cctv_report_details d ON r.id = d.report_id
    WHERE $where_range_cctv
    GROUP BY group_date
    ORDER BY group_date ASC
";
$res_cctv = $conn->query($sql_cctv);
$cctv_data = [];
if ($res_cctv) {
    while ($row = $res_cctv->fetch_assoc()) {
        $cctv_data[$row['group_date']] = $row;
    }
}

// 4. Hand Held Metal Detector (Pass Rate)
// NOTE: battery_status uses 'พร้อมใช้งาน', but led_status, detection_test_status, alarm_status use 'ผ่านการทดสอบ'
$sql_hh = "
    SELECT 
        DATE_FORMAT(created_at, '$group_format') as group_date,
        SUM(CASE WHEN 
            battery_status = 'พร้อมใช้งาน' AND 
            led_status = 'ผ่านการทดสอบ' AND 
            detection_test_status = 'ผ่านการทดสอบ' AND 
            alarm_status = 'ผ่านการทดสอบ' 
        THEN 1 ELSE 0 END) as pass_count,
        COUNT(*) as total_count
    FROM hand_held_checks
    WHERE $where_range_hh
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
        DATE_FORMAT(created_at, '$group_format') as group_date,
        SUM(CASE WHEN 
            zone1_status = 'พร้อมใช้งาน' AND 
            zone2_status = 'พร้อมใช้งาน' AND 
            zone3_status = 'พร้อมใช้งาน' AND 
            zone4_status = 'พร้อมใช้งาน' AND 
            zone5_status = 'พร้อมใช้งาน' AND 
            zone6_status = 'พร้อมใช้งาน' 
        THEN 1 ELSE 0 END) as pass_count,
        COUNT(*) as total_count
    FROM metal_detector_checks
    WHERE $where_range_wt
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
