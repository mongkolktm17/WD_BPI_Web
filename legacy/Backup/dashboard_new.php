<?php
require_once 'config.php';
require_once 'check_permissions.php';

// 1. Security Personnel Status
function get_security_personnel_status($conn)
{
    $sql = "SELECT morning_shift, morning_shift_contract, evening_shift, evening_shift_contract FROM security_guard_counts ORDER BY record_date DESC, created_at DESC LIMIT 1";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return ['morning_shift' => 0, 'morning_shift_contract' => null, 'evening_shift' => 0, 'evening_shift_contract' => null];
}

// 2. NVR Recording Status
function get_nvr_recording_status($conn)
{
    $sql = "SELECT building, nvr_name, target_days FROM cctv_devices";
    $devices_result = $conn->query($sql);
    $buildings = [];

    while ($device = $devices_result->fetch_assoc()) {
        $building_name = $device['building'];
        if (!isset($buildings[$building_name])) {
            $buildings[$building_name] = ['pass' => 0, 'below' => 0, 'total' => 0];
        }
        $buildings[$building_name]['total']++;

        $sql_latest_report = "SELECT online_channels FROM cctv_report_details 
                              WHERE nvr_name = ? 
                              ORDER BY id DESC LIMIT 1";
        $stmt = $conn->prepare($sql_latest_report);
        $stmt->bind_param("s", $device['nvr_name']);
        $stmt->execute();
        $report_result = $stmt->get_result();

        if ($report_result && $report_result->num_rows > 0) {
            $report = $report_result->fetch_assoc();
            if ($report['online_channels'] >= $device['target_days']) {
                $buildings[$building_name]['pass']++;
            } else {
                $buildings[$building_name]['below']++;
            }
        } else {
            $buildings[$building_name]['below']++; // Assume below standard if no report
        }
        $stmt->close();
    }
    return $buildings;
}

// 3. Camera Online Status
function get_camera_online_status($conn)
{
    $sql = "SELECT building, nvr_name, channels FROM cctv_devices ORDER BY building, nvr_name";
    $devices_result = $conn->query($sql);
    $buildings = [];

    while ($device = $devices_result->fetch_assoc()) {
        $building_name = $device['building'];
        if (!isset($buildings[$building_name])) {
            $buildings[$building_name] = [];
        }

        $sql_latest_report = "SELECT online_channels FROM cctv_report_details 
                              WHERE nvr_name = ? 
                              ORDER BY id DESC LIMIT 1";
        $stmt = $conn->prepare($sql_latest_report);
        $stmt->bind_param("s", $device['nvr_name']);
        $stmt->execute();
        $report_result = $stmt->get_result();

        $online_channels = 0;
        if ($report_result && $report_result->num_rows > 0) {
            $report = $report_result->fetch_assoc();
            $online_channels = $report['online_channels'];
        }
        $stmt->close();

        $buildings[$building_name][] = [
            'name' => $device['nvr_name'],
            'online' => $online_channels,
            'total' => $device['channels']
        ];
    }
    return $buildings;
}


