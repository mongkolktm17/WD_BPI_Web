<?php
require_once 'config.php';

// Check if the user is logged in, if not then redirect him to login page
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

// Function to get security personnel status with contract data
function get_security_personnel_status($conn)
{
    $sql = "SELECT morning_shift, morning_shift_contract, evening_shift, evening_shift_contract FROM security_guard_counts WHERE is_deleted = 0 ORDER BY record_date DESC, created_at DESC LIMIT 1";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return ['morning_shift' => 0, 'morning_shift_contract' => null, 'evening_shift' => 0, 'evening_shift_contract' => null];
}

// Fetch security status
$security_status = get_security_personnel_status($conn);

// Calculate NVR Recording Status counts (from nvr_recording_days.php)
$nvr_status_counts = [];
$buildings_to_count = ['B2', 'B3', 'B4', 'B9'];

foreach ($buildings_to_count as $bldg) {
    $count_query = "SELECT COUNT(*) as total FROM cctv_devices WHERE building = ?";
    $stmt_count = $conn->prepare($count_query);
    $stmt_count->bind_param("s", $bldg);
    $stmt_count->execute();
    $count_result = $stmt_count->get_result();
    $count_row = $count_result->fetch_assoc();

    $nvr_status_counts[$bldg] = [
        'total' => $count_row['total'],
        'passed' => 0  // Will be calculated below
    ];
    $stmt_count->close();
}

// Calculate passed counts from latest NVR recording days
$sql_latest_nvr_data = "
    SELECT
        cr.building,
        crd.nvr_name,
        crd.recording_days
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

$result_latest_nvr_data = $conn->query($sql_latest_nvr_data);

