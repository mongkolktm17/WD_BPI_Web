<?php
require_once 'config.php'; // Use the new config file

// --- Session and Authentication ---
// Check if the user is logged in, otherwise redirect to login page
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

// Get user's full name from session for the checker field
$checker_name = isset($_SESSION["first_name"]) && isset($_SESSION["last_name"]) 
                ? $_SESSION["first_name"] . ' ' . $_SESSION["last_name"] 
                : 'Unknown';
$current_username = $_SESSION["username"] ?? 'Unknown';

// Fetch today's angle check records
$today_str = date('Y-m-d');
$records_result = $conn->query("SELECT * FROM cctv_angle_checks WHERE DATE(checked_date) = '{$today_str}'");
$angleCheckRecords = [];
while ($row = $records_result->fetch_assoc()) {
    $angleCheckRecords[] = $row;
}

// Function to scan for images and create a map
function createImageMap($dir) {
    $imageMap = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));

    foreach ($iterator as $file) {
        if ($file->isFile() && in_array(strtolower($file->getExtension()), ['jpg', 'jpeg', 'png', 'gif'])) {
            $path = $file->getPathname();
            
            // Normalize path to use forward slashes for regex compatibility
            $normalizedPath = str_replace('\\', '/', $path);

            // Regex to capture Building, NVR, and Channel numbers
            if (preg_match('/(B[\d]+)\/NVR(\d+)\/.*CH[\s-]*(\d+)/i', $normalizedPath, $matches)) {
                $building = strtoupper($matches[1]);
                $nvr = (int)$matches[2];
                $channel = (int)$matches[3];
                
                $key = "{$building}-{$nvr}-{$channel}";
                // Create a web-accessible path
                $webPath = str_replace(str_replace('\\', '/', __DIR__), '', $normalizedPath);
                $imageMap[$key] = ltrim($webPath, '/');
            }
        }
    }
    return $imageMap;
}

$imageBaseDir = __DIR__ . '/report_assets/Images';
$imageMap = createImageMap($imageBaseDir);

