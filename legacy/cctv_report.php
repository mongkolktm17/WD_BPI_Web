<?php
require_once 'config.php';

// --- Authentication Check ---
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}
$current_user_id = $_SESSION["id"];
$current_username = $_SESSION["username"];

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true);
    error_log("PHP POST RAW INPUT: " . $raw_input); // NEW DEBUG LOG
    error_log("PHP POST DECODED DATA: " . json_encode($data)); // NEW DEBUG LOG

    if (isset($data['action']) && $data['action'] === 'save_report') {
        $stats = $data['stats'];
        $building = $data['building'];

        $conn->begin_transaction();

        try {
            $stmt = $conn->prepare("INSERT INTO cctv_reports (building, total_channels, online_channels, offline_channels, online_percentage, submitted_by_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("siiidi", $building, $stats['total'], $stats['online'], $stats['offline'], $stats['percentage'], $current_user_id);
            $stmt->execute();
            $report_id = $stmt->insert_id;
            $stmt->close();

            $stmt_details = $conn->prepare("INSERT INTO cctv_report_details (report_id, nvr_name, online_channels, total_channels, channel_statuses_json) VALUES (?, ?, ?, ?, ?)");
            foreach ($stats['nvrStats'] as $nvr_name => $nvr_data) {
                $full_channel_status_data = $data['stats']['fullChannelStatusByNVR'] ?? null; // Get the whole object
                $nvr_channel_statuses = $full_channel_status_data[$nvr_name] ?? []; // Access specific NVR

                $serialized_channel_statuses = json_encode($nvr_channel_statuses);
                error_log("PHP POST DEBUG: nvr_name: " . $nvr_name .
                    ", data['stats']['fullChannelStatusByNVR']: " . json_encode($full_channel_status_data) .
                    ", nvr_channel_statuses: " . json_encode($nvr_channel_statuses) .
                    ", serialized_channel_statuses: " . $serialized_channel_statuses); // UPDATED DEBUG LOG

                $stmt_details->bind_param("isiss", $report_id, $nvr_name, $nvr_data['online_channels'], $nvr_data['total_channels'], $serialized_channel_statuses);
                $stmt_details->execute();
            }
            $stmt_details->close();

            $conn->commit();
            echo json_encode(['status' => 'success']);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}

// Fetch CCTV devices
$cctv_devices_result = $conn->query("SELECT * FROM cctv_devices");
$building_configs = [];
while ($row = $cctv_devices_result->fetch_assoc()) {
    $building_configs[$row['building']]['nvrs'][] = $row;
}

// Fetch camera names
$camera_names_result = $conn->query("SELECT building, nvr_name, channel_number, camera_name FROM cctv_camera_names");
$camera_names = [];
while ($row = $camera_names_result->fetch_assoc()) {
    $key = $row['building'] . '_' . $row['nvr_name'] . '_' . $row['channel_number'];
    $camera_names[$key] = $row['camera_name'];
}

// Fetch report history
$report_history_result = $conn->query("
    SELECT cr.*, u.username 
    FROM cctv_reports cr
    LEFT JOIN users u ON cr.submitted_by_id = u.id
    ORDER BY cr.report_time DESC 
    LIMIT 20
");
$report_history = [];
while ($row = $report_history_result->fetch_assoc()) {
    $report_id = $row['id'];
    $details_result = $conn->query("SELECT nvr_name, online_channels, total_channels, channel_statuses_json FROM cctv_report_details WHERE report_id = $report_id");
    $details = [];
    while ($detail_row = $details_result->fetch_assoc()) {
        error_log("Raw channel_statuses_json for NVR " . $detail_row['nvr_name'] . ": " . ($detail_row['channel_statuses_json'] ?? 'NULL')); // Debug log
        $details[$detail_row['nvr_name']] = [
            'online_channels' => $detail_row['online_channels'],
            'total_channels' => $detail_row['total_channels'],
            'channel_statuses' => json_decode($detail_row['channel_statuses_json'] ?? '[]', true) // Deserialize
        ];
    }
    $row['details'] = $details;
    $report_history[] = $row;
}

// Gather all NVRs in the DB for the table columns
$all_nvrs = [];
$nvr_list_sql = "SELECT building, nvr_name FROM cctv_devices ORDER BY building, nvr_name";
$nvr_list_res = $conn->query($nvr_list_sql);
if ($nvr_list_res) {
    while ($row = $nvr_list_res->fetch_assoc()) {
        $all_nvrs[] = $row;
    }
}

if (!function_exists('getShortNvrLabel')) {
    function getShortNvrLabel($building, $nvr_name) {
        $num = preg_replace('/[^0-9]/', '', $nvr_name);
        $num = ltrim($num, '0');
        return $building . '-N' . $num;
    }
}

$conn->close();
?>
<!doctype html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NVR Multi-Building Monitor</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="theme.css">
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
</head>

<body class="custom-font" style="background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);">
    <main class="min-h-full py-8 px-4">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="glass-card rounded-3xl shadow-xl p-8 mb-8">
                <div class="flex justify-between items-start">
                    <!-- Left side: Title and Subtitle -->
                    <div>
                        <h1 id="main-title" class="text-3xl font-bold section-title mb-2">ระบบตรวจสอบสถานะ NVR</h1>
                        <p id="subtitle" class="text-gray-600 text-lg">Network Video Recorder Status Monitor</p>
                    </div>
                    <!-- Right side: User info and buttons -->
                    <div class="text-right flex-shrink-0 ml-4">
                        <a href="report_page.php"
                            class="block bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded-xl hover:bg-blue-300 transition-colors shadow-md mb-2">กลับ
                            หน้ารายงาน</a>
                        <div>
                            <p class="text-sm text-slate-600">User: <span
                                    class="font-semibold text-slate-800"><?php echo htmlspecialchars($current_username); ?></span>
                            </p>
                            <a href="logout.php"
                                class="text-sm text-red-600 hover:text-red-700 underline">ออกจากระบบ</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Controls -->
            <div class="glass-card rounded-3xl shadow-xl p-8 mb-8 text-center">
                <div class="mt-6 flex justify-center gap-4 mb-6">
                    <button id="select-b2"
                        class="toggle-btn flex-1 px-6 py-4 border-2 border-green-500 bg-green-100 text-green-700 rounded-2xl font-medium">
                        🏢 อาคาร B2 </button>
                    <button id="select-b3"
                        class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 text-gray-600 rounded-2xl font-medium">
                        🏢 อาคาร B3 </button>
                    <button id="select-b4"
                        class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 text-gray-600 rounded-2xl font-medium">
                        🏢 อาคาร B4 </button>
                    <button id="select-b9"
                        class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 text-gray-600 rounded-2xl font-medium">
                        🏢 อาคาร B9 </button>
                </div>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <button id="refresh-btn"
                        class="submit-btn-modern text-white px-8 py-3 rounded-full font-semibold text-lg shadow-lg">
                        <span id="refresh-text">🔄 รีเฟรชสถานะ</span> </button>
                </div>
            </div>
            <div id="building-info" class="glass-card rounded-3xl shadow-xl p-6 mb-8">
                <div class="text-center">
                    <h2 id="current-building" class="text-3xl font-bold section-title mb-2"></h2>
                    <p id="building-description" class="text-gray-600"></p>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="glass-card p-6 rounded-xl card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm font-medium">ช่องทั้งหมด</p>
                            <p id="total-channels" class="text-3xl font-bold text-gray-800">0</p>
                        </div>
                        <div class="text-4xl">
                            📹
                        </div>
                    </div>
                </div>
                <div class="glass-card p-6 rounded-xl card-hover shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm font-medium">ออนไลน์</p>
                            <p id="online-count" class="text-3xl font-bold text-gray-800">0</p>
                        </div>
                        <div class="text-4xl">
                            ✅
                        </div>
                    </div>
                </div>
                <div class="glass-card p-6 rounded-xl card-hover shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm font-medium">ออฟไลน์</p>
                            <p id="offline-count" class="text-3xl font-bold text-gray-800">0</p>
                        </div>
                        <div class="text-4xl">
                            ❌
                        </div>
                    </div>
                </div>
                <div class="glass-card p-6 rounded-xl card-hover shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm font-medium">เปอร์เซ็นต์ออนไลน์</p>
                            <p id="online-percentage" class="text-3xl font-bold text-gray-800">0%</p>
                        </div>
                        <div class="text-4xl">
                            📊
                        </div>
                    </div>
                </div>
            </div>

            <!-- NVR Summary Section -->
            <div class="glass-card rounded-3xl shadow-xl p-6 mb-8">
                <h3 class="text-xl font-bold section-title mb-4 flex items-center">
                    <span class="mr-2">📋</span> สรุปสถานะกล้องแยกตาม NVR (Building <span
                        id="summary-building-name"></span>)
                </h3>
                <div id="nvr-summary-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- NVR Comparison cards will be inserted here -->
                </div>
            </div>

            <div id="nvr-container" class="space-y-8">
            </div>

            <!-- Report Button (Bottom) -->
            <div class="mt-8 flex justify-center">
                <button id="report-btn"
                    class="submit-btn-modern text-white px-12 py-4 rounded-full font-semibold text-xl shadow-lg transition-all duration-300 hover:scale-105">
                    <span id="report-text">📊 ส่งรายงานสถานะ</span>
                </button>
            </div>
            <div class="mt-12 glass-card rounded-3xl shadow-xl p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 id="history-title" class="text-2xl font-bold section-title flex items-center">
                        <span class="text-3xl mr-3">📋</span> ประวัติการบันทึกข้อมูล
                    </h2>
                    <div class="flex items-center gap-4">
                        <button onclick="exportTableToCSV('cctv_report_history.csv')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl transition-colors shadow-md flex items-center gap-2 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            ส่งออกเป็น CSV
                        </button>
                        <div class="text-sm text-gray-600">
                            รายการล่าสุด <span id="history-count"><?php echo count($report_history); ?></span> รายการ
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-xl border border-gray-200">
                    <table class="w-full text-left border-collapse bg-white table-layout-fixed">
                        <thead class="bg-gray-50 text-gray-700 uppercase text-[10px] leading-normal">
                            <tr>
                                <th class="py-3 px-2 font-bold text-center whitespace-nowrap" title="วันที่ตรวจ">วันที่</th>
                                <th class="py-3 px-2 font-bold text-center whitespace-nowrap" title="เวลาที่บันทึก">เวลา</th>
                                <th class="py-3 px-2 font-bold text-center whitespace-nowrap" title="อาคาร">อาคาร</th>
                                <th class="py-3 px-2 font-bold whitespace-nowrap" title="ผู้รายงาน">ผู้รายงาน</th>
                                <th class="py-3 px-2 font-bold text-center whitespace-nowrap" title="ออนไลน์/ทั้งหมด">ออนไลน์/ทั้งหมด</th>
                                <th class="py-3 px-2 font-bold text-center whitespace-nowrap" title="เปอร์เซ็นต์">เปอร์เซ็นต์</th>
                                <?php foreach ($all_nvrs as $nvr): 
                                    $label = getShortNvrLabel($nvr['building'], $nvr['nvr_name']);
                                    ?>
                                    <th class="py-3 px-1.5 font-bold text-center whitespace-nowrap text-[9px] cursor-help text-slate-500" title="Building <?php echo htmlspecialchars($nvr['building'] . ' - ' . $nvr['nvr_name']); ?>"><?php echo htmlspecialchars($label); ?></th>
                                <?php endforeach; ?>
                            </tr>
                        </thead>
                        <tbody class="text-gray-600 text-xs font-light">
                            <?php if (!empty($report_history)): ?>
                                <?php foreach ($report_history as $row):
                                    $submission_time = new DateTime($row['report_time']);
                                    ?>
                                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td class="py-3 px-2 text-center whitespace-nowrap">
                                            <div class="font-medium text-gray-800"><?php echo $submission_time->format('d/m/Y'); ?></div>
                                        </td>
                                        <td class="py-3 px-2 text-center whitespace-nowrap">
                                            <?php echo $submission_time->format('H:i'); ?>
                                        </td>
                                        <td class="py-3 px-2 text-center whitespace-nowrap font-semibold">
                                            <?php echo htmlspecialchars($row['building']); ?>
                                        </td>
                                        <td class="py-3 px-2 whitespace-nowrap font-medium text-gray-700">
                                            <?php echo htmlspecialchars($row['username'] ?? 'N/A'); ?>
                                        </td>
                                        <td class="py-3 px-2 text-center whitespace-nowrap font-bold text-gray-700">
                                            <?php echo htmlspecialchars($row['online_channels'] . '/' . $row['total_channels']); ?>
                                        </td>
                                        <td class="py-3 px-2 text-center whitespace-nowrap font-bold text-blue-600">
                                            <?php echo htmlspecialchars($row['online_percentage'] . '%'); ?>
                                        </td>
                                        <?php foreach ($all_nvrs as $nvr): 
                                            // Only display details for this NVR if it belongs to the report's building
                                            $val = '-';
                                            $color = 'text-gray-400';
                                            if ($nvr['building'] === $row['building'] && isset($row['details'][$nvr['nvr_name']])) {
                                                $nvr_detail = $row['details'][$nvr['nvr_name']];
                                                $val = $nvr_detail['online_channels'] . '/' . $nvr_detail['total_channels'];
                                                $color = ($nvr_detail['online_channels'] < $nvr_detail['total_channels']) ? 'text-red-600 font-bold' : 'text-green-600 font-bold';
                                            }
                                            ?>
                                            <td class="py-3 px-1.5 text-center font-semibold text-[10px] <?php echo $color; ?>">
                                                <?php echo htmlspecialchars($val); ?>
                                            </td>
                                        <?php endforeach; ?>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="<?php echo (6 + count($all_nvrs)); ?>" class="py-8 px-6 text-center text-gray-400 bg-gray-50">
                                        ไม่พบข้อมูลประวัติการรายงาน
                                    </td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
    </main>
    <script>
        const buildingConfigs = <?php echo json_encode($building_configs); ?>;
        console.log('buildingConfigs:', buildingConfigs);
        let reportHistory = <?php echo json_encode($report_history); ?>;
        let currentBuilding = 'B2';
        const cameraNames = <?php echo json_encode($camera_names); ?>;

        let channelStatus = {};

        function initializeChannels() {
            channelStatus = {};
            const config = buildingConfigs[currentBuilding];

            console.log('initializeChannels: reportHistory', reportHistory); // Debug log 1
            const latestReportForBuilding = reportHistory.find(report => report.building === currentBuilding);
            console.log('initializeChannels: latestReportForBuilding', latestReportForBuilding); // Debug log 2

            config.nvrs.forEach(nvr => {
                if (latestReportForBuilding && latestReportForBuilding.details[nvr.nvr_name] && latestReportForBuilding.details[nvr.nvr_name].channel_statuses) {
                    const savedChannelStatuses = latestReportForBuilding.details[nvr.nvr_name].channel_statuses;
                    console.log(`initializeChannels: Using saved channel statuses for ${nvr.nvr_name}`, savedChannelStatuses); // Debug log 3
                    for (let i = 1; i <= nvr.channels; i++) {
                        const channelId = `${currentBuilding}-nvr${nvr.id}-ch${i}`;
                        channelStatus[channelId] = savedChannelStatuses[i] !== undefined ? savedChannelStatuses[i] : false;
                    }
                } else {
                    console.log(`initializeChannels: Randomizing channel statuses for ${nvr.nvr_name} (no latest report or channel statuses found)`); // Debug log 4
                    // If no latest report or no specific channel statuses, randomize
                    for (let i = 1; i <= nvr.channels; i++) {
                        const channelId = `${currentBuilding}-nvr${nvr.id}-ch${i}`;
                        channelStatus[channelId] = Math.random() > 0.3;
                    }
                }
            });
        }

        function createChannelElement(building, nvr, channelNum, isOnline) {
            const config = buildingConfigs[building];
            const channelId = `${building}-nvr${nvr.id}-ch${channelNum}`;
            const div = document.createElement('div');
            div.id = channelId;

            const statusClasses = isOnline ?
                'bg-green-500' :
                'bg-red-500';

            div.className = `channel-status p-2 rounded-lg text-center text-white font-semibold text-xs cursor-pointer transition-all duration-300 ${statusClasses}`;

            const cameraKey = `${building}_${nvr.nvr_name}_${channelNum}`;
            const cameraName = cameraNames[cameraKey] || `CH${channelNum}`;
            div.innerHTML = `<div class="font-bold text-sm">${channelNum}</div><div class="text-[9px] leading-tight mt-0.5 opacity-90 line-clamp-2">${cameraName}</div>`;
            div.title = `${cameraName}`;

            div.addEventListener('click', () => {
                channelStatus[channelId] = !channelStatus[channelId];
                updateChannelDisplay(div, channelStatus[channelId], building);
                updateStatistics();
            });

            return div;
        }

        function updateChannelDisplay(element, isOnline, building) {
            const statusClasses = isOnline ?
                'bg-green-500' :
                'bg-red-500';

            element.className = `channel-status p-2 rounded-lg text-center text-white font-semibold text-xs cursor-pointer transition-all duration-300 ${statusClasses}`;
        }

        function toggleBuildingButton(building) {
            const b2Button = document.getElementById('select-b2');
            const b3Button = document.getElementById('select-b3');
            const b4Button = document.getElementById('select-b4');
            const b9Button = document.getElementById('select-b9');

            // Reset all buttons to inactive gray state
            [b2Button, b3Button, b4Button, b9Button].forEach(btn => {
                btn.classList.remove(
                    'border-green-500', 'bg-green-100', 'text-green-700',
                    'border-purple-500', 'bg-purple-100', 'text-purple-700',
                    'border-sky-500', 'bg-sky-100', 'text-sky-700',
                    'border-orange-500', 'bg-orange-100', 'text-orange-700'
                );
                btn.classList.add('border-gray-200', 'text-gray-600');
            });

            // Activate selected button with its unique color
            if (building === 'B2') {
                b2Button.classList.remove('border-gray-200', 'text-gray-600');
                b2Button.classList.add('border-green-500', 'bg-green-100', 'text-green-700');
            } else if (building === 'B3') {
                b3Button.classList.remove('border-gray-200', 'text-gray-600');
                b3Button.classList.add('border-purple-500', 'bg-purple-100', 'text-purple-700');
            } else if (building === 'B4') {
                b4Button.classList.remove('border-gray-200', 'text-gray-600');
                b4Button.classList.add('border-sky-500', 'bg-sky-100', 'text-sky-700');
            } else if (building === 'B9') {
                b9Button.classList.remove('border-gray-200', 'text-gray-600');
                b9Button.classList.add('border-orange-500', 'bg-orange-100', 'text-orange-700');
            }
        }

        function renderNVRCards() {
            const container = document.getElementById('nvr-container');
            const config = buildingConfigs[currentBuilding];
            container.innerHTML = '';

            config.nvrs.forEach(nvr => {
                const nvrCard = document.createElement('div');

                nvrCard.className = `glass-card rounded-xl shadow-lg p-6 mb-6`;
                nvrCard.innerHTML = `
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold section-title flex items-center">
                            <span class="w-4 h-4 bg-blue-500 rounded-full mr-3"></span>
                            ${nvr.nvr_name} (${nvr.channels} ช่อง)
                        </h2>
                        <div class="text-sm text-gray-600">
                            <span id="${currentBuilding}-nvr${nvr.id}-online">0</span>/<span>${nvr.channels}</span> ออนไลน์
                        </div>
                    </div>
                    <div id="${currentBuilding}-nvr${nvr.id}-channels" class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
                    </div>
                `;

                container.appendChild(nvrCard);

                const channelsContainer = document.getElementById(`${currentBuilding}-nvr${nvr.id}-channels`);

                for (let i = 1; i <= nvr.channels; i++) {
                    const channelId = `${currentBuilding}-nvr${nvr.id}-ch${i}`;
                    const isOnline = channelStatus[channelId];
                    const channelElement = createChannelElement(currentBuilding, nvr, i, isOnline);
                    channelsContainer.appendChild(channelElement);
                }
            });
        }

        function updateStatistics() {
            const config = buildingConfigs[currentBuilding];
            let totalChannels = 0;
            let onlineChannels = 0;

            config.nvrs.forEach(nvr => {
                let nvrOnline = 0;
                totalChannels += parseInt(nvr.channels);

                for (let i = 1; i <= nvr.channels; i++) {
                    const channelId = `${currentBuilding}-nvr${nvr.id}-ch${i}`;
                    if (channelStatus[channelId]) {
                        onlineChannels++;
                        nvrOnline++;
                    }
                }

                const onlineElement = document.getElementById(`${currentBuilding}-nvr${nvr.id}-online`);
                if (onlineElement) {
                    onlineElement.textContent = nvrOnline;
                }
            });

            const offlineChannels = totalChannels - onlineChannels;
            const onlinePercentage = totalChannels > 0 ? Math.round((onlineChannels / totalChannels) * 100) : 0;

            document.getElementById('total-channels').textContent = totalChannels;
            document.getElementById('online-count').textContent = onlineChannels;
            document.getElementById('offline-count').textContent = offlineChannels;
            document.getElementById('online-percentage').textContent = `${onlinePercentage}%`;
        }

        function switchBuilding(building) {
            currentBuilding = building;
            const config = buildingConfigs[building];

            document.getElementById('current-building').textContent = `อาคาร ${building}`;

            // Set description for each building
            let description = '';
            if (building === 'B2') description = `ศูนย์กลางโรงงาน • ${config.nvrs.length} NVRs`;
            else if (building === 'B3') description = `อาคารสำนักงาน • ${config.nvrs.length} NVRs`;
            else if (building === 'B4') description = `อาคารผลิต • ${config.nvrs.length} NVRs`;
            else if (building === 'B9') description = `Bio Building • ${config.nvrs.length} NVRs`;
            document.getElementById('building-description').textContent = description;

            toggleBuildingButton(building);

            initializeChannels();
            renderNVRCards();
            updateStatistics(); // Ensure summary is rendered
        }

        function refreshStatus() {
            const refreshBtn = document.getElementById('refresh-btn');
            const refreshText = document.getElementById('refresh-text');

            refreshBtn.disabled = true;
            refreshText.textContent = '🔄 กำลังรีเฟรช...';

            setTimeout(() => {
                initializeChannels(); // Re-initialize channels from the latest report
                renderNVRCards();
                updateStatistics();

                refreshBtn.disabled = false;
                refreshText.textContent = 'อัพเดตข้อมูล';
            }, 1500);
        }

        async function sendStatusReport() {
            const reportBtn = document.getElementById('report-btn');
            const reportText = document.getElementById('report-text');

            reportBtn.disabled = true;
            reportText.textContent = '📊 กำลังส่งรายงาน...';

            try {
                console.log('sendStatusReport: channelStatus before getCurrentStatistics', channelStatus); // Debug log
                const stats = getCurrentStatistics();

                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ action: 'save_report', stats: stats, building: currentBuilding }),
                });

                const result = await response.json();

                if (result.status === 'success') {
                    showToast('ส่งรายงานสถานะเรียบร้อยแล้ว', 'success');
                    location.reload();
                } else {
                    showToast('เกิดข้อผิดพลาดในการส่งรายงาน', 'error');
                }

            } catch (error) {
                showToast('เกิดข้อผิดพลาดในการส่งรายงาน', 'error');
            } finally {
                reportBtn.disabled = false;
                reportText.textContent = '📊 ส่งรายงานสถานะ';
            }
        }

        function getCurrentStatistics() {
            const config = buildingConfigs[currentBuilding];
            let totalChannels = 0;
            let onlineChannels = 0;
            const nvrStats = {};
            const fullChannelStatusByNVR = {}; // New structure

            config.nvrs.forEach(nvr => {
                let nvrOnline = 0;
                totalChannels += parseInt(nvr.channels);
                fullChannelStatusByNVR[nvr.nvr_name] = {}; // Initialize for this NVR

                for (let i = 1; i <= nvr.channels; i++) {
                    const channelId = `${currentBuilding}-nvr${nvr.id}-ch${i}`;
                    const isOnline = channelStatus[channelId]; // Get status from global channelStatus
                    console.log(`getCurrentStatistics: channelId: ${channelId}, channelStatus[channelId]: ${channelStatus[channelId]}, isOnline: ${isOnline}`); // Debug log
                    if (isOnline) {
                        onlineChannels++;
                        nvrOnline++;
                    }
                    fullChannelStatusByNVR[nvr.nvr_name][i] = isOnline; // Store individual channel status
                }

                nvrStats[nvr.nvr_name] = {
                    online_channels: nvrOnline,
                    total_channels: parseInt(nvr.channels)
                };
            });

            const offlineChannels = totalChannels - onlineChannels;
            const onlinePercentage = totalChannels > 0 ? Math.round((onlineChannels / totalChannels) * 100) : 0;

            return {
                total: totalChannels,
                online: onlineChannels,
                offline: offlineChannels,
                percentage: onlinePercentage,
                nvrStats: nvrStats,
                fullChannelStatusByNVR: fullChannelStatusByNVR
            };
        }

        function renderNVRSummary() {
            const container = document.getElementById('nvr-summary-list');
            const summaryBuildingName = document.getElementById('summary-building-name');
            if (!container) return;

            summaryBuildingName.textContent = currentBuilding;
            container.innerHTML = '';

            const config = buildingConfigs[currentBuilding];
            config.nvrs.forEach(nvr => {
                let onlineCount = 0;
                let total = parseInt(nvr.channels);

                for (let i = 1; i <= total; i++) {
                    const channelId = `${currentBuilding}-nvr${nvr.id}-ch${i}`;
                    if (channelStatus[channelId]) onlineCount++;
                }

                const percentage = Math.round((onlineCount / total) * 100);
                const colorClass = percentage === 100 ? 'bg-green-100 text-green-800' : (percentage >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800');

                const card = document.createElement('div');
                card.className = `p-4 rounded-xl border ${colorClass.replace('bg-', 'border-').replace('text-', 'border-opacity-30 ')} ${colorClass}`;
                card.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-lg">${nvr.nvr_name}</span>
                        <span class="text-sm font-semibold px-2 py-1 rounded bg-white bg-opacity-50">${percentage}%</span>
                    </div>
                    <div class="flex justify-between items-end">
                        <span class="text-xs opacity-80">${nvr.area}</span>
                        <span class="text-xl font-bold">${onlineCount}<span class="text-sm font-normal opacity-75">/${total}</span></span>
                    </div>
                    <div class="w-full bg-white bg-opacity-30 rounded-full h-2.5 mt-2">
                        <div class="bg-current h-2.5 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        function updateStatistics() {
            const stats = getCurrentStatistics();

            document.getElementById('total-channels').textContent = stats.total;
            document.getElementById('online-count').textContent = stats.online;
            document.getElementById('offline-count').textContent = stats.offline;
            document.getElementById('online-percentage').textContent = `${stats.percentage}%`;

            renderNVRSummary();
        }

        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transform transition-all duration-300 ${type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`;
            toast.textContent = message;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
            }, 100);

            setTimeout(() => {
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        }

        function exportTableToCSV(filename) {
            const csv = [];
            const rows = document.querySelectorAll("table tr");
            
            for (let i = 0; i < rows.length; i++) {
                const row = [], cols = rows[i].querySelectorAll("td, th");
                
                if (cols.length === 1 && cols[0].getAttribute("colspan")) {
                    continue;
                }
                
                for (let j = 0; j < cols.length; j++) {
                    let text = cols[j].getAttribute("title") || cols[j].innerText.trim();
                    text = text.replace(/"/g, '""');
                    row.push('"' + text + '"');
                }
                
                csv.push(row.join(","));
            }

            const csvContent = "\uFEFF" + csv.join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            // Restore selected building from localStorage or default to B2
            const savedBuilding = localStorage.getItem('selectedBuilding') || 'B2';
            const validBuildings = ['B2', 'B3', 'B4', 'B9'];
            const buildingToLoad = validBuildings.includes(savedBuilding) ? savedBuilding : 'B2';

            switchBuilding(buildingToLoad);
            toggleBuildingButton(buildingToLoad);

            document.getElementById('select-b2').addEventListener('click', () => { switchBuilding('B2'); localStorage.setItem('selectedBuilding', 'B2'); });
            document.getElementById('select-b3').addEventListener('click', () => { switchBuilding('B3'); localStorage.setItem('selectedBuilding', 'B3'); });
            document.getElementById('select-b4').addEventListener('click', () => { switchBuilding('B4'); localStorage.setItem('selectedBuilding', 'B4'); });
            document.getElementById('select-b9').addEventListener('click', () => { switchBuilding('B9'); localStorage.setItem('selectedBuilding', 'B9'); });
            document.getElementById('refresh-btn').addEventListener('click', refreshStatus);
            document.getElementById('report-btn').addEventListener('click', sendStatusReport);
        });
    </script>
</body>

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