// 4. Parking Lot Report
function get_parking_lot_report($conn)
{
    $report = ['car_total' => 0, 'car_occupied' => 0, 'motorcycle_total' => 0, 'motorcycle_occupied' => 0, 'lots' => []];

    $sql_latest_report = "SELECT id FROM car_parking_reports ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
    $latest_result = $conn->query($sql_latest_report);

    if ($latest_result && $latest_result->num_rows > 0) {
        $latest_report_id = $latest_result->fetch_assoc()['id'];

        $sql_counts = "SELECT lot_name, vehicle_type, vehicle_count FROM parking_lot_counts WHERE report_id = ?";
        $stmt = $conn->prepare($sql_counts);
        $stmt->bind_param("i", $latest_report_id);
        $stmt->execute();
        $counts_result = $stmt->get_result();

        $lot_capacities = [
            'car' => [
                "ลานรถยนต์ 1 (97 Slot)" => 97,
                "ลานรถยนต์ 2 (114 Slot)" => 114,
                "ลานรถยนต์ 3/1 (100 Slot)" => 100,
                "ลานรถยนต์ 3/2 (264 Slot)" => 264,
                "ลานรถยนต์ 4 (415 Slot)" => 415,
                "ลานรถยนต์ 5 (53 Slot)" => 53,
                "ลานรถยนต์ B.8 (44 Slot)" => 44
            ],
            'motorcycle' => [
                "ลานจอด 1 (296 Slot)" => 296,
                "ลานจอด 2 (210 Slot)" => 210,
                "ลานจอด 3/1 (251 Slot)" => 251
            ]
        ];

        foreach ($lot_capacities['car'] as $lot_name => $capacity) {
            $report['car_total'] += $capacity;
            $report['lots']['car'][$lot_name] = ['occupied' => 0, 'total' => $capacity];
        }
        foreach ($lot_capacities['motorcycle'] as $lot_name => $capacity) {
            $report['motorcycle_total'] += $capacity;
            $report['lots']['motorcycle'][$lot_name] = ['occupied' => 0, 'total' => $capacity];
        }

        while ($row = $counts_result->fetch_assoc()) {
            if ($row['vehicle_type'] === 'car') {
                $report['car_occupied'] += $row['vehicle_count'];
                if (isset($report['lots']['car'][$row['lot_name']])) {
                    $report['lots']['car'][$row['lot_name']]['occupied'] = $row['vehicle_count'];
                }
            } elseif ($row['vehicle_type'] === 'motorcycle') {
                $report['motorcycle_occupied'] += $row['vehicle_count'];
                if (isset($report['lots']['motorcycle'][$row['lot_name']])) {
                    $report['lots']['motorcycle'][$row['lot_name']]['occupied'] = $row['vehicle_count'];
                }
            }
        }
        $stmt->close();
    }
    return $report;
}

// 5. Hand Held Metal Detector Status
function get_hand_held_status($conn)
{
    $status = [
        'Battery Check' => false,
        'LED Power' => false,
        'Detection Range' => false,
        'Audio Alert' => false
    ];
    $sql = "SELECT battery_status, led_status, detection_test_status, alarm_status 
            FROM hand_held_checks ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $status['Battery Check'] = in_array($row['battery_status'], ['พร้อมใช้งาน', 'ผ่านการทดสอบ']);
        $status['LED Power'] = in_array($row['led_status'], ['พร้อมใช้งาน', 'ผ่านการทดสอบ']);
        $status['Detection Range'] = in_array($row['detection_test_status'], ['พร้อมใช้งาน', 'ผ่านการทดสอบ']);
        $status['Audio Alert'] = in_array($row['alarm_status'], ['พร้อมใช้งาน', 'ผ่านการทดสอบ']);
    }
    return $status;
}

// 6. Walkthrough Metal Detector Status
function get_walkthrough_status($conn)
{
    $status = [];
    $sql = "SELECT zone1_status, zone2_status, zone3_status, zone4_status, zone5_status, zone6_status 
            FROM metal_detector_checks ORDER BY inspection_date DESC, created_at DESC LIMIT 1";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        for ($i = 1; $i <= 6; $i++) {
            $status['Zone ' . $i] = $row['zone' . $i . '_status'];
        }
    }
    return $status;
}


// Fetch all data for the dashboard
$security_status = get_security_personnel_status($conn);
$nvr_status = get_nvr_recording_status($conn);
$camera_status = get_camera_online_status($conn);
$parking_report = get_parking_lot_report($conn);
$hand_held_status = get_hand_held_status($conn);
$walkthrough_status = get_walkthrough_status($conn);

?>
<!doctype html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WD Security Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="/_sdk/element_sdk.js"></script>
    <style>
        body {
            box-sizing: border-box;
        }

        .gradient-bg {
            background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
        }

        .card-shadow {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .pulse-animation {
            animation: pulse 2s infinite;
        }

        @keyframes pulse {

            0%,
            100% {
                opacity: 1;
            }

            50% {
                opacity: 0.7;
            }
        }

        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
        }

        .status-online {
            background-color: #10b981;
        }

        .status-offline {
            background-color: #ef4444;
        }

        .status-warning {
            background-color: #f59e0b;
        }
    </style>
    <style>
        @view-transition {
            navigation: auto;
        }
    </style>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="/_sdk/data_sdk.js" type="text/javascript"></script>