// Close the connection
$conn->close();
?>
<!doctype html>
<html lang="th">
 <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>รายงานมุมกล้องวงจรปิด</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      box-sizing: border-box;
      font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
    }
    
    .camera-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    
    .camera-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      transition: all 0.3s ease;
      cursor: pointer;
      background: white;
    }
    
    .camera-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    
    .camera-card.correct {
      border-color: #10b981;
      background-color: #f0fdf4;
    }
    
    .camera-card.incorrect {
      border-color: #ef4444;
      background-color: #fef2f2;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-correct {
      background-color: #d1fae5;
      color: #065f46;
    }
    
    .status-incorrect {
      background-color: #fee2e2;
      color: #991b1b;
    }
    
    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }
    
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .modal.active {
      display: flex;
    }
    
    .modal-content {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 600px;
      width: 90%;
      max-height: 90%;
      overflow-y: auto;
    }
    
    .camera-preview {
      width: 100%;
      height: 300px; /* Increased height for better image view */
      background-color: #f3f4f6; /* Lighter background */
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
    }

    .camera-preview img {
        width: 100%;
        height: 100%;
        object-fit: contain; /* Show the whole image */
    }
    
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }
    
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 34px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #10b981;
    }
    
    input:checked + .slider:before {
      transform: translateX(26px);
    }
    
    .camera-icon {
      width: 80px;
      height: 80px;
      background: #2d3748;
      border-radius: 8px;
      position: relative;
      margin: 0 auto 16px;
    }
    
    .camera-lens {
      width: 40px;
      height: 40px;
      background: #1a202c;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border: 3px solid #4a5568;
    }
    
    .camera-lens::after {
      content: '';
      width: 20px;
      height: 20px;
      background: #2d3748;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    
    .led-light {
      width: 6px;
      height: 6px;
      background: #ef4444;
      border-radius: 50%;
      position: absolute;
      top: 15px;
      right: 15px;
      box-shadow: 0 0 8px #ef4444;
    }
    
    .camera-mount {
      width: 20px;
      height: 8px;
      background: #4a5568;
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 0 0 4px 4px;
    }
  </style>
  <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
 </head>
 <body class="min-h-full bg-blue-50 text-slate-800">
  <div class="min-h-full p-4 sm:p-6">
   <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8 p-6 sm:p-8 rounded-xl shadow-lg bg-white bg-opacity-50 backdrop-blur-md border border-gray-200">
        <div class="flex justify-between items-start">
            <!-- Left side: Title and Subtitle -->
            <div>
                <h1 id="pageTitle" class="text-3xl sm:text-4xl font-bold mb-2 text-gray-800">รายงานมุมกล้องวงจรปิดประจำวัน</h1>
                <p class="text-base sm:text-lg text-gray-600">ระบบตรวจสอบและบันทึกมุมกล้อง CCTV ว่าถูกต้องหรือไม่</p>
                <div class="mt-4 text-sm text-gray-500" id="currentDate"></div>
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
    </div><!-- Summary Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
     <div class="bg-white p-4 rounded-lg shadow-md">
      <div class="text-slate-600 text-sm mb-1">
       กล้องทั้งหมด
      </div>
      <div class="text-3xl font-bold text-blue-700" id="totalCameras">
       0
      </div>
     </div>
     <div class="bg-white p-4 rounded-lg shadow-md">
      <div class="text-slate-600 text-sm mb-1">
       มุมถูกต้อง
      </div>
      <div class="text-3xl font-bold text-green-600" id="correctCameras">
       0
      </div>
     </div>
     <div class="bg-white p-4 rounded-lg shadow-md">
      <div class="text-slate-600 text-sm mb-1">
       มุมไม่ถูกต้อง
      </div>
      <div class="text-3xl font-bold text-red-600" id="incorrectCameras">
       0
      </div>
     </div>
     <div class="bg-white p-4 rounded-lg shadow-md">
      <div class="text-slate-600 text-sm mb-1">
       รอตรวจสอบ
      </div>
      <div class="text-3xl font-bold text-amber-600" id="pendingCameras">
       0
      </div>
     </div>
    </div><!-- Building Tabs -->
    <div class="mb-6">
     <div id="buildingTabs" class="flex flex-wrap justify-center sm:justify-start gap-2 border-b-2 border-blue-200">
        <!-- Building tabs will be generated here -->
     </div>
    </div><!-- NVR Selection -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow-md"><label class="block text-sm font-semibold text-slate-700 mb-2">เลือก NVR:</label>
     <div id="nvrButtons" class="flex flex-wrap justify-center sm:justify-start gap-2"></div>
    </div><!-- Camera Grid -->
    <div class="bg-white p-4 sm:p-6 rounded-lg shadow-md">
     <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
      <h2 class="text-xl font-bold text-slate-800" id="currentNVRTitle"></h2>
      <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"><button onclick="markAllCorrect()" class="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"> ✓ ทั้งหมดถูกต้อง </button> <button onclick="saveReport()" class="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"> 💾 บันทึกรายงาน </button>
      </div>
     </div>
     <div id="cameraGrid" class="camera-grid gap-2 sm:gap-4"></div>
    </div>
   </div>
  </div><!-- Modal for Camera Details -->
  <div id="cameraModal" class="modal">
   <div class="modal-content p-6 sm:p-8">
    <div class="flex justify-between items-center mb-4 sm:mb-6">
     <h3 class="text-2xl font-bold text-slate-800" id="modalTitle"></h3><button onclick="closeModal()" class="text-slate-500 hover:text-slate-700 text-3xl">&times;</button>
    </div>
    <div id="cameraPreview" class="camera-preview mb-4 sm:mb-6">
     <div class="camera-icon">
      <div class="camera-lens"></div>
      <div class="led-light"></div>
      <div class="camera-mount"></div>
     </div>
     <div class="absolute bottom-4 left-4 text-white text-sm opacity-75">
      ภาพตัวอย่างกล้อง CCTV
     </div>
    </div>
    <div class="mb-4 sm:mb-6"><label class="block text-lg font-semibold text-slate-700 mb-2 sm:mb-4">มุมกล้องถูกต้องหรือไม่?</label>
     <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
      <div class="flex items-center gap-4"><span class="text-red-600 font-semibold">ไม่ถูกต้อง</span> <label class="toggle-switch"> <input type="checkbox" id="angleToggle"> <span class="slider"></span> </label> <span class="text-green-600 font-semibold">ถูกต้อง</span>
      </div>
      <div id="statusDisplay" class="status-badge status-pending">
       รอตรวจสอบ
      </div>
     </div>
    </div>
    <div class="mb-4 sm:mb-6 relative">
        <label class="block text-sm font-semibold text-slate-700 mb-2">หมายเหตุ:</label>
        <textarea id="notesInput" rows="3" class="w-full p-3 border-blue-200 rounded-lg pr-12" placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี) หรือใช้ไมโครโฟน"></textarea>
        <button type="button" id="mic-notesInput" onclick="startSpeechRecognition('notesInput')" class="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 hover:text-blue-600"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path></svg></button>
    </div>
    <div class="mb-4 sm:mb-6"><label class="block text-sm font-semibold text-slate-700 mb-2">ผู้ตรวจสอบ:</label> <input type="text" id="checkerInput" class="w-full p-3 border-blue-200 rounded-lg" placeholder="ชื่อผู้ตรวจสอบ">
    </div>
    <div class="flex flex-col sm:flex-row gap-3"><button onclick="saveCamera()" class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"> 💾 บันทึกผลการตรวจสอบ </button> <button onclick="closeModal()" class="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"> ยกเลิก </button>
    </div>
   </div>
  </div>
  <script>
    const buildingConfig = {
      'B2': { nvrs: 10, cameras: 32 },
      'B3': { nvrs: 2, cameras: [32, 60] }
    };
    const initialRecords = <?php echo json_encode($angleCheckRecords); ?>;
    const imageMap = <?php echo json_encode($imageMap); ?>;
    const checkerName = <?php echo json_encode($checker_name); ?>;

    let currentBuilding = Object.keys(buildingConfig)[0] || '';
    let currentNVR = 1;
    let selectedCamera = null;
    let allRecords = [];

    const placeholderIcon = `
        <div class="camera-icon">
            <div class="camera-lens"></div>
            <div class="led-light"></div>
            <div class="camera-mount"></div>
        </div>
        <div class="absolute bottom-4 left-4 text-white text-sm opacity-75">
            ไม่มีภาพตัวอย่าง
        </div>`;

    function initializeApp() {
      allRecords = initialRecords.map(r => ({
          ...r,
          id: `${r.building}-NVR${r.nvr_number}-CAM${r.camera_number}`,
          angle_correct: !!parseInt(r.angle_correct) // Convert DB value to boolean
      }));

      updateDate();
      renderBuildingTabs();
      if(currentBuilding) {
        switchBuilding(currentBuilding);
      }
      setupToggleListener();
    }

    function getCameraCount(building, nvr) {
        const config = buildingConfig[building];
        if (!config) return 0;
        if (Array.isArray(config.cameras)) {
            return config.cameras[nvr - 1] || 0;
        }
        return config.cameras || 0;
    }

    function renderBuildingTabs() {
        const tabsContainer = document.getElementById('buildingTabs');
        tabsContainer.innerHTML = '';
        for (const buildingName in buildingConfig) {
            const button = document.createElement('button');
            button.id = `tab${buildingName}`;
            button.className = 'px-6 py-3 font-semibold transition-all border-b-4 border-transparent';
            button.innerHTML = `<span>อาคาร ${buildingName}</span>`;
            button.onclick = () => switchBuilding(buildingName);
            tabsContainer.appendChild(button);
        }
    }

    function setupToggleListener() {
      const toggle = document.getElementById('angleToggle');
      const statusDisplay = document.getElementById('statusDisplay');
      
      toggle.addEventListener('change', function() {
        if (this.checked) {
          statusDisplay.textContent = 'ถูกต้อง';
          statusDisplay.className = 'status-badge status-correct';
        } else {
          statusDisplay.textContent = 'ไม่ถูกต้อง';
          statusDisplay.className = 'status-badge status-incorrect';
        }
      });
    }

    function updateDate() {
      const now = new Date();
      const dateStr = now.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
      document.getElementById('currentDate').textContent = `วันที่: ${dateStr}`;
    }

    function switchBuilding(building) {
      currentBuilding = building;
      currentNVR = 1;
      
      // Update active tab style
      document.querySelectorAll('#buildingTabs button').forEach(tab => {
        if (tab.id === `tab${building}`) {
            tab.classList.add('border-blue-500', 'text-blue-700');
            tab.classList.remove('text-slate-500', 'hover:text-slate-700');
        } else {
            tab.classList.remove('border-blue-500', 'text-blue-700');
            tab.classList.add('text-slate-500', 'hover:text-slate-700');
        }
      });
      
      renderNVRButtons();
      renderCameraGrid();
      updateSummary();
    }

    function renderNVRButtons() {
      const container = document.getElementById('nvrButtons');
      const nvrCount = buildingConfig[currentBuilding].nvrs;
      
      container.innerHTML = '';
      for (let i = 1; i <= nvrCount; i++) {
        const button = document.createElement('button');
        button.textContent = `NVR ${i}`;
        button.className = `px-4 py-2 rounded-lg font-semibold transition-colors ${i === currentNVR ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`;
        button.onclick = () => selectNVR(i);
        container.appendChild(button);
      }
    }

    function selectNVR(nvrNumber) {
      currentNVR = nvrNumber;
      renderNVRButtons();
      renderCameraGrid();
    }

    function renderCameraGrid() {
      const container = document.getElementById('cameraGrid');
      const cameraCount = getCameraCount(currentBuilding, currentNVR);
      
      document.getElementById('currentNVRTitle').textContent = 
        `${currentBuilding} - NVR ${currentNVR} - กล้อง ${cameraCount} ตัว`;
      
      container.innerHTML = '';
      
      for (let i = 1; i <= cameraCount; i++) {
        const cameraId = `${currentBuilding}-NVR${currentNVR}-CAM${i}`;
        const record = allRecords.find(r => r.id === cameraId);
        
        let status = 'pending';
        let statusText = 'รอตรวจสอบ';
        let statusClass = 'status-pending';
        
        if (record) {
          if (record.angle_correct === true) {
            status = 'correct';
            statusText = 'ถูกต้อง';
            statusClass = 'status-correct';
          } else if (record.angle_correct === false) {
            status = 'incorrect';
            statusText = 'ไม่ถูกต้อง';
            statusClass = 'status-incorrect';
          }
        }
        
        const card = document.createElement('div');
        card.className = `camera-card ${status}`;
        card.onclick = () => openCameraModal(i, record);
        
        card.innerHTML = `
          <div class="text-center">
            <div class="camera-icon mx-auto mb-3">
              <div class="camera-lens"></div>
              <div class="led-light"></div>
              <div class="camera-mount"></div>
            </div>
            <div class="font-bold text-gray-800 mb-2">กล้อง ${i}</div>
            <span class="status-badge ${statusClass}">
              ${statusText}
            </span>
            ${record && record.notes ? `<div class="text-xs text-gray-600 mt-2 line-clamp-2">${record.notes}</div>` : ''}
          </div>
        `;
        
        container.appendChild(card);
      }
    }

    function openCameraModal(cameraNumber, record) {
        selectedCamera = cameraNumber;
        const modal = document.getElementById('cameraModal');
        const toggle = document.getElementById('angleToggle');
        const statusDisplay = document.getElementById('statusDisplay');
        const previewContainer = document.getElementById('cameraPreview');

        document.getElementById('modalTitle').textContent = 
            `${currentBuilding} - NVR ${currentNVR} - กล้อง ${cameraNumber}`;

        // Find and display the image
        const imageKey = `${currentBuilding}-${currentNVR}-${cameraNumber}`;
        const imageUrl = imageMap[imageKey];

        if (imageUrl) {
            previewContainer.innerHTML = `<img src="${imageUrl}" alt="Camera ${cameraNumber} Preview">`;
        } else {
            previewContainer.innerHTML = placeholderIcon;
        }

        if (record) {
            toggle.checked = record.angle_correct === true;
            document.getElementById('notesInput').value = record.notes || '';
            document.getElementById('checkerInput').value = record.checked_by || checkerName;
            
            if (record.angle_correct === true) {
                statusDisplay.textContent = 'ถูกต้อง';
                statusDisplay.className = 'status-badge status-correct';
            } else if (record.angle_correct === false) {
                statusDisplay.textContent = 'ไม่ถูกต้อง';
                statusDisplay.className = 'status-badge status-incorrect';
            } else {
                statusDisplay.textContent = 'รอตรวจสอบ';
                statusDisplay.className = 'status-badge status-pending';
            }
        } else {
            toggle.checked = false;
            document.getElementById('notesInput').value = '';
            document.getElementById('checkerInput').value = checkerName;
            statusDisplay.textContent = 'รอตรวจสอบ';
            statusDisplay.className = 'status-badge status-pending';
        }

        document.getElementById('checkerInput').readOnly = true;
        
        modal.classList.add('active');
    }

    function closeModal() {
      document.getElementById('cameraModal').classList.remove('active');
      selectedCamera = null;
    }

    async function saveCamera() {
        if (!selectedCamera) return;

        const cameraId = `${currentBuilding}-NVR${currentNVR}-CAM${selectedCamera}`;
        const angleCorrect = document.getElementById('angleToggle').checked;
        const notes = document.getElementById('notesInput').value;
        const checkedBy = document.getElementById('checkerInput').value;

        if (!checkedBy.trim()) {
            showToast('กรุณาระบุชื่อผู้ตรวจสอบ', 'error');
            return;
        }

        const recordData = {
            building: currentBuilding,
            nvr_number: currentNVR,
            camera_number: selectedCamera,
            angle_correct: angleCorrect,
            notes: notes,
            checked_by: checkedBy
        };

        // Using Fetch API to send data to a new PHP endpoint
        try {
            const response = await fetch('save_angle_check.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(recordData),
            });

            const result = await response.json();

            if (result.success) {
                showToast('บันทึกข้อมูลสำเร็จ', 'success');
                // Here you would ideally re-fetch the data to update the UI
                // For now, we'll just close the modal
                closeModal();
                // Fake update for now
                const recordIndex = allRecords.findIndex(r => r.id === cameraId);
                if (recordIndex > -1) {
                    allRecords[recordIndex] = { ...allRecords[recordIndex], ...recordData, id: cameraId };
                } else {
                    allRecords.push({ ...recordData, id: cameraId });
                }
                renderCameraGrid();
                updateSummary();
            } else {
                showToast('เกิดข้อผิดพลาดในการบันทึก: ' + result.message, 'error');
            }
        } catch (error) {
            showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
            console.error('Save error:', error);
        }
    }


    async function markAllCorrect() {
      const cameraCount = getCameraCount(currentBuilding, currentNVR);
      const checkedBy = checkerName;

      showToast('กำลังบันทึกข้อมูล... กรุณารอสักครู่', 'info');

      const recordsToSave = [];
      for (let i = 1; i <= cameraCount; i++) {
        const cameraId = `${currentBuilding}-NVR${currentNVR}-CAM${i}`;
        const existingRecord = allRecords.find(r => r.id === cameraId);
        
        if (!existingRecord || existingRecord.angle_correct === null || existingRecord.angle_correct === undefined) {
          recordsToSave.push({
            building: currentBuilding,
            nvr_number: currentNVR,
            camera_number: i,
            angle_correct: true,
            notes: 'ตรวจสอบแบบกลุ่ม - มุมถูกต้อง',
            checked_by: checkedBy
          });
        }
      }

        if (recordsToSave.length === 0) {
            showToast('ไม่มีรายการใหม่ให้บันทึก', 'info');
            return;
        }

      try {
            const response = await fetch('save_angle_check.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(recordsToSave), // Send as an array
            });

            const result = await response.json();

            if (result.success) {
                showToast('บันทึกทั้งหมดเป็นมุมถูกต้องแล้ว', 'success');
                // Fake update UI
                recordsToSave.forEach(recordData => {
                    const cameraId = `${recordData.building}-NVR${recordData.nvr_number}-CAM${recordData.camera_number}`;
                    const recordIndex = allRecords.findIndex(r => r.id === cameraId);
                    if (recordIndex > -1) {
                        allRecords[recordIndex] = { ...allRecords[recordIndex], ...recordData, id: cameraId };
                    } else {
                        allRecords.push({ ...recordData, id: cameraId });
                    }
                });
                renderCameraGrid();
                updateSummary();
            } else {
                showToast('เกิดข้อผิดพลาดในการบันทึก: ' + result.message, 'error');
            }
        } catch (error) {
            showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
            console.error('Mark all correct error:', error);
        }
    }

    function updateSummary() {
        let totalCameras = 0;
        for (const building in buildingConfig) {
            const bcfg = buildingConfig[building];
            if (Array.isArray(bcfg.cameras)) {
                totalCameras += bcfg.cameras.reduce((sum, count) => sum + count, 0);
            } else {
                totalCameras += bcfg.nvrs * bcfg.cameras;
            }
        }
      
      const correctCount = allRecords.filter(r => r.angle_correct === true).length;
      const incorrectCount = allRecords.filter(r => r.angle_correct === false).length;
      const checkedCount = correctCount + incorrectCount;
      const pendingCount = totalCameras - checkedCount;
      
      document.getElementById('totalCameras').textContent = totalCameras;
      document.getElementById('correctCameras').textContent = correctCount;
      document.getElementById('incorrectCameras').textContent = incorrectCount;
      document.getElementById('pendingCameras').textContent = pendingCount;
    }

    async function saveReport() {
      const cameraCountForNVR = getCameraCount(currentBuilding, currentNVR);
      const correctCount = allRecords.filter(r => 
            r.building === currentBuilding && 
            r.nvr_number === currentNVR && 
            r.angle_correct === true
          ).length;
      const incorrectCount = allRecords.filter(r => 
            r.building === currentBuilding && 
            r.nvr_number === currentNVR && 
            r.angle_correct === false
          ).length;

      const reportData = {
        building: currentBuilding,
        nvr: currentNVR,
        total_cameras: cameraCountForNVR,
        correct_cameras: correctCount,
        incorrect_cameras: incorrectCount,
        checked_by: checkerName
      };

      try {
            const response = await fetch('save_cctv_report.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reportData),
            });

            const result = await response.json();

            if (result.success) {
                showToast('บันทึกรายงานสำเร็จ', 'success');
            } else {
                showToast('เกิดข้อผิดพลาดในการบันทึกรายงาน: ' + result.message, 'error');
            }
        } catch (error) {
            showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
            console.error('Save report error:', error);
        }
    }

    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      const bgColor = {
          success: '#10b981',
          error: '#ef4444',
          info: '#3b82f6'
      }[type];

      toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-semibold z-50';
      toast.style.backgroundColor = bgColor;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    // Initial load
    initializeApp();

    function startSpeechRecognition(elementId) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("ขออภัย เบราว์เซอร์ของคุณไม่รองรับการแปลงเสียงเป็นข้อความ");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        const micButton = document.getElementById('mic-' + elementId);
        const targetElement = document.getElementById(elementId);

        recognition.onstart = function() {
            micButton.classList.add('text-red-500');
            micButton.classList.remove('text-gray-400');
        };

        recognition.onspeechend = function() {
            recognition.stop();
        };
        
        recognition.onend = function() {
            micButton.classList.remove('text-red-500');
            micButton.classList.add('text-gray-400');
        };

        recognition.onresult = function(event) {
            const speechResult = event.results[0][0].transcript;
            targetElement.value += (targetElement.value.length > 0 ? ' ' : '') + speechResult;
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            alert('เกิดข้อผิดพลาดในการจดจำเสียง: ' + event.error);
        };

        recognition.start();
    }
  </script>
 </body>
</html>