if ($result_latest_nvr_data && $result_latest_nvr_data->num_rows > 0) {
    while ($row = $result_latest_nvr_data->fetch_assoc()) {
        $building = $row['building'];
        $recording_days = (int) $row['recording_days'];

        // Check if building passes 62-day criteria
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
$total_failed = $total_nvrs - $total_passed;
$overall_percentage = $total_nvrs > 0 ? round(($total_passed / $total_nvrs) * 100) : 0;

// Fetch latest CCTV reports with NVR details for Camera Online Status
$cctv_summary_by_building = [];
$buildings_list = ['B2', 'B3', 'B4', 'B9'];
$global_online_cameras = 0;
$global_total_cameras = 0;

foreach ($buildings_list as $building) {
    $latest_report_query = "
        SELECT cr.*, u.username 
        FROM cctv_reports cr
        LEFT JOIN users u ON cr.submitted_by_id = u.id
        WHERE cr.building = ? AND cr.is_deleted = 0
        ORDER BY cr.report_time DESC
        LIMIT 1
    ";

    $stmt = $conn->prepare($latest_report_query);
    $stmt->bind_param('s', $building);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $report_id = $row['id'];

        // Fetch NVR details for this report
        $nvr_details_query = "
            SELECT nvr_name, online_channels, total_channels
            FROM cctv_report_details
            WHERE report_id = ?
            ORDER BY nvr_name
        ";

        $stmt2 = $conn->prepare($nvr_details_query);
        $stmt2->bind_param('i', $report_id);
        $stmt2->execute();
        $nvr_result = $stmt2->get_result();

        $nvrs = [];
        while ($nvr_row = $nvr_result->fetch_assoc()) {
            $percentage = $nvr_row['total_channels'] > 0
                ? round(($nvr_row['online_channels'] / $nvr_row['total_channels']) * 100)
                : 0;

            $nvrs[] = [
                'name' => $nvr_row['nvr_name'],
                'online' => $nvr_row['online_channels'],
                'total' => $nvr_row['total_channels'],
                'percentage' => $percentage
            ];
        }

        $cctv_summary_by_building[$building] = [
            'total_cameras' => $row['total_channels'],
            'online_cameras' => $row['online_channels'],
            'percentage' => $row['online_percentage'],
            'report_time' => $row['report_time'],
            'nvrs' => $nvrs
        ];

        // Accumulate global totals
        $global_total_cameras += (int) $row['total_channels'];
        $global_online_cameras += (int) $row['online_channels'];

        $stmt2->close();
    }

    $stmt->close();
}

$building_colors = [
    'B2' => ['gradient' => 'from-sky-500 to-blue-600', 'border' => 'border-sky-200', 'icon' => '🏭', 'bg' => 'bg-sky-50'],
    'B3' => ['gradient' => 'from-blue-500 to-indigo-600', 'border' => 'border-blue-200', 'icon' => '🏢', 'bg' => 'bg-blue-50'],
    'B4' => ['gradient' => 'from-indigo-500 to-blue-600', 'border' => 'border-indigo-200', 'icon' => '🏗️', 'bg' => 'bg-indigo-50'],
    'B9' => ['gradient' => 'from-cyan-500 to-sky-600', 'border' => 'border-cyan-200', 'icon' => '🧬', 'bg' => 'bg-cyan-50']
];

// Get current user's role name for display
$current_user_role_name = 'Officer';
if (isset($_SESSION['user_type']) && $_SESSION['user_type'] === 'admin') {
    $current_user_role_name = 'Administrator';
} elseif (isset($_SESSION['role_id'])) {
    $stmt = $conn->prepare('SELECT role_name FROM roles WHERE id = ?');
    $stmt->bind_param('i', $_SESSION['role_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $current_user_role_name = $row['role_name'];
    }
    $stmt->close();
}

$conn->close();
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WD Security Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="public/css/dashboard.css">
    <script>
        // Safe loader for optional SDKs: append script tags and log failures instead of throwing 404 errors.
        (function () {
            const sdkUrls = ['/_sdk/element_sdk.js', '/_sdk/data_sdk.js'];
            sdkUrls.forEach(url => {
                const s = document.createElement('script');
                s.src = url;
                s.defer = true;
                s.onload = () => console.log('Loaded', url);
                s.onerror = () => console.warn('Optional SDK not found:', url);
                document.head.appendChild(s);
            });
        })();
    </script>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
</head>

<body class="gradient-bg min-h-full">
    <div class="container mx-auto px-3 py-2">
        <!-- ── Compact Header ── -->
        <header class="mb-2">
            <div
                class="bg-white rounded-xl shadow-md px-4 py-2 flex items-center justify-between border-l-4 border-sky-500">
                <!-- Logo + Title -->
                <div class="flex items-center gap-3">
                    <img src="report_assets/Images/images_logo.png" alt="WD Logo" class="h-9 w-auto object-contain">
                    <div>
                        <h1 id="dashboard-title"
                            class="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-sky-500 leading-tight">
                            Security System Dashboard</h1>
                        <p class="text-[11px] text-slate-400 leading-tight">BPI Western Digital Storage Technologies
                            (Thailand) Ltd.</p>
                    </div>
                </div>
                <!-- Right: time + user + buttons -->
                <div class="flex items-center gap-2">
                    <div class="text-xs text-slate-400 flex items-center gap-1 mr-2">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span id="current-time" class="font-medium"></span>
                    </div>
                    <div class="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1">
                        <div class="relative mr-2">
                            <div class="w-2 h-2 bg-emerald-500 rounded-full pulse-animation"></div>
                            <div
                                class="w-2 h-2 bg-emerald-500 rounded-full absolute top-0 left-0 animate-ping opacity-75">
                            </div>
                        </div>
                        <div>
                            <div class="font-bold text-slate-700 text-xs leading-tight" id="user-name">
                                <?php echo isset($_SESSION['first_name']) && isset($_SESSION['last_name']) ? htmlspecialchars($_SESSION['first_name'] . ' ' . $_SESSION['last_name']) : htmlspecialchars($_SESSION['username']); ?>
                            </div>
                            <div class="text-slate-400 text-[10px]" id="user-role">
                                <?php echo htmlspecialchars($current_user_role_name); ?>
                            </div>
                        </div>
                    </div>
                    <a href="report_page.php"
                        class="bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200 py-1 px-3 rounded-lg flex items-center gap-1 text-xs font-medium shadow-sm transition-all">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                clip-rule="evenodd"></path>
                        </svg>
                        Report
                    </a>
                    <a href="report_visual.php"
                        class="bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 py-1 px-3 rounded-lg flex items-center gap-1 text-xs font-medium shadow-sm transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Stats
                    </a>
                    <button id="settings-btn"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                clip-rule="evenodd"></path>
                        </svg>
                    </button>
                    <a href="logout.php"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </a>
                </div>
            </div>
        </header>

        <!-- Security Personnel Section -->
        <section class="mb-2">
            <div class="flex items-center gap-2 mb-2">
                <h3 id="security-section-title" class="text-sm font-bold text-slate-600">Security Personnel Status</h3>
                <span class="text-xs text-slate-400">(Last Update: <span id="security-last-update"></span>)</span>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <!-- Day Shift Card -->
                <div class="bg-white rounded-xl p-3 card-shadow flex items-center gap-3">
                    <div class="bg-yellow-50 p-2 rounded-lg flex-shrink-0">
                        <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                                clip-rule="evenodd"></path>
                        </svg>
                    </div>
                    <div class="flex-1">
                        <div class="text-xs font-semibold text-slate-500">Day Shift <span
                                class="text-[10px] font-normal text-gray-400">07:00-19:00</span></div>
                        <div class="text-xl font-black leading-tight" id="day-shift-count">
                            <?php
                            $morning_actual = $security_status['morning_shift'];
                            $morning_contract = $security_status['morning_shift_contract'];
                            $morning_color = (!is_null($morning_contract) && $morning_actual < $morning_contract) ? 'text-orange-500' : 'text-green-500';
                            ?>
                            <span
                                class="<?php echo $morning_color; ?>"><?php echo htmlspecialchars($morning_actual); ?></span><?php if (!is_null($morning_contract)): ?><span
                                    class="text-blue-400 text-base"> /
                                    <?php echo htmlspecialchars($morning_contract); ?></span><?php endif; ?>
                        </div>
                        <?php if (!is_null($morning_contract)): ?>
                            <div class="text-[10px] text-gray-400"><span class="<?php echo $morning_color; ?>">●</span>
                                Actual / <span class="text-blue-400">●</span> Contract</div><?php endif; ?>
                    </div>
                </div>

                <!-- Night Shift Card -->
                <div class="bg-white rounded-xl p-3 card-shadow flex items-center gap-3">
                    <div class="bg-indigo-50 p-2 rounded-lg flex-shrink-0">
                        <svg class="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                        </svg>
                    </div>
                    <div class="flex-1">
                        <div class="text-xs font-semibold text-slate-500">Night Shift <span
                                class="text-[10px] font-normal text-gray-400">19:00-07:00</span></div>
                        <div class="text-xl font-black leading-tight" id="night-shift-count">
                            <?php
                            $evening_actual = $security_status['evening_shift'];
                            $evening_contract = $security_status['evening_shift_contract'];
                            $evening_color = (!is_null($evening_contract) && $evening_actual < $evening_contract) ? 'text-orange-500' : 'text-green-500';
                            ?>
                            <span
                                class="<?php echo $evening_color; ?>"><?php echo htmlspecialchars($evening_actual); ?></span><?php if (!is_null($evening_contract)): ?><span
                                    class="text-blue-400 text-base"> /
                                    <?php echo htmlspecialchars($evening_contract); ?></span><?php endif; ?>
                        </div>
                        <?php if (!is_null($evening_contract)): ?>
                            <div class="text-[10px] text-gray-400"><span class="<?php echo $evening_color; ?>">●</span>
                                Actual / <span class="text-blue-400">●</span> Contract</div><?php endif; ?>
                    </div>
                </div>

                <!-- Total Active Card -->
                <div
                    class="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 card-shadow flex items-center gap-3">
                    <div class="bg-white/20 p-2 rounded-lg flex-shrink-0">
                        <img src="report_assets/Images/security-officer.png" alt="Total"
                            class="w-5 h-5 object-contain" />
                    </div>
                    <div class="flex-1">
                        <div class="text-xs font-semibold text-blue-100">Total Active</div>
                        <div class="text-xl font-black leading-tight text-white" id="total-shift-count">
                            <?php
                            $total_actual = $morning_actual + $evening_actual;
                            $total_contract = (is_null($morning_contract) ? 0 : $morning_contract) + (is_null($evening_contract) ? 0 : $evening_contract);
                            $show_contract = !is_null($morning_contract) || !is_null($evening_contract);
                            $total_color = ($show_contract && $total_actual < $total_contract) ? 'text-orange-300' : 'text-green-300';
                            ?>
                            <span
                                class="<?php echo $total_color; ?>"><?php echo htmlspecialchars($total_actual); ?></span><?php if ($show_contract): ?><span
                                    class="text-blue-200 text-base"> /
                                    <?php echo htmlspecialchars($total_contract); ?></span><?php endif; ?>
                        </div>
                        <?php if ($show_contract): ?>
                            <div class="text-[10px] text-blue-200"><span class="<?php echo $total_color; ?>">●</span> Actual
                                / <span class="text-blue-300">●</span> Contract</div><?php endif; ?>
                    </div>
                </div>
            </div>
        </section>

        <!-- 4-Quadrant Grid -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">

            <!-- TOP-LEFT: Parking Lot Report -->
            <section>
                <div class="flex items-center gap-2 mb-2">
                    <h3 id="parking-section-title" class="text-sm font-bold text-blue-900">Parking Lot Report</h3><span
                        class="text-[10px] text-gray-400">(Last Update: <span id="parking-last-update"></span>)</span>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div
                        class="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-3 text-white shadow-md flex items-center justify-between">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <img src="report_assets/Images/car2.png" alt="Car" class="w-6 h-6 opacity-90" />
                                <span class="text-sm font-semibold opacity-90">Car Parking Total</span>
                            </div>
                            <div class="text-2xl font-black tracking-tight" id="car-parking-total">0/1075</div>
                            <div class="text-blue-100 text-xs mt-1" id="car-parking-percentage">76% Occupied</div>
                        </div>
                        <div class="bg-white/20 p-3 rounded-full">
                            <img src="report_assets/Images/car2.png" alt="Car" class="w-8 h-8" />
                        </div>
                    </div>
                    <div
                        class="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl p-3 text-white shadow-md flex items-center justify-between">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <img src="report_assets/Images/motorcycle.png" alt="Moto" class="w-6 h-6 opacity-90" />
                                <span class="text-sm font-semibold opacity-90">Motorcycle Parking Total</span>
                            </div>
                            <div class="text-2xl font-black tracking-tight" id="motorcycle-parking-total">590/757</div>
                            <div class="text-emerald-50 text-xs mt-1" id="motorcycle-parking-percentage">78% Occupied
                            </div>
                        </div>
                        <div class="bg-white/20 p-3 rounded-full">
                            <img src="report_assets/Images/motorcycle.png" alt="Moto" class="w-8 h-8" />
                        </div>
                    </div>
                </div>
            </section>

            <!-- TOP-RIGHT: NVR + Camera side by side -->
            <div class="grid grid-cols-2 gap-3">

                <!-- NVR Recording Status -->
                <section class="flex flex-col">
                    <div class="flex items-center gap-2 mb-2">
                        <h3 id="nvr-section-title" class="text-sm font-bold text-blue-900">NVR Recording Status</h3>
                        <span class="text-[10px] text-gray-400">(Last Update: <span
                                id="nvr-last-update">-</span>)</span>
                    </div>
                    <div
                        class="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl p-3 text-white shadow-md flex-1 flex flex-col justify-center">
                        <div class="text-xs font-semibold opacity-80 mb-2">NVR Recording Summary</div>
                        <div class="text-xl font-black mb-1">
                            <span id="nvr-summary-count"><?php echo $total_passed; ?>/<?php echo $total_nvrs; ?></span>
                            <span class="text-base font-bold">(<span
                                    id="nvr-summary-percentage"><?php echo $overall_percentage; ?></span>%)</span>
                        </div>
                        <div class="text-blue-100 text-xs mb-3">NVRs Passed / Total</div>
                        <div class="flex gap-4 mt-auto">
                            <div class="flex-1 text-center bg-white/10 rounded-lg py-2">
                                <div class="text-xl font-black text-green-300" id="nvr-passed-count">
                                    <?php echo $total_passed; ?>
                                </div>
                                <div class="text-xs text-blue-100 font-semibold">Passed</div>
                            </div>
                            <div class="flex-1 text-center bg-white/10 rounded-lg py-2">
                                <div class="text-xl font-black text-rose-300" id="nvr-failed-count">
                                    <?php echo $total_failed; ?>
                                </div>
                                <div class="text-xs text-blue-100 font-semibold">Failed</div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Camera Online Status -->
                <section class="flex flex-col">
                    <div class="flex items-center gap-2 mb-2">
                        <h3 id="camera-section-title" class="text-sm font-bold text-blue-900">Camera Online Status</h3>
                        <span class="text-[10px] text-gray-400">(Last Update: <span
                                id="camera-last-update"></span>)</span>
                    </div>
                    <?php $global_percentage = $global_total_cameras > 0 ? round(($global_online_cameras / $global_total_cameras) * 100) : 0; ?>
                    <div
                        class="bg-gradient-to-br from-sky-600 to-cyan-700 rounded-xl p-3 text-white shadow-md flex-1 flex flex-col justify-center">
                        <div class="text-xs font-semibold opacity-80 mb-2">Camera Online Summary</div>
                        <div class="text-xl font-black mb-1">
                            <span
                                id="camera-summary-online-total"><?php echo $global_online_cameras; ?>/<?php echo $global_total_cameras; ?></span>
                            <span class="text-base font-bold">(<span
                                    id="camera-summary-percentage"><?php echo $global_percentage; ?></span>%)</span>
                        </div>
                        <div class="text-blue-100 text-xs mb-3">Online / Total Cameras</div>
                        <div class="flex gap-4 mt-auto">
                            <div class="flex-1 text-center bg-white/10 rounded-lg py-2">
                                <div class="text-xl font-black text-green-300" id="camera-summary-online">
                                    <?php echo $global_online_cameras; ?>
                                </div>
                                <div class="text-xs text-blue-100 font-semibold">Online</div>
                            </div>
                            <div class="flex-1 text-center bg-white/10 rounded-lg py-2">
                                <div class="text-xl font-black text-rose-300" id="camera-summary-offline">
                                    <?php echo $global_total_cameras - $global_online_cameras; ?>
                                </div>
                                <div class="text-xs text-blue-100 font-semibold">Offline</div>
                            </div>
                        </div>
                    </div>
                </section>

            </div><!-- END TOP-RIGHT -->

            <!-- BOTTOM-LEFT: Hand Held Metal Detector Status -->
            <section class="flex flex-col">
                <div class="flex items-center gap-2 mb-2">
                    <h3 id="detector-section-title" class="text-sm font-bold text-blue-900">Hand Held Metal Detector
                    </h3><span class="text-[10px] text-gray-400">(Last Update: <span id="detector-last-update"></span>)
                        | Total Reports: <span id="hh-total-reports">0</span></span>
                </div>
                <div class="bg-white rounded-xl p-3 card-shadow border border-slate-100 flex-1 flex flex-col">
                    <div class="grid grid-cols-2 gap-3">
                        <!-- Battery Check -->
                        <div id="hh-battery-card" class="p-2 rounded-xl border border-green-200 bg-green-50">
                            <div class="flex items-center gap-2 mb-1.5">
                                <div
                                    class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clip-rule="evenodd"></path>
                                    </svg>
                                </div>
                                <h4 class="font-bold text-slate-700 text-xs">Battery Check</h4>
                            </div>
                            <div class="flex items-center justify-center gap-3">
                                <div class="text-center">
                                    <div id="hh-battery-pass" class="text-lg font-black text-green-600">0</div>
                                    <div class="text-[10px] text-green-700 font-semibold">Pass</div>
                                </div>
                                <div class="text-slate-300 text-lg font-light">/</div>
                                <div class="text-center">
                                    <div id="hh-battery-fail" class="text-lg font-black text-red-500">0</div>
                                    <div class="text-[10px] text-red-600 font-semibold">Fail</div>
                                </div>
                            </div>
                        </div>
                        <!-- LED Power -->
                        <div id="hh-led-card" class="p-2 rounded-xl border border-green-200 bg-green-50">
                            <div class="flex items-center gap-2 mb-1.5">
                                <div
                                    class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM6 10a1 1 0 01-1 1H4a1 1 0 110-2h1a1 1 0 011 1z">
                                        </path>
                                    </svg>
                                </div>
                                <h4 class="font-bold text-slate-700 text-xs">LED Power</h4>
                            </div>
                            <div class="flex items-center justify-center gap-3">
                                <div class="text-center">
                                    <div id="hh-led-pass" class="text-lg font-black text-green-600">0</div>
                                    <div class="text-[10px] text-green-700 font-semibold">Pass</div>
                                </div>
                                <div class="text-slate-300 text-lg font-light">/</div>
                                <div class="text-center">
                                    <div id="hh-led-fail" class="text-lg font-black text-red-500">0</div>
                                    <div class="text-[10px] text-red-600 font-semibold">Fail</div>
                                </div>
                            </div>
                        </div>
                        <!-- Detection Range -->
                        <div id="hh-detection-card" class="p-2 rounded-xl border border-green-200 bg-green-50">
                            <div class="flex items-center gap-2 mb-1.5">
                                <div
                                    class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                                            clip-rule="evenodd"></path>
                                    </svg>
                                </div>
                                <h4 class="font-bold text-slate-700 text-xs">Detection Range</h4>
                            </div>
                            <div class="flex items-center justify-center gap-3">
                                <div class="text-center">
                                    <div id="hh-detection-pass" class="text-lg font-black text-green-600">0</div>
                                    <div class="text-[10px] text-green-700 font-semibold">Pass</div>
                                </div>
                                <div class="text-slate-300 text-lg font-light">/</div>
                                <div class="text-center">
                                    <div id="hh-detection-fail" class="text-lg font-black text-red-500">0</div>
                                    <div class="text-[10px] text-red-600 font-semibold">Fail</div>
                                </div>
                            </div>
                        </div>
                        <!-- Audio Alert -->
                        <div id="hh-alarm-card" class="p-2 rounded-xl border border-green-200 bg-green-50">
                            <div class="flex items-center gap-2 mb-1.5">
                                <div
                                    class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z">
                                        </path>
                                    </svg>
                                </div>
                                <h4 class="font-bold text-slate-700 text-xs">Audio Alert</h4>
                            </div>
                            <div class="flex items-center justify-center gap-3">
                                <div class="text-center">
                                    <div id="hh-alarm-pass" class="text-lg font-black text-green-600">0</div>
                                    <div class="text-[10px] text-green-700 font-semibold">Pass</div>
                                </div>
                                <div class="text-slate-300 text-lg font-light">/</div>
                                <div class="text-center">
                                    <div id="hh-alarm-fail" class="text-lg font-black text-red-500">0</div>
                                    <div class="text-[10px] text-red-600 font-semibold">Fail</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Summary Row -->
                    <div class="grid grid-cols-2 gap-3 text-center pt-3 mt-auto border-t border-slate-100">
                        <div class="p-1.5 bg-green-50 rounded-lg">
                            <div id="hh-total-pass" class="text-base font-black text-green-600">0</div>
                            <div class="text-xs text-green-700 font-semibold">Total Pass</div>
                        </div>
                        <div class="p-1.5 bg-red-50 rounded-lg">
                            <div id="hh-total-fail" class="text-base font-black text-red-600">0</div>
                            <div class="text-xs text-red-700 font-semibold">Total Fail</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- BOTTOM-RIGHT: Walkthrough Metal Detector Status -->
            <section class="flex flex-col">
                <div class="flex items-center gap-2 mb-2">
                    <h3 id="walkthrough-section-title" class="text-sm font-bold text-blue-900">Walkthrough Metal
                        Detector</h3><span class="text-[10px] text-gray-400">(Last Update: <span
                            id="walkthrough-last-update"></span>) | Total Reports: <span
                            id="wt-total-reports">0</span></span>
                </div>
                <div class="bg-white rounded-xl p-3 card-shadow border border-slate-100 flex-1 flex flex-col">
                    <!-- Zone cards with pass/fail counts -->
                    <div id="walkthrough-zones-container" class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                        <!-- Zone cards will be rendered by JS -->
                    </div>
                    <!-- Summary Row -->
                    <div class="grid grid-cols-3 gap-3 text-center pt-3 mt-auto border-t border-slate-100">
                        <div class="p-1.5 bg-green-50 rounded-lg">
                            <div id="wt-total-pass" class="text-base font-black text-green-600">0</div>
                            <div class="text-xs text-green-700 font-semibold">Total Pass</div>
                        </div>
                        <div class="p-1.5 bg-red-50 rounded-lg">
                            <div id="wt-total-fail" class="text-base font-black text-red-600">0</div>
                            <div class="text-xs text-red-700 font-semibold">Total Fail</div>
                        </div>
                        <div class="p-1.5 bg-yellow-50 rounded-lg">
                            <div id="wt-total-other" class="text-base font-black text-yellow-600">0</div>
                            <div class="text-xs text-yellow-700 font-semibold">Total Other</div>
                        </div>
                    </div>
                </div>
            </section>

        </div><!-- END 4-QUADRANT GRID -->

        <footer class="text-center text-slate-400 text-[10px] mt-1">
            <p>Last Updated: <span id="last-updated"></span> | System Status: <span
                    class="text-green-500 font-semibold">All Systems Operational</span></p>
        </footer>
    </div><!-- Settings Modal -->
    <div id="settings-modal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm hidden z-50">
        <div class="flex items-center justify-center min-h-full p-2 sm:p-4">
            <div
                class="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <!-- Modal Header with Gradient -->
                <div class="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 flex-shrink-0">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z">
                                    </path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">System Settings</h3>
                                <p class="text-blue-100 text-sm mt-0.5">Manage your profile and system preferences</p>
                            </div>
                        </div>
                        <button id="close-modal"
                            class="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                </div><!-- Modal Content -->
                <!-- Tab Navigation (Fixed) -->
                <div class="bg-gray-50 px-6 pt-6 pb-2 border-b border-gray-200 z-10 flex-shrink-0">
                    <div
                        class="flex flex-col md:flex-row gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        <button
                            class="tab-btn active group relative flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden"
                            data-tab="profile">
                            <div class="relative z-10 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                        clip-rule="evenodd"></path>
                                </svg>
                                <span>User Profile</span>
                            </div>
                        </button>
                        <button
                            class="tab-btn group relative flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden"
                            data-tab="staff">
                            <div class="relative z-10 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z">
                                    </path>
                                </svg>
                                <span>Staff Management</span>
                            </div>
                        </button>
                        <button
                            class="tab-btn group relative flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden"
                            data-tab="roles">
                            <div class="relative z-10 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Role Management</span>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Modal Content (Scrollable) -->
                <div class="p-6 overflow-y-auto bg-gray-50 flex-1"><!-- Tab Content --> <!-- User Profile Tab -->
                    <div id="profile-tab" class="tab-content">
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                            <div class="flex items-center gap-3 mb-6">
                                <div class="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd">
                                        </path>
                                    </svg>
                                </div>
                                <h4 class="text-xl font-bold text-gray-800">User Profile Settings</h4>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-4">
                                    <div><label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                        <input type="text" id="profile-name"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value="Admin User">
                                    </div>
                                    <div><label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input type="email" id="profile-email"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value="admin@westerndigital.com">
                                    </div>
                                    <div><label class="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                        <select id="profile-department"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="security">Security Department</option>
                                            <option value="it">IT Department</option>
                                            <option value="hr">HR Department</option>
                                            <option value="operations">Operations</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="space-y-4">
                                    <div><label class="block text-sm font-medium text-gray-700 mb-2">Phone
                                            Number</label>
                                        <input type="tel" id="profile-phone"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value="+66 2 123 4567">
                                    </div>
                                    <div><label class="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                                        <input type="text" id="profile-employee-id"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                                            value="WD001" readonly>
                                    </div>
                                    <div><label class="block text-sm font-medium text-gray-700 mb-2">Last Login</label>
                                        <input type="text"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                                            value="Today, 08:30 AM" readonly>
                                    </div>
                                </div>
                            </div>

                            <!-- Password Change Section -->
                            <div class="mt-6 pt-6 border-t border-gray-200">
                                <h5 class="text-md font-semibold text-gray-800 mb-4">Change Password</h5>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Current
                                            Password</label>
                                        <input type="password" id="current-password"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                        <input type="password" id="new-password"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Confirm New
                                            Password</label>
                                        <input type="password" id="confirm-password"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <button id="change-password-btn"
                                        class="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md transition-colors">
                                        Change Password
                                    </button>
                                </div>
                            </div>


                            <div class="mt-6 flex justify-end"><button id="save-profile"
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors">
                                    Save Changes </button>
                            </div>
                        </div>
                    </div>

                    <!-- Staff Management Tab -->
                    <div id="staff-tab" class="tab-content hidden">
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div class="flex justify-between items-center mb-6">
                                <div class="flex items-center gap-3">
                                    <div class="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z">
                                            </path>
                                        </svg>
                                    </div>
                                    <h4 class="text-xl font-bold text-gray-800">Staff Management</h4>
                                </div>
                                <div class="flex gap-2">
                                    <a href="add_officer.php"
                                        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors inline-flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd"
                                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                                clip-rule="evenodd"></path>
                                        </svg>
                                        Add Staff
                                    </a>
                                    <a href="manage_officers.php"
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                                        Manage Officers
                                    </a>
                                </div>
                            </div>

                            <!-- Staff List -->
                            <div class="bg-gray-50 rounded-lg overflow-hidden">
                                <table class="w-full">
                                    <thead class="bg-gray-100">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Employee
                                                ID
                                            </th>
                                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Shift</th>
                                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Status
                                            </th>
                                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody id="staff-list" class="divide-y divide-gray-200">
                                        <!-- Staff data will be loaded dynamically -->
                                        <tr>
                                            <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                                                <div
                                                    class="animate-spin inline-block w-6 h-6 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-2">
                                                </div>
                                                <p>Loading staff data...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Role Management Tab -->
                    <div id="roles-tab" class="tab-content hidden">
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div class="flex justify-between items-center mb-6">
                                <div class="flex items-center gap-3">
                                    <div class="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <h4 class="text-xl font-bold text-gray-800">Role Management</h4>
                                </div>
                                <div class="flex gap-2">
                                    <a href="edit_role.php"
                                        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors inline-flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd"
                                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                                clip-rule="evenodd"></path>
                                        </svg>
                                        Add Role
                                    </a>
                                    <a href="manage_roles.php"
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                                        Manage Roles
                                    </a>
                                </div>
                            </div>

                            <!-- Roles Grid -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <!-- System Administrator Role -->
                                <div class="bg-white border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <h5 class="font-semibold text-gray-900">System Administrator</h5>
                                        <div class="flex space-x-2">
                                            <a href="edit_role.php?role_id=1"
                                                class="text-blue-600 hover:text-blue-800 edit-role-btn">
                                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z">
                                                    </path>
                                                </svg>
                                            </a>
                                            <button class="text-red-600 hover:text-red-800 delete-role-btn">
                                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                                                        clip-rule="evenodd"></path>
                                                    <path fill-rule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clip-rule="evenodd"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-600 mb-3">Full system access and management</p>
                                    <div class="text-xs text-gray-500">
                                        <div class="mb-1">✓ Dashboard Access</div>
                                        <div class="mb-1">✓ User Management</div>
                                        <div class="mb-1">✓ System Settings</div>
                                        <div class="mb-1">✓ Reports & Analytics</div>
                                    </div>
                                    <div class="mt-3 text-sm">
                                        <span class="text-gray-600">Users: </span>
                                        <span class="font-semibold">2</span>
                                    </div>
                                </div>

                                <!-- Security Supervisor Role -->
                                <div class="bg-white border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <h5 class="font-semibold text-gray-900">Security Supervisor</h5>
                                        <div class="flex space-x-2">
                                            <a href="edit_role.php?role_id=2"
                                                class="text-blue-600 hover:text-blue-800 edit-role-btn">
                                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z">
                                                    </path>
                                                </svg>
                                            </a>
                                            <button class="text-red-600 hover:text-red-800 delete-role-btn">
                                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                                                        clip-rule="evenodd"></path>
                                                    <path fill-rule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clip-rule="evenodd"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-600 mb-3">Supervise security operations</p>
                                    <div class="text-xs text-gray-500">
                                        <div class="mb-1">✓ Dashboard Access</div>
                                        <div class="mb-1">✓ Staff Scheduling</div>
                                        <div class="mb-1">✓ Incident Reports</div>
                                        <div class="mb-1">✗ System Settings</div>
                                    </div>
                                    <div class="mt-3 text-sm">
                                        <span class="text-gray-600">Users: </span>
                                        <span class="font-semibold">5</span>
                                    </div>
                                </div>

                                <!-- Security Guard Role -->
                                <div class="bg-white border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <h5 class="font-semibold text-gray-900">Security Guard</h5>
                                        <div class="flex space-x-2">
                                            <a href="edit_role.php?role_id=3"
                                                class="text-blue-600 hover:text-blue-800 edit-role-btn">
                                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z">
                                                    </path>
                                                </svg>
                                            </a>
                                            <button class="text-red-600 hover:text-red-800 delete-role-btn">
                                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                                                        clip-rule="evenodd"></path>
                                                    <path fill-rule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clip-rule="evenodd"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-600 mb-3">Basic security operations</p>
                                    <div class="text-xs text-gray-500">
                                        <div class="mb-1">✓ Dashboard View</div>
                                        <div class="mb-1">✓ Check-in/Check-out</div>
                                        <div class="mb-1">✗ Staff Management</div>
                                        <div class="mb-1">✗ System Settings</div>
                                    </div>
                                    <div class="mt-3 text-sm">
                                        <span class="text-gray-600">Users: </span>
                                        <span class="font-semibold">18</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div><!-- End of scrollable container -->
            </div>
        </div>
    </div>
    </div>
    </div>

    <!-- Add Staff Modal -->
    <div id="add-staff-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-full p-4">
            <div class="bg-white rounded-lg max-w-md w-full">
                <div class="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 class="text-lg font-bold text-blue-900">Add New Staff</h3><button
                        class="close-add-staff text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="currentColor" viewbox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clip-rule="evenodd"></path>
                        </svg></button>
                </div>
                <div class="p-6">
                    <form id="add-staff-form" class="space-y-4">
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label> <input
                                type="text" id="new-staff-name"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required>
                        </div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Employee ID</label> <input
                                type="text" id="new-staff-id"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required>
                        </div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Role</label> <select
                                id="new-staff-role"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required>
                                <option value="">Select Role</option>
                                <option value="Security Guard">Security Guard</option>
                                <option value="Security Supervisor">Security Supervisor</option>
                                <option value="System Administrator">System Administrator</option>
                            </select>
                        </div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Shift</label> <select
                                id="new-staff-shift"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required>
                                <option value="">Select Shift</option>
                                <option value="Day Shift">Day Shift (06:00 - 18:00)</option>
                                <option value="Night Shift">Night Shift (18:00 - 06:00)</option>
                            </select>
                        </div>
                        <div class="flex justify-end space-x-3 pt-4"><button type="button"
                                class="close-add-staff px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button type="submit"
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add
                                Staff</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
    <!-- Dashboard JavaScript -->
    <script src="public/js/dashboard-all.js?v=<?php echo time(); ?>"></script>

    <!-- Removed injected Cloudflare challenge iframe/script to avoid 404 errors on local environment -->
    <!-- Footer -->
    <footer class="mt-12 mb-6 text-center">
        <div class="flex flex-col items-center justify-center gap-2">
            <div class="flex items-center gap-2">
                <img src="report_assets/Images/PCS_logo.png" alt="PCS Engineering Solution"
                    class="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity">
                <span class="font-semibold text-slate-600 text-lg tracking-tight">PCS Engineering Solution</span>
            </div>
            <p class="text-sm text-slate-400">
                &copy; 2025 PCS Engineering Solution. All rights reserved.
            </p>
        </div>
    </footer>
</body>

</html>