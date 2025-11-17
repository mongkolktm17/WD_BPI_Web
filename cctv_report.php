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

// Fetch report history
$report_history_result = $conn->query("
    SELECT cr.*, u.username 
    FROM cctv_reports cr
    LEFT JOIN users u ON cr.submitted_by_id = u.id
    ORDER BY cr.report_time DESC 
    LIMIT 10
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
                <a href="report_page.php" class="block bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded-xl hover:bg-blue-300 transition-colors shadow-md mb-2">กลับ หน้ารายงาน</a>
                <div>
                    <p class="text-sm text-slate-600">User: <span class="font-semibold text-slate-800"><?php echo htmlspecialchars($current_username); ?></span></p>
                    <a href="logout.php" class="text-sm text-red-600 hover:text-red-700 underline">ออกจากระบบ</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Controls -->
    <div class="glass-card rounded-3xl shadow-xl p-8 mb-8 text-center">
     <div class="mt-6 flex justify-center gap-4 mb-6">
      <button id="select-b4" class="toggle-btn flex-1 px-6 py-4 border-2 border-sky-500 bg-sky-100 text-sky-700 rounded-2xl font-medium"> 🏢 อาคาร B.4 </button>
      <button id="select-b3" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 text-gray-600 rounded-2xl font-medium"> 🏢 อาคาร B.3 </button>
     </div>
     <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button id="refresh-btn" class="submit-btn-modern text-white px-8 py-3 rounded-full font-semibold text-lg shadow-lg"> <span id="refresh-text">🔄 รีเฟรชสถานะ</span> </button>
      <button id="report-btn" class="submit-btn-modern text-white px-8 py-3 rounded-full font-semibold text-lg shadow-lg transition-all duration-300 hover:scale-105"> <span id="report-text">📊 ส่งรายงานสถานะ</span> </button>
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
   <div id="nvr-container" class="space-y-8">
   </div>
   <div class="mt-12 glass-card rounded-3xl shadow-xl p-6">
    <div class="flex items-center justify-between mb-6">
     <h2 id="history-title" class="text-2xl font-bold section-title flex items-center"><span class="text-3xl mr-3">📋</span> ประวัติการบันทึกข้อมูล</h2>
     <div class="text-sm text-gray-600">
      รายการล่าสุด <span id="history-count">0</span> รายการ
     </div>
    </div>
    <div id="loading-history" class="text-center py-8 text-gray-500 hidden">
     <div class="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-4"></div>
     <p>กำลังโหลดข้อมูล...</p>
    </div>
    <div id="no-history" class="text-center py-12 text-gray-500">
     <div class="text-6xl mb-4">
      📊
     </div>
     <p class="text-lg">ยังไม่มีประวัติการบันทึกข้อมูล</p>
     <p class="text-sm mt-2">กดปุ่ม "ส่งรายงานสถานะ" เพื่อบันทึกข้อมูลครั้งแรก</p>
    </div>
    <div id="history-list" class="space-y-4 hidden">
    </div>
   </div>
  </main>
  <script>
        const buildingConfigs = <?php echo json_encode($building_configs); ?>;
        console.log('buildingConfigs:', buildingConfigs);
        let reportHistory = <?php echo json_encode($report_history); ?>;
        let currentBuilding = 'B.4';

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
            
            div.className = `channel-status p-3 rounded-lg text-center text-white font-semibold text-sm cursor-pointer transition-all duration-300 ${statusClasses}`;
            
            div.innerHTML = `CH-${channelNum}`;
            div.title = `Channel ${channelNum}`;
            
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
            
            element.className = `channel-status p-3 rounded-lg text-center text-white font-semibold text-sm cursor-pointer transition-all duration-300 ${statusClasses}`;
        }

        function toggleBuildingButton(building) {
            const b4Button = document.getElementById('select-b4');
            const b3Button = document.getElementById('select-b3');

            // Reset classes for both buttons
            b4Button.classList.remove('border-sky-500', 'bg-sky-100', 'text-sky-700', 'border-purple-500', 'bg-purple-100', 'text-purple-700');
            b3Button.classList.remove('border-sky-500', 'bg-sky-100', 'text-sky-700', 'border-purple-500', 'bg-purple-100', 'text-purple-700');
            b4Button.classList.add('border-gray-200', 'text-gray-600');
            b3Button.classList.add('border-gray-200', 'text-gray-600');

            if (building === 'B.4') {
                b4Button.classList.remove('border-gray-200', 'text-gray-600');
                b4Button.classList.add('border-sky-500', 'bg-sky-100', 'text-sky-700');
            } else if (building === 'B.3') {
                b3Button.classList.remove('border-gray-200', 'text-gray-600');
                b3Button.classList.add('border-purple-500', 'bg-purple-100', 'text-purple-700');
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
            document.getElementById('building-description').textContent = building === 'B.4' ? 'การออกแบบเวอร์ชั่น 2 - สไตล์คลาสสิค' : 'การออกแบบเวอร์ชั่น 3 - สไตล์โมเดิร์น';
            
            toggleBuildingButton(building);
            
            initializeChannels();
            renderNVRCards();
            updateStatistics();
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
                fullChannelStatusByNVR: fullChannelStatusByNVR // Send this
            };
        }

        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transform transition-all duration-300 ${
                type === 'success' ? 'bg-green-500' : 
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

        function renderHistoryList() {
            const historyList = document.getElementById('history-list');
            const noHistory = document.getElementById('no-history');
            const historyCount = document.getElementById('history-count');
            
            historyCount.textContent = reportHistory.length;
            
            if (reportHistory.length === 0) {
                historyList.classList.add('hidden');
                noHistory.classList.remove('hidden');
                return;
            }
            
            noHistory.classList.add('hidden');
            historyList.classList.remove('hidden');
            
            historyList.innerHTML = '';
            
            reportHistory.forEach((report, index) => {
                const reportDate = new Date(report.report_time);
                const formattedDate = reportDate.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const statusColor = report.online_percentage >= 90 ? 'text-green-600' : 
                                  report.online_percentage >= 70 ? 'text-yellow-600' : 'text-red-600';
                
                const historyItem = document.createElement('div');
                historyItem.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow duration-200';
                
                let nvrStatusHtml = '';
                for (const [nvr_name, details] of Object.entries(report.details)) {
                    nvrStatusHtml += `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded">${nvr_name}: ${details.online_channels}/${details.total_channels}</span>`;
                }

                historyItem.innerHTML = `
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div class="flex-1">
                            <div class="flex items-center mb-2">
                                <span class="text-2xl mr-3">📊</span>
                                <div>
                                    <h3 class="font-semibold text-gray-800">รายงานสถานะ ${report.building} #${report.id}</h3>
                                    <p class="text-sm text-gray-600">${formattedDate} (โดย: ${report.username || 'N/A'})</p>
                                </div>
                            </div>
                            <div class="ml-11">
                                <p class="text-sm text-gray-700 mb-2">${report.online_channels}/${report.total_channels} ช่องออนไลน์ (${report.online_percentage}%)</p>
                                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                                    ${nvrStatusHtml}
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 lg:mt-0 lg:ml-6 text-right">
                            <div class="text-2xl font-bold ${statusColor}">${report.online_percentage}%</div>
                            <div class="text-xs text-gray-500">ออนไลน์</div>
                        </div>
                    </div>
                `;
                
                historyList.appendChild(historyItem);
            });
        }

        document.addEventListener('DOMContentLoaded', async () => {
            switchBuilding('B.4');
            toggleBuildingButton('B.4');
            
            document.getElementById('select-b4').addEventListener('click', () => switchBuilding('B.4'));
            document.getElementById('select-b3').addEventListener('click', () => switchBuilding('B.3'));
            document.getElementById('refresh-btn').addEventListener('click', refreshStatus);
            document.getElementById('report-btn').addEventListener('click', sendStatusReport);

            renderHistoryList();
        });
    </script>
 </body>
</html>