</head>

<body class="gradient-bg min-h-full">
    <div class="container mx-auto px-4 py-6"><!-- Header -->
        <header class="text-center mb-8">
            <h1 id="dashboard-title" class="text-4xl font-bold text-blue-900 mb-2">Security System Dashboard</h1>
            <h2 id="company-name" class="text-2xl text-blue-700">Western Digital Factory</h2>
            <div class="mt-4 text-blue-600"><span id="current-time" class="text-lg font-medium"></span>
            </div>
        </header><!-- Security Personnel Section -->
        <section class="mb-8">
            <h3 id="security-section-title" class="text-2xl font-bold text-blue-900 mb-4">Security Personnel Status</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white rounded-lg p-6 card-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-lg font-semibold text-blue-800 flex items-center">
                                <svg class="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewbox="0 0 20 20">
                                    <path fill-rule="evenodd"
                                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                                        clip-rule="evenodd"></path>
                                </svg> Day Shift
                            </h4>
                            <p class="text-3xl font-bold text-blue-600">
                                <?php echo htmlspecialchars($security_status['morning_shift']); ?>
                                <?php if (!empty($security_status['morning_shift_contract'])): ?>
                                    <span class="text-xl">/
                                        <?php echo htmlspecialchars($security_status['morning_shift_contract']); ?></span>
                                <?php endif; ?>
                            </p>
                            <?php if (!empty($security_status['morning_shift_contract'])): ?>
                                <p class="text-xs text-gray-500">Actual / Contract</p>
                            <?php endif; ?>
                            <p class="text-sm text-gray-600">06:00 - 18:00</p>
                        </div>
                        <div class="text-blue-400">
                            <svg class="w-12 h-12" fill="currentColor" viewbox="0 0 20 20">
                                <path
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                                </path>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-6 card-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-lg font-semibold text-blue-800 flex items-center">
                                <svg class="w-5 h-5 mr-2 text-indigo-600" fill="currentColor" viewbox="0 0 20 20">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                                </svg> Night Shift
                            </h4>
                            <p class="text-3xl font-bold text-blue-600">
                                <?php echo htmlspecialchars($security_status['evening_shift']); ?>
                                <?php if (!empty($security_status['evening_shift_contract'])): ?>
                                    <span class="text-xl">/
                                        <?php echo htmlspecialchars($security_status['evening_shift_contract']); ?></span>
                                <?php endif; ?>
                            </p>
                            <?php if (!empty($security_status['evening_shift_contract'])): ?>
                                <p class="text-xs text-gray-500">Actual / Contract</p>
                            <?php endif; ?>
                            <p class="text-sm text-gray-600">18:00 - 06:00</p>
                        </div>
                        <div class="text-blue-400">
                            <svg class="w-12 h-12" fill="currentColor" viewbox="0 0 20 20">
                                <path
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                                </path>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-6 card-shadow border-2 border-blue-300">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-lg font-semibold text-blue-800">Current Active</h4>
                            <p class="text-3xl font-bold text-blue-600" id="current-shift-count">
                                <?php
                                $current_hour = date('G');
                                if ($current_hour >= 6 && $current_hour < 18) {
                                    echo htmlspecialchars($security_status['morning_shift']);
                                    if (!empty($security_status['morning_shift_contract'])) {
                                        echo ' <span class="text-xl">/ ' . htmlspecialchars($security_status['morning_shift_contract']) . '</span>';
                                    }
                                } else {
                                    echo htmlspecialchars($security_status['evening_shift']);
                                    if (!empty($security_status['evening_shift_contract'])) {
                                        echo ' <span class="text-xl">/ ' . htmlspecialchars($security_status['evening_shift_contract']) . '</span>';
                                    }
                                }
                                ?>
                            </p>
                            <?php
                            $has_contract = ($current_hour >= 6 && $current_hour < 18)
                                ? !empty($security_status['morning_shift_contract'])
                                : !empty($security_status['evening_shift_contract']);
                            if ($has_contract):
                                ?>
                                <p class="text-xs text-gray-500 mt-1">Actual / Contract</p>
                            <?php endif; ?>
                            <p class="text-sm font-medium" id="current-shift-status">
                                <?php
                                if ($current_hour >= 6 && $current_hour < 18) {
                                    echo 'Day Shift Active';
                                } else {
                                    echo 'Night Shift Active';
                                }
                                ?>
                            </p>
                            <p class="text-xs text-gray-500 mt-1" id="shift-change-time">
                                <?php
                                if ($current_hour >= 6 && $current_hour < 18) {
                                    echo 'Next change: 18:00';
                                } else {
                                    echo 'Next change: 06:00';
                                }
                                ?>
                            </p>
                        </div>
                        <div class="text-green-500">
                            <svg class="w-12 h-12" fill="currentColor" viewbox="0 0 20 20">
                                <path
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                                </path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </section><!-- NVR Status Section -->
        <section class="mb-8">
            <h3 id="nvr-section-title" class="text-2xl font-bold text-blue-900 mb-4">NVR Recording Status</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <?php foreach ($nvr_status as $building_name => $stats): ?>
                    <?php
                    $total = $stats['total'];
                    $pass = $stats['pass'];
                    $below = $stats['below'];
                    $pass_percentage = $total > 0 ? round(($pass / $total) * 100) : 0;
                    ?>
                    <div class="bg-white rounded-lg p-6 card-shadow">
                        <h4 class="text-lg font-semibold text-blue-800 mb-4">Building
                            <?php echo htmlspecialchars($building_name); ?></h4>
                        <div class="mb-4">
                            <div class="flex justify-between text-sm mb-2">
                                <span class="text-gray-600">Pass Standard</span>
                                <span class="font-semibold"><?php echo $pass; ?>/<?php echo $total; ?>
                                    (<?php echo $pass_percentage; ?>%)</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-3">
                                <div class="bg-green-500 h-3 rounded-full" style="width: <?php echo $pass_percentage; ?>%">
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div class="text-center p-2 bg-green-50 rounded">
                                <div class="text-green-600 font-bold">
                                    <?php echo $pass; ?>
                                </div>
                                <div class="text-green-700 text-xs">
                                    Pass
                                </div>
                            </div>
                            <div class="text-center p-2 bg-red-50 rounded">
                                <div class="text-red-600 font-bold">
                                    <?php echo $below; ?>
                                </div>
                                <div class="text-red-700 text-xs">
                                    Below
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
                <?php if (empty($nvr_status)): ?>
                    <p class="text-center text-gray-500 col-span-full">No NVR recording data available.</p>
                <?php endif; ?>
            </div>
        </section><!-- Camera Status Section -->
        <section class="mb-8">
            <h3 id="camera-section-title" class="text-2xl font-bold text-blue-900 mb-4">Camera Online Status</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <?php foreach ($camera_status as $building_name => $nvrs): ?>
                    <div class="bg-white rounded-lg p-6 card-shadow">
                        <h4 class="text-xl font-semibold text-blue-800 mb-4">Building
                            <?php echo htmlspecialchars($building_name); ?></h4>
                        <div class="space-y-4">
                            <?php if (empty($nvrs)): ?>
                                <p class="text-center text-gray-500">No NVRs found for this building.</p>
                            <?php else: ?>
                                <?php foreach ($nvrs as $nvr): ?>
                                    <?php
                                    $online = $nvr['online'];
                                    $total = $nvr['total'];
                                    $percentage = $total > 0 ? round(($online / $total) * 100) : 0;
                                    $progress_color = 'bg-green-500';
                                    if ($percentage < 95)
                                        $progress_color = 'bg-yellow-500';
                                    if ($percentage < 80)
                                        $progress_color = 'bg-red-500';
                                    ?>
                                    <div class="p-3 bg-blue-50 rounded">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="font-medium"><?php echo htmlspecialchars($nvr['name']); ?></span>
                                            <span class="text-sm font-semibold"><?php echo $online; ?>/<?php echo $total; ?>
                                                (<?php echo $percentage; ?>%)</span>
                                        </div>
                                        <div class="w-full bg-gray-200 rounded-full h-2">
                                            <div class="<?php echo $progress_color; ?> h-2 rounded-full"
                                                style="width: <?php echo $percentage; ?>%"></div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
                <?php if (empty($camera_status)): ?>
                    <p class="text-center text-gray-500 col-span-full">No camera status data available.</p>
                <?php endif; ?>
            </div>
        </section><!-- Parking Report Section -->
        <section class="mb-8">
            <h3 id="parking-section-title" class="text-2xl font-bold text-blue-900 mb-4">Parking Lot Report</h3>
            <!-- Total Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white card-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-xl font-semibold mb-2 flex items-center">
                                <svg class="w-8 h-8 mr-3" fill="currentColor" viewbox="0 0 20 20">
                                    <path fill-rule="evenodd"
                                        d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z"
                                        clip-rule="evenodd"></path>
                                </svg> Car Parking Total
                            </h4>
                            <div class="text-3xl font-bold">
                                <?php echo $parking_report['car_occupied']; ?>/<?php echo $parking_report['car_total']; ?>
                            </div>
                            <div class="text-blue-100 text-sm">
                                <?php echo $parking_report['car_total'] > 0 ? round(($parking_report['car_occupied'] / $parking_report['car_total']) * 100) : 0; ?>%
                                Occupied
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <svg class="w-10 h-10" fill="currentColor" viewbox="0 0 20 20">
                                    <path fill-rule="evenodd"
                                        d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z"
                                        clip-rule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white card-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-xl font-semibold mb-2 flex items-center">
                                <svg class="w-8 h-8 mr-3" fill="currentColor" viewbox="0 0 20 20">
                                    <path
                                        d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z">
                                    </path>
                                </svg> Motorcycle Parking Total
                            </h4>
                            <div class="text-3xl font-bold">
                                <?php echo $parking_report['motorcycle_occupied']; ?>/<?php echo $parking_report['motorcycle_total']; ?>
                            </div>
                            <div class="text-green-100 text-sm">
                                <?php echo $parking_report['motorcycle_total'] > 0 ? round(($parking_report['motorcycle_occupied'] / $parking_report['motorcycle_total']) * 100) : 0; ?>%
                                Occupied
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <svg class="w-10 h-10" fill="currentColor" viewbox="0 0 20 20">
                                    <path
                                        d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z">
                                    </path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><!-- Car Parking -->
                <div class="bg-white rounded-lg p-6 card-shadow">
                    <h4 class="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2" fill="currentColor" viewbox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z"
                                clip-rule="evenodd"></path>
                        </svg> Car Parking Areas
                    </h4>
                    <div class="space-y-4">
                        <?php if (isset($parking_report['lots']['car']) && !empty($parking_report['lots']['car'])): ?>
                            <?php foreach ($parking_report['lots']['car'] as $lot_name => $lot_data): ?>
                                <?php
                                $occupied = $lot_data['occupied'];
                                $total = $lot_data['total'];
                                $percentage = $total > 0 ? round(($occupied / $total) * 100) : 0;
                                ?>
                                <div class="p-3 bg-blue-50 rounded">
                                    <div class="flex justify-between items-center mb-2">
                                        <span
                                            class="font-medium"><?php echo htmlspecialchars(str_replace(" (", "<br>(", $lot_name)); ?></span>
                                        <span class="text-sm font-semibold"><?php echo $occupied; ?>/<?php echo $total; ?>
                                            (<?php echo $percentage; ?>%)</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2">
                                        <div class="bg-green-500 h-2 rounded-full" style="width: <?php echo $percentage; ?>%">
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <p class="text-center text-gray-500">No car parking data available.</p>
                        <?php endif; ?>
                    </div>
                </div><!-- Motorcycle Parking -->
                <div class="bg-white rounded-lg p-6 card-shadow">
                    <h4 class="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2" fill="currentColor" viewbox="0 0 20 20">
                            <path
                                d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z">
                            </path>
                        </svg> Motorcycle Parking Areas
                    </h4>
                    <div class="space-y-4">
                        <?php if (isset($parking_report['lots']['motorcycle']) && !empty($parking_report['lots']['motorcycle'])): ?>
                            <?php foreach ($parking_report['lots']['motorcycle'] as $lot_name => $lot_data): ?>
                                <?php
                                $occupied = $lot_data['occupied'];
                                $total = $lot_data['total'];
                                $percentage = $total > 0 ? round(($occupied / $total) * 100) : 0;
                                $progress_color = $percentage > 79 ? 'bg-orange-500' : 'bg-green-500';
                                ?>
                                <div class="p-3 bg-blue-50 rounded">
                                    <div class="flex justify-between items-center mb-2">
                                        <span
                                            class="font-medium"><?php echo htmlspecialchars(str_replace(" (", "<br>(", $lot_name)); ?></span>
                                        <span class="text-sm font-semibold"><?php echo $occupied; ?>/<?php echo $total; ?>
                                            (<?php echo $percentage; ?>%)</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2">
                                        <div class="<?php echo $progress_color; ?> h-2 rounded-full"
                                            style="width: <?php echo $percentage; ?>%"></div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <p class="text-center text-gray-500">No motorcycle parking data available.</p>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </section><!-- Metal Detector Status Section -->
        <section class="mb-8">
            <h3 id="detector-section-title" class="text-2xl font-bold text-blue-900 mb-4">Hand Held Metal Detector
                Status</h3>
            <div class="bg-white rounded-lg p-6 card-shadow">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <?php if (empty($hand_held_status)): ?>
                        <p class="text-center text-gray-500 col-span-full">No hand held status data available.</p>
                    <?php else: ?>
                        <?php foreach ($hand_held_status as $check_name => $is_ok): ?>
                            <?php
                            $card_bg = $is_ok ? 'bg-green-50' : 'bg-red-50';
                            $border_color = $is_ok ? 'border-green-200' : 'border-red-200';
                            $icon_bg = $is_ok ? 'bg-green-500' : 'bg-red-500';
                            $text_color = $is_ok ? 'text-green-800' : 'text-red-800';
                            $subtext_color = $is_ok ? 'text-green-600' : 'text-red-600';
                            $status_text = $is_ok ? 'Checked OK' : 'Issue Detected';
                            $icon_svg = $is_ok
                                ? '<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>'
                                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
                            ?>
                            <div
                                class="text-center p-4 <?php echo $card_bg; ?> rounded-lg border-2 <?php echo $border_color; ?>">
                                <div
                                    class="w-16 h-16 mx-auto mb-3 <?php echo $icon_bg; ?> rounded-full flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="<?php echo $is_ok ? 'currentColor' : 'none'; ?>"
                                        stroke="<?php echo $is_ok ? 'none' : 'currentColor'; ?>"
                                        viewbox="0 0 20 20"><?php echo $icon_svg; ?>
                                    </svg>
                                </div>
                                <h4 class="font-semibold <?php echo $text_color; ?>">
                                    <?php echo htmlspecialchars($check_name); ?></h4>
                                <p class="text-sm <?php echo $subtext_color; ?> mt-1"><?php echo $status_text; ?></p>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div><!-- Test Results -->
                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 class="font-semibold text-blue-800 mb-3">Latest Test Results</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div class="flex justify-between"><span class="text-gray-600">Metal Detection:</span> <span
                                class="text-green-600 font-semibold">✓ Red LED + Sound</span>
                        </div>
                        <div class="flex justify-between"><span class="text-gray-600">Last Calibration:</span> <span
                                class="text-blue-600 font-semibold">Today 06:00</span>
                        </div>
                        <div class="flex justify-between"><span class="text-gray-600">Next Check:</span> <span
                                class="text-blue-600 font-semibold">Tomorrow 06:00</span>
                        </div>
                    </div>
                </div>
            </div>
        </section><!-- Walkthrough Metal Detector Section -->
        <section class="mb-8">
            <h3 id="walkthrough-section-title" class="text-2xl font-bold text-blue-900 mb-4">Walkthrough Metal Detector
                Status</h3>
            <div class="bg-white rounded-lg p-6 card-shadow">
                <?php
                $zone_counts = ['Online' => 0, 'Maintenance' => 0, 'Offline' => 0];
                if (!empty($walkthrough_status)) {
                    foreach ($walkthrough_status as $status) {
                        if ($status === 'พร้อมใช้งาน') {
                            $zone_counts['Online']++;
                        } elseif ($status === 'อื่นๆ') {
                            $zone_counts['Maintenance']++;
                        } else {
                            $zone_counts['Offline']++;
                        }
                    }
                }
                $total_zones = count($walkthrough_status);
                $operational_percentage = $total_zones > 0 ? round(($zone_counts['Online'] / $total_zones) * 100) : 0;
                ?>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <?php if (empty($walkthrough_status)): ?>
                        <p class="text-center text-gray-500 col-span-full">No walkthrough status data available.</p>
                    <?php else: ?>
                        <?php foreach ($walkthrough_status as $zone_name => $status): ?>
                            <?php
                            $status_map = [
                                'พร้อมใช้งาน' => ['class' => 'online', 'text' => 'Online', 'card_bg' => 'bg-green-50', 'border' => 'border-green-200', 'text_color' => 'text-green-600'],
                                'ไม่พร้อมใช้งาน' => ['class' => 'offline', 'text' => 'Offline', 'card_bg' => 'bg-red-50', 'border' => 'border-red-200', 'text_color' => 'text-red-600'],
                                'อื่นๆ' => ['class' => 'warning', 'text' => 'Maintenance', 'card_bg' => 'bg-yellow-50', 'border' => 'border-yellow-200', 'text_color' => 'text-yellow-600']
                            ];
                            $current_status = $status_map[$status] ?? $status_map['ไม่พร้อมใช้งาน'];
                            ?>
                            <div
                                class="text-center p-4 <?php echo $current_status['card_bg']; ?> rounded-lg border-2 <?php echo $current_status['border']; ?>">
                                <h4 class="text-lg font-semibold text-blue-800 mb-2"><?php echo htmlspecialchars($zone_name); ?>
                                </h4>
                                <div class="flex items-center justify-center"><span
                                        class="status-indicator status-<?php echo $current_status['class']; ?>"></span> <span
                                        class="<?php echo $current_status['text_color']; ?> font-semibold text-sm"><?php echo $current_status['text']; ?></span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div><!-- Summary -->
                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div class="p-3 bg-green-50 rounded-lg">
                            <div class="text-xl font-bold text-green-600">
                                <?php echo $zone_counts['Online']; ?>
                            </div>
                            <div class="text-sm text-green-700">
                                Online
                            </div>
                        </div>
                        <div class="p-3 bg-yellow-50 rounded-lg">
                            <div class="text-xl font-bold text-yellow-600">
                                <?php echo $zone_counts['Maintenance']; ?>
                            </div>
                            <div class="text-sm text-yellow-700">
                                Maintenance
                            </div>
                        </div>
                        <div class="p-3 bg-red-50 rounded-lg">
                            <div class="text-xl font-bold text-red-600">
                                <?php echo $zone_counts['Offline']; ?>
                            </div>
                            <div class="text-sm text-red-700">
                                Offline
                            </div>
                        </div>
                        <div class="p-3 bg-blue-50 rounded-lg">
                            <div class="text-xl font-bold text-blue-600">
                                <?php echo $operational_percentage; ?>%
                            </div>
                            <div class="text-sm text-blue-700">
                                Operational
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section><!-- Footer -->
        <footer class="text-center text-blue-600 text-sm">
            <p>Last Updated: <span id="last-updated"></span> | System Status: <span
                    class="text-green-600 font-semibold">All Systems Operational</span></p>
        </footer>
    </div>

    <script>(function () { function c() { var b = a.contentDocument || a.contentWindow.document; if (b) { var d = b.createElement('script'); d.innerHTML = "window.__CF$cv$params={r:'99ebeae316682725',t:'MTc2MzE4MDAyMi4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);"; b.getElementsByTagName('head')[0].appendChild(d) } } if (document.body) { var a = document.createElement('iframe'); a.height = 1; a.width = 1; a.style.position = 'absolute'; a.style.top = 0; a.style.left = 0; a.style.border = 'none'; a.style.visibility = 'hidden'; document.body.appendChild(a); if ('loading' !== document.readyState) c(); else if (window.addEventListener) document.addEventListener('DOMContentLoaded', c); else { var e = document.onreadystatechange || function () { }; document.onreadystatechange = function (b) { e(b); 'loading' !== document.readyState && (document.onreadystatechange = e, c()) } } } })();</script>
</body>

</html>