<!doctype html>
<html lang="th">
 <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WD Security Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
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
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
        }
        
        .status-online { background-color: #10b981; }
        .status-offline { background-color: #ef4444; }
        .status-warning { background-color: #f59e0b; }
    </style>
  <style>@view-transition { navigation: auto; }</style>
    <script>
        // Safe loader for optional SDKs: append script tags and log failures instead of throwing 404 errors.
        (function(){
            const sdkUrls = ['/_sdk/element_sdk.js','/_sdk/data_sdk.js'];
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
 </head>
 <body class="gradient-bg min-h-full">
  <div class="container mx-auto px-4 py-6"><!-- Header -->
   <header class="relative mb-8"><!-- Login Status and Settings -->
    <div class="flex flex-col items-center space-y-2 md:flex-row md:space-x-4 md:space-y-0 md:absolute md:top-0 md:right-0"><!-- User Status -->
     <div class="flex items-center bg-white rounded-lg px-4 py-2 card-shadow">
      <div class="w-3 h-3 bg-green-500 rounded-full mr-2 pulse-animation"></div>
      <div class="text-sm">
       <div class="font-semibold text-blue-900" id="user-name">
        Admin User
       </div>
       <div class="text-blue-600 text-xs" id="user-role">
        System Administrator
       </div>
      </div>
     </div><!-- Report Button -->
     <a href="report_page.php" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg card-shadow transition-colors flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>
        <span>รายงาน</span>
     </a>
     <!-- Settings Button --> <button id="settings-btn" class="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg card-shadow transition-colors">
      <svg class="w-5 h-5" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
      </svg></button>
    </div><!-- Main Header Content -->
    <div class="text-center flex flex-col items-center">
     <h1 id="dashboard-title" class="text-4xl font-bold text-blue-900 mb-2">Security System Dashboard</h1>
     <h2 id="company-name" class="text-2xl text-blue-700">Western Digital Factory</h2>
     <div class="mt-4 text-blue-600"><span id="current-time" class="text-lg font-medium"></span>
     </div>
    </div>
   </header><!-- Security Personnel Section -->
   <section class="mb-8">
    <h3 id="security-section-title" class="text-2xl font-bold text-blue-900 mb-4">Security Personnel Status <span class="text-sm text-gray-500 ml-2">(Last Update: <span id="security-last-update"></span>)</span></h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
     <div class="bg-white rounded-lg p-6 card-shadow">
      <div class="flex items-center justify-between">
       <div>
        <h4 class="text-lg font-semibold text-blue-800 flex items-center">
         <svg class="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
         </svg> Day Shift</h4>
        <p class="text-3xl font-bold text-blue-600" id="day-shift-count">0</p>
        <p class="text-sm text-gray-600">06:00 - 18:00</p>
        <p class="text-xs text-green-600 font-medium mt-1">✓ Full Coverage</p>
       </div>
       <div>
        <img src="report_assets/Images/security-officer.png" alt="Day Shift" class="w-12 h-12 object-contain" />
       </div>
      </div>
     </div>
     <div class="bg-white rounded-lg p-6 card-shadow">
      <div class="flex items-center justify-between">
       <div>
        <h4 class="text-lg font-semibold text-blue-800 flex items-center">
         <svg class="w-5 h-5 mr-2 text-indigo-600" fill="currentColor" viewbox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
         </svg> Night Shift</h4>
        <p class="text-3xl font-bold text-blue-600" id="night-shift-count">0</p>
        <p class="text-sm text-gray-600">18:00 - 06:00</p>
        <p class="text-xs text-yellow-600 font-medium mt-1">⚠ Reduced Staff</p>
       </div>
       <div>
        <img src="report_assets/Images/security-officer.png" alt="Night Shift" class="w-12 h-12 object-contain" />
       </div>
      </div>
     </div>
     <div class="bg-white rounded-lg p-6 card-shadow border-2 border-blue-300">
      <div class="flex items-center justify-between">
       <div>
        <h4 class="text-lg font-semibold text-blue-800">Total Active</h4>
        <p class="text-3xl font-bold text-blue-600" id="current-shift-count">15</p>
        <p class="text-sm font-medium" id="current-shift-status">Day Shift Active</p>
        <p class="text-xs text-gray-500 mt-1" id="shift-change-time">Next change: 18:00</p>
       </div>
       <div>
        <img src="report_assets/Images/security-officer.png" alt="Total Active" class="w-12 h-12 object-contain" />
       </div>
      </div>
     </div>
    </div>
   </section><!-- NVR Status Section -->
   <section class="mb-8">
    <h3 id="nvr-section-title" class="text-2xl font-bold text-blue-900 mb-4">NVR Recording Status</h3>
    <div class="mb-4 p-4 bg-blue-50 rounded-lg">
     <div class="flex items-center text-sm text-blue-800">
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
      </svg><span><strong>Last Update:</strong> <span id="nvr-last-update">-</span></span>
     </div>
    </div>
    <!-- Summary Card with Gradient -->
    <div class="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white card-shadow">
     <div class="flex items-center justify-between flex-wrap">
      <div>
       <h4 class="text-xl font-semibold mb-2">NVR Recording Status Summary</h4>
       <div class="text-3xl font-bold" id="nvr-summary-total">
        0/0 (<span id="nvr-summary-percentage">0</span>%)
       </div>
       <div class="text-blue-100 text-sm">
        NVR ที่ผ่านเกณฑ์ / รวม (เปอร์เซ็นต์)
       </div>
      </div>
      <div class="text-right">
       <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="text-center">
         <div class="text-2xl font-bold text-green-300" id="nvr-summary-pass">
          0
         </div>
         <div class="text-blue-100">
          ผ่านเกณฑ์
         </div>
        </div>
        <div class="text-center">
         <div class="text-2xl font-bold text-red-300" id="nvr-summary-fail">
          0
         </div>
         <div class="text-blue-100">
          ไม่ผ่านเกณฑ์
         </div>
        </div>
       </div>
      </div>
     </div>
    </div>
    <!-- Building Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div class="bg-white rounded-lg p-4 md:p-6 card-shadow" data-building="B.2">
            <h4 class="text-base md:text-lg font-semibold text-blue-800 mb-3 md:mb-4">Building B.2</h4>
            <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 mb-1" id="nvr-progressbar-62-B_2">
                <div class="h-2.5 rounded-full" id="nvr-progressbar-fill-62-B_2" style="width: 0%"></div>
            </div>
            <p class="text-sm text-slate-500 mt-2">
                <span class="font-bold text-green-600" id="nvr-passcount-62-B_2">0</span> / <span id="nvr-totalcount-62-B_2">0</span> ผ่านเกณฑ์
            </p>
            <div class="mt-2 md:mt-3 text-xs text-gray-500">
                <div id="nvr-count-62-B_2">รวม NVR: 0 เครื่อง</div>
            </div>
        </div>
    <div class="bg-white rounded-lg p-4 md:p-6 card-shadow" data-building="B.3">
        <h4 class="text-base md:text-lg font-semibold text-blue-800 mb-3 md:mb-4">Building B.3</h4>
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 mb-1" id="nvr-progressbar-62-B_3">
            <div class="h-2.5 rounded-full" id="nvr-progressbar-fill-62-B_3" style="width: 0%"></div>
        </div>
        <p class="text-sm text-slate-500 mt-2">
            <span class="font-bold text-green-600" id="nvr-passcount-62-B_3">0</span> / <span id="nvr-totalcount-62-B_3">0</span> ผ่านเกณฑ์
        </p>
        <div class="mt-2 md:mt-3 text-xs text-gray-500">
            <div id="nvr-count-62-B_3">รวม NVR: 0 เครื่อง</div>
        </div>
    </div>
    <div class="bg-white rounded-lg p-4 md:p-6 card-shadow" data-building="B.4">
        <h4 class="text-base md:text-lg font-semibold text-blue-800 mb-3 md:mb-4">Building B.4</h4>
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 mb-1" id="nvr-progressbar-62-B_4">
            <div class="h-2.5 rounded-full" id="nvr-progressbar-fill-62-B_4" style="width: 0%"></div>
        </div>
        <p class="text-sm text-slate-500 mt-2">
            <span class="font-bold text-green-600" id="nvr-passcount-62-B_4">0</span> / <span id="nvr-totalcount-62-B_4">0</span> ผ่านเกณฑ์
        </p>
        <div class="mt-2 md:mt-3 text-xs text-gray-500">
            <div id="nvr-count-62-B_4">รวม NVR: 0 เครื่อง</div>
        </div>
    </div>
        <div class="bg-white rounded-lg p-4 md:p-6 card-shadow" data-building="B.8">
            <h4 class="text-base md:text-lg font-semibold text-blue-800 mb-3 md:mb-4">Building B.8</h4>
            <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 mb-1" id="nvr-progressbar-62-B_8">
                <div class="h-2.5 rounded-full" id="nvr-progressbar-fill-62-B_8" style="width: 0%"></div>
            </div>
            <p class="text-sm text-slate-500 mt-2">
                <span class="font-bold text-green-600" id="nvr-passcount-62-B_8">0</span> / <span id="nvr-totalcount-62-B_8">0</span> ผ่านเกณฑ์
            </p>
            <div class="mt-2 md:mt-3 text-xs text-gray-500">
                <div id="nvr-count-62-B_8">รวม NVR: 0 เครื่อง</div>
            </div>
        </div>    </div>
   </section><!-- Camera Status Section -->
   <section class="mb-8">
    <h3 id="camera-section-title" class="text-2xl font-bold text-blue-900 mb-4">Camera Online Status <span class="text-sm text-gray-500 ml-2">(Last Update: <span id="camera-last-update"></span>)</span></h3>
    <!-- Summary Card with Gradient -->
    <div class="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white card-shadow">
     <div class="flex items-center justify-between flex-wrap">
      <div>
       <h4 class="text-xl font-semibold mb-2">Camera Online Status Summary</h4>
       <div class="text-3xl font-bold">
        <span id="camera-summary-online-total">0/0</span> (<span id="camera-summary-percentage">0</span>%)
       </div>
       <div class="text-blue-100 text-sm">
        กล้องออนไลน์ / กล้องทั้งหมด (เปอร์เซ็นต์)
       </div>
      </div>
      <div class="text-right">
       <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="text-center">
         <div class="text-2xl font-bold text-green-300" id="camera-summary-online">
          0
         </div>
         <div class="text-blue-100">
          ออนไลน์
         </div>
        </div>
        <div class="text-center">
         <div class="text-2xl font-bold text-red-300" id="camera-summary-offline">
          0
         </div>
         <div class="text-blue-100">
          ออฟไลน์
         </div>
        </div>
       </div>
      </div>
     </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" id="camera-status-container">
     <div class="bg-white rounded-lg p-6 card-shadow">
      <h4 class="text-xl font-semibold text-blue-800 mb-4">Building B.3</h4>
      <div class="space-y-4">
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">NVR-1</span> <span class="text-sm font-semibold">30/32 (94%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div class="bg-green-500 h-2 rounded-full" style="width: 94%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">NVR-2</span> <span class="text-sm font-semibold">44/46 (96%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div class="bg-yellow-500 h-2 rounded-full" style="width: 96%"></div>
        </div>
       </div>
      </div>
     </div>
     <div class="bg-white rounded-lg p-6 card-shadow">
      <h4 class="text-xl font-semibold text-blue-800 mb-4">Building B.4</h4>
      <div class="space-y-4">
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">NVR-1</span> <span class="text-sm font-semibold">64/64 (100%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div class="bg-green-500 h-2 rounded-full" style="width: 100%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">NVR-2</span> <span class="text-sm font-semibold">32/32 (100%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div class="bg-green-500 h-2 rounded-full" style="width: 100%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">NVR-3</span> <span class="text-sm font-semibold">60/62 (97%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div class="bg-yellow-500 h-2 rounded-full" style="width: 97%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">NVR-4</span> <span class="text-sm font-semibold">32/32 (100%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div class="bg-green-500 h-2 rounded-full" style="width: 100%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">NVR-5</span> <span class="text-sm font-semibold">62/62 (100%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div class="bg-green-500 h-2 rounded-full" style="width: 100%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">NVR-6</span> <span class="text-sm font-semibold">27/29 (93%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div class="bg-red-500 h-2 rounded-full" style="width: 93%"></div>
        </div>
       </div>
      </div>
     </div>
    </div>
   </section><!-- Parking Report Section -->
   <section class="mb-8">
    <h3 id="parking-section-title" class="text-2xl font-bold text-blue-900 mb-4">Parking Lot Report <span class="text-sm text-gray-500 ml-2">(Last Update: <span id="parking-last-update"></span>)</span></h3><!-- Total Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
     <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white card-shadow">
      <div class="flex items-center justify-between">
       <div>
        <h4 class="text-xl font-semibold mb-2 flex items-center">
         <img src="report_assets/Images/car2.png" alt="Car Icon" class="w-8 h-8 mr-3" /> Car Parking Total</h4>
        <div class="text-3xl font-bold" id="car-parking-total">
         749/990
        </div>
        <div class="text-blue-100 text-sm" id="car-parking-percentage">
         76% Occupied
        </div>
       </div>
       <div class="text-right">
        <div class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
         <img src="report_assets/Images/car2.png" alt="Car Icon" class="w-10 h-10" />
        </div>
       </div>
      </div>
     </div>
     <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white card-shadow">
      <div class="flex items-center justify-between">
       <div>
        <h4 class="text-xl font-semibold mb-2 flex items-center">
         <img src="report_assets/Images/motorcycle.png" alt="Motorcycle Icon" class="w-8 h-8 mr-3" /> Motorcycle Parking Total</h4>
        <div class="text-3xl font-bold" id="motorcycle-parking-total">
         590/757
        </div>
        <div class="text-green-100 text-sm" id="motorcycle-parking-percentage">
         78% Occupied
        </div>
       </div>
       <div class="text-right">
        <div class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
         <img src="report_assets/Images/motorcycle.png" alt="Motorcycle Icon" class="w-10 h-10" />
        </div>
       </div>
      </div>
     </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><!-- Car Parking -->
     <div class="bg-white rounded-lg p-6 card-shadow">
      <h4 class="text-xl font-semibold text-blue-800 mb-4 flex items-center">
       <svg class="w-6 h-6 mr-2" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" clip-rule="evenodd"></path>
       </svg> Car Parking Areas</h4>
      <div class="space-y-4">
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Parking Lot 2</span> <span class="text-sm font-semibold" id="car-lot-Parking-Lot-2-status">89/114 (78%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="car-lot-Parking-Lot-2-bar" class="bg-green-500 h-2 rounded-full" style="width: 78%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Parking Lot 3/1</span> <span class="text-sm font-semibold" id="car-lot-Parking-Lot-3-1-status">76/100 (76%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="car-lot-Parking-Lot-3-1-bar" class="bg-green-500 h-2 rounded-full" style="width: 76%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Parking Lot 3/2</span> <span class="text-sm font-semibold" id="car-lot-Parking-Lot-3-2-status">198/264 (75%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="car-lot-Parking-Lot-3-2-bar" class="bg-green-500 h-2 rounded-full" style="width: 75%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Parking Lot 4</span> <span class="text-sm font-semibold" id="car-lot-Parking-Lot-4-status">312/415 (75%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="car-lot-Parking-Lot-4-bar" class="bg-green-500 h-2 rounded-full" style="width: 75%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Parking Lot 5</span> <span class="text-sm font-semibold" id="car-lot-Parking-Lot-5-status">41/53 (77%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="car-lot-Parking-Lot-5-bar" class="bg-green-500 h-2 rounded-full" style="width: 77%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Parking Lot B.8</span> <span class="text-sm font-semibold" id="car-lot-Parking-Lot-B-8-status">33/44 (75%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="car-lot-Parking-Lot-B-8-bar" class="bg-green-500 h-2 rounded-full" style="width: 75%"></div>
        </div>
       </div>
      </div>
     </div><!-- Motorcycle Parking -->
     <div class="bg-white rounded-lg p-6 card-shadow">
      <h4 class="text-xl font-semibold text-blue-800 mb-4 flex items-center">
       <svg class="w-6 h-6 mr-2" fill="currentColor" viewbox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
       </svg> Motorcycle Parking Areas</h4>
      <div class="space-y-4">
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Motorcycle Lot 1</span> <span class="text-sm font-semibold" id="motorcycle-lot-Motorcycle-Lot-1-status">234/296 (79%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="motorcycle-lot-Motorcycle-Lot-1-bar" class="bg-green-500 h-2 rounded-full" style="width: 79%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Motorcycle Lot 2</span> <span class="text-sm font-semibold" id="motorcycle-lot-Motorcycle-Lot-2-status">167/210 (80%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="motorcycle-lot-Motorcycle-Lot-2-bar" class="bg-orange-500 h-2 rounded-full" style="width: 80%"></div>
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded">
        <div class="flex flex-wrap justify-between items-center mb-2"><span class="font-medium">Motorcycle Lot 3/1</span> <span class="text-sm font-semibold" id="motorcycle-lot-Motorcycle-Lot-3-1-status">189/251 (75%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
         <div id="motorcycle-lot-Motorcycle-Lot-3-1-bar" class="bg-green-500 h-2 rounded-full" style="width: 75%"></div>
        </div>
       </div>
      </div>
     </div>
    </div>
   </section><!-- Metal Detector Status Section -->
   <section class="mb-8">
    <h3 id="detector-section-title" class="text-2xl font-bold text-blue-900 mb-4">Hand Held Metal Detector Status <span class="text-sm text-gray-500 ml-2">(Last Update: <span id="detector-last-update"></span>)</span></h3>
    <div class="bg-white rounded-lg p-6 card-shadow">
     <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
       <div class="w-16 h-16 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
        <svg class="w-8 h-8 text-white" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
       </div>
       <h4 class="font-semibold text-green-800">Battery Check</h4>
       <p id="battery-check-text" class="text-sm text-green-600 mt-1">All devices checked</p>
       <div class="mt-2"><span id="battery-check-indicator" class="inline-block w-3 h-3 bg-green-500 rounded-full pulse-animation"></span> <span id="battery-check-status" class="text-xs text-green-600 ml-1">Active</span>
       </div>
      </div>
      <div class="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
       <div class="w-16 h-16 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
        <svg class="w-8 h-8 text-white" fill="currentColor" viewbox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM6 10a1 1 0 01-1 1H4a1 1 0 110-2h1a1 1 0 011 1zM6.464 14.95A1 1 0 105.05 13.536l-.707.707a1 1 0 001.414 1.414l.707-.707zM11 16a1 1 0 10-2 0v1a1 1 0 102 0v-1zM14.95 13.536a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z"></path>
        </svg>
       </div>
       <h4 class="font-semibold text-green-800">LED Power</h4>
       <p id="led-power-text" class="text-sm text-green-600 mt-1">Green LED active</p>
       <div class="mt-2"><span id="led-power-indicator" class="inline-block w-3 h-3 bg-green-500 rounded-full pulse-animation"></span> <span id="led-power-status" class="text-xs text-green-600 ml-1">Online</span>
       </div>
      </div>
      <div class="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
       <div class="w-16 h-16 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
        <svg class="w-8 h-8 text-white" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path>
        </svg>
       </div>
       <h4 class="font-semibold text-green-800">Detection Range</h4>
       <p id="detection-range-text" class="text-sm text-green-600 mt-1">Range tested OK</p>
       <div class="mt-2"><span id="detection-range-indicator" class="inline-block w-3 h-3 bg-green-500 rounded-full pulse-animation"></span> <span id="detection-range-status" class="text-xs text-green-600 ml-1">Calibrated</span>
       </div>
      </div>
      <div class="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
       <div class="w-16 h-16 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
        <svg class="w-8 h-8 text-white" fill="currentColor" viewbox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"></path>
        </svg>
       </div>
       <h4 class="font-semibold text-green-800">Audio Alert</h4>
       <p id="audio-alert-text" class="text-sm text-green-600 mt-1">Sound system OK</p>
       <div class="mt-2"><span id="audio-alert-indicator" class="inline-block w-3 h-3 bg-green-500 rounded-full pulse-animation"></span> <span id="audio-alert-status" class="text-xs text-green-600 ml-1">Functional</span>
       </div>
      </div>
     </div><!-- Test Results -->
     <div class="mt-6 p-4 bg-blue-50 rounded-lg">
      <h4 class="font-semibold text-blue-800 mb-3">Latest Test Results</h4>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
       <div class="flex justify-between"><span class="text-gray-600">Metal Detection:</span> <span id="metal-detection-result" class="text-green-600 font-semibold">✓ Red LED + Sound</span>
       </div>
       <div class="flex justify-between"><span class="text-gray-600">Last Calibration:</span> <span id="last-calibration" class="text-blue-600 font-semibold">Today 06:00</span>
       </div>
       <div class="flex justify-between"><span class="text-gray-600">Next Check:</span> <span id="next-check" class="text-blue-600 font-semibold">Tomorrow 06:00</span>
       </div>
      </div>
     </div>
    </div>
   </section><!-- Walkthrough Metal Detector Section -->
   <section class="mb-8">
    <h3 id="walkthrough-section-title" class="text-2xl font-bold text-blue-900 mb-4">Walkthrough Metal Detector Status <span class="text-sm text-gray-500 ml-2">(Last Update: <span id="walkthrough-last-update"></span>)</span></h3>
    <div class="bg-white rounded-lg p-6 card-shadow">
     <div id="walkthrough-zones-container" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div class="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
       <h4 class="text-lg font-semibold text-blue-800 mb-2">Zone 1</h4>
       <div class="flex items-center justify-center"><span class="status-indicator status-online"></span> <span class="text-green-600 font-semibold text-sm">Online</span>
       </div>
      </div>
      <div class="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
       <h4 class="text-lg font-semibold text-blue-800 mb-2">Zone 2</h4>
       <div class="flex items-center justify-center"><span class="status-indicator status-online"></span> <span class="text-green-600 font-semibold text-sm">Online</span>
       </div>
      </div>
      <div class="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
       <h4 class="text-lg font-semibold text-blue-800 mb-2">Zone 3</h4>
       <div class="flex items-center justify-center"><span class="status-indicator status-warning"></span> <span class="text-yellow-600 font-semibold text-sm">Maintenance</span>
       </div>
      </div>
      <div class="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
       <h4 class="text-lg font-semibold text-blue-800 mb-2">Zone 4</h4>
       <div class="flex items-center justify-center"><span class="status-indicator status-online"></span> <span class="text-green-600 font-semibold text-sm">Online</span>
       </div>
      </div>
      <div class="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
       <h4 class="text-lg font-semibold text-blue-800 mb-2">Zone 5</h4>
       <div class="flex items-center justify-center"><span class="status-indicator status-offline"></span> <span class="text-red-600 font-semibold text-sm">Offline</span>
       </div>
      </div>
      <div class="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
       <h4 class="text-lg font-semibold text-blue-800 mb-2">Zone 6</h4>
       <div class="flex items-center justify-center"><span class="status-indicator status-online"></span> <span class="text-green-600 font-semibold text-sm">Online</span>
       </div>
      </div>
     </div><!-- Summary -->
     <div class="mt-6 pt-4 border-t border-gray-200">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
       <div class="p-3 bg-green-50 rounded-lg">
        <div id="walkthrough-online-count" class="text-xl font-bold text-green-600">
         4
        </div>
        <div class="text-sm text-green-700">
         Online
        </div>
       </div>
       <div class="p-3 bg-yellow-50 rounded-lg">
        <div id="walkthrough-maintenance-count" class="text-xl font-bold text-yellow-600">
         1
        </div>
        <div class="text-sm text-yellow-700">
         Maintenance
        </div>
       </div>
       <div class="p-3 bg-red-50 rounded-lg">
        <div id="walkthrough-offline-count" class="text-xl font-bold text-red-600">
         1
        </div>
        <div class="text-sm text-red-700">
         Offline
        </div>
       </div>
       <div class="p-3 bg-blue-50 rounded-lg">
        <div id="walkthrough-operational-percentage" class="text-xl font-bold text-blue-600">
         67%
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
    <p>Last Updated: <span id="last-updated"></span> | System Status: <span class="text-green-600 font-semibold">All Systems Operational</span></p>
   </footer>
  </div><!-- Settings Modal -->
  <div id="settings-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
   <div class="flex items-center justify-center min-h-full p-4">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-y-auto"><!-- Modal Header -->
     <div class="flex items-center justify-between p-6 border-b border-gray-200">
      <h3 class="text-2xl font-bold text-blue-900">System Settings</h3><button id="close-modal" class="text-gray-400 hover:text-gray-600 transition-colors">
       <svg class="w-6 h-6" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
       </svg></button>
     </div><!-- Modal Content -->
     <div class="p-6"><!-- Tab Navigation -->
      <div class="flex flex-col space-y-1 md:flex-row md:space-x-1 md:space-y-0 mb-6 bg-gray-100 p-1 rounded-lg"><button class="tab-btn active flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors" data-tab="profile">
        <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
        </svg> User Profile </button> <button class="tab-btn flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors" data-tab="staff">
        <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewbox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
        </svg> Staff Management </button> <button class="tab-btn flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors" data-tab="roles">
        <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewbox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg> Role Management </button>
      </div><!-- Tab Content --> <!-- User Profile Tab -->
      <div id="profile-tab" class="tab-content">
       <h4 class="text-lg font-semibold text-blue-800 mb-4">User Profile Settings</h4>
       <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
         <div><label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label> <input type="text" id="profile-name" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="Admin User">
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-2">Email</label> <input type="email" id="profile-email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="admin@westerndigital.com">
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-2">Department</label> <select id="profile-department" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"> <option value="security">Security Department</option> <option value="it">IT Department</option> <option value="hr">HR Department</option> <option value="operations">Operations</option> </select>
         </div>
        </div>
        <div class="space-y-4">
         <div><label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label> <input type="tel" id="profile-phone" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="+66 2 123 4567">
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-2">Employee ID</label> <input type="text" id="profile-employee-id" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" value="WD001" readonly>
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-2">Last Login</label> <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" value="Today, 08:30 AM" readonly>
         </div>
        </div>
       </div>
       <div class="mt-6 flex justify-end"><button id="save-profile" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"> Save Changes </button>
       </div>
      </div><!-- Staff Management Tab -->
      <div id="staff-tab" class="tab-content hidden">
       <div class="flex justify-between items-center mb-4">
        <h4 class="text-lg font-semibold text-blue-800">Staff Management</h4><a href="edit_officer.php" id="add-staff-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors">
         <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
         </svg> Add Staff </a> <a href="manage_officers.php" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors ml-2">Manage Officers</a>
       </div><!-- Staff List -->
       <div class="bg-gray-50 rounded-lg overflow-hidden">
        <table class="w-full">
         <thead class="bg-gray-100">
          <tr>
           <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
           <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Employee ID</th>
           <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
           <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Shift</th>
           <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
           <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
          </tr>
         </thead>
         <tbody id="staff-list" class="divide-y divide-gray-200">
          <tr class="bg-white">
           <td class="px-4 py-3 text-sm text-gray-900">John Smith</td>
           <td class="px-4 py-3 text-sm text-gray-600">SEC001</td>
           <td class="px-4 py-3 text-sm text-gray-600">Security Guard</td>
           <td class="px-4 py-3 text-sm text-gray-600">Day Shift</td>
           <td class="px-4 py-3"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span></td>
           <td class="px-4 py-3 text-sm"><a href="edit_officer.php?officer_id=1" class="text-blue-600 hover:text-blue-800 mr-3 edit-staff-btn">Edit</a> <button class="text-red-600 hover:text-red-800 delete-staff-btn">Delete</button></td>
          </tr>
          <tr class="bg-white">
           <td class="px-4 py-3 text-sm text-gray-900">Sarah Johnson</td>
           <td class="px-4 py-3 text-sm text-gray-600">SEC002</td>
           <td class="px-4 py-3 text-sm text-gray-600">Security Supervisor</td>
           <td class="px-4 py-3 text-sm text-gray-600">Night Shift</td>
           <td class="px-4 py-3"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span></td>
           <td class="px-4 py-3 text-sm"><a href="edit_officer.php?officer_id=2" class="text-blue-600 hover:text-blue-800 mr-3 edit-staff-btn">Edit</a> <button class="text-red-600 hover:text-red-800 delete-staff-btn">Delete</button></td>
          </tr>
          <tr class="bg-white">
           <td class="px-4 py-3 text-sm text-gray-900">Mike Chen</td>
           <td class="px-4 py-3 text-sm text-gray-600">SEC003</td>
           <td class="px-4 py-3 text-sm text-gray-600">Security Guard</td>
           <td class="px-4 py-3 text-sm text-gray-600">Day Shift</td>
           <td class="px-4 py-3"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">On Leave</span></td>
           <td class="px-4 py-3 text-sm"><a href="edit_officer.php?officer_id=3" class="text-blue-600 hover:text-blue-800 mr-3 edit-staff-btn">Edit</a> <button class="text-red-600 hover:text-red-800 delete-staff-btn">Delete</button></td>
          </tr>
         </tbody>
        </table>
       </div>
      </div><!-- Role Management Tab -->
      <div id="roles-tab" class="tab-content hidden">
       <div class="flex justify-between items-center mb-4">
        <h4 class="text-lg font-semibold text-blue-800">Role Management</h4><a href="edit_role.php" id="add-role-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors">
         <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
         </svg> Add Role </a> <a href="manage_roles.php" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors ml-2">Manage Roles</a>
       </div><!-- Roles Grid -->
       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-white border border-gray-200 rounded-lg p-4">
         <div class="flex items-center justify-between mb-3">
          <h5 class="font-semibold text-gray-900">System Administrator</h5>
          <div class="flex space-x-2"><a href="edit_role.php?role_id=1" class="text-blue-600 hover:text-blue-800 edit-role-btn">
            <svg class="w-4 h-4" fill="currentColor" viewbox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
            </svg></a> <button class="text-red-600 hover:text-red-800 delete-role-btn">
            <svg class="w-4 h-4" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"></path> <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg></button>
          </div>
         </div>
         <p class="text-sm text-gray-600 mb-3">Full system access and management</p>
         <div class="text-xs text-gray-500">
          <div class="mb-1">
           ✓ Dashboard Access
          </div>
          <div class="mb-1">
           ✓ User Management
          </div>
          <div class="mb-1">
           ✓ System Settings
          </div>
          <div class="mb-1">
           ✓ Reports &amp; Analytics
          </div>
         </div>
         <div class="mt-3 text-sm"><span class="text-gray-600">Users: </span> <span class="font-semibold">2</span>
         </div>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4">
         <div class="flex items-center justify-between mb-3">
          <h5 class="font-semibold text-gray-900">Security Supervisor</h5>
          <div class="flex space-x-2"><a href="edit_role.php?role_id=2" class="text-blue-600 hover:text-blue-800 edit-role-btn">
            <svg class="w-4 h-4" fill="currentColor" viewbox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
            </svg></a> <button class="text-red-600 hover:text-red-800 delete-role-btn">
            <svg class="w-4 h-4" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"></path> <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg></button>
          </div>
         </div>
         <p class="text-sm text-gray-600 mb-3">Supervise security operations</p>
         <div class="text-xs text-gray-500">
          <div class="mb-1">
           ✓ Dashboard Access
          </div>
          <div class="mb-1">
           ✓ Staff Scheduling
          </div>
          <div class="mb-1">
           ✓ Incident Reports
          </div>
          <div class="mb-1">
           ✗ System Settings
          </div>
         </div>
         <div class="mt-3 text-sm"><span class="text-gray-600">Users: </span> <span class="font-semibold">5</span>
         </div>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4">
         <div class="flex items-center justify-between mb-3">
          <h5 class="font-semibold text-gray-900">Security Guard</h5>
          <div class="flex space-x-2"><a href="edit_role.php?role_id=3" class="text-blue-600 hover:text-blue-800 edit-role-btn">
            <svg class="w-4 h-4" fill="currentColor" viewbox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
            </svg></a> <button class="text-red-600 hover:text-red-800 delete-role-btn">
            <svg class="w-4 h-4" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"></path> <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg></button>
          </div>
         </div>
         <p class="text-sm text-gray-600 mb-3">Basic security operations</p>
         <div class="text-xs text-gray-500">
          <div class="mb-1">
           ✓ Dashboard View
          </div>
          <div class="mb-1">
           ✓ Check-in/Check-out
          </div>
          <div class="mb-1">
           ✗ Staff Management
          </div>
          <div class="mb-1">
           ✗ System Settings
          </div>
         </div>
         <div class="mt-3 text-sm"><span class="text-gray-600">Users: </span> <span class="font-semibold">18</span>
         </div>
        </div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div><!-- Add Staff Modal -->
  <div id="add-staff-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
   <div class="flex items-center justify-center min-h-full p-4">
    <div class="bg-white rounded-lg max-w-md w-full">
     <div class="flex items-center justify-between p-6 border-b border-gray-200">
      <h3 class="text-lg font-bold text-blue-900">Add New Staff</h3><button class="close-add-staff text-gray-400 hover:text-gray-600">
       <svg class="w-6 h-6" fill="currentColor" viewbox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
       </svg></button>
     </div>
     <div class="p-6">
      <form id="add-staff-form" class="space-y-4">
       <div><label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label> <input type="text" id="new-staff-name" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
       </div>
       <div><label class="block text-sm font-medium text-gray-700 mb-2">Employee ID</label> <input type="text" id="new-staff-id" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
       </div>
       <div><label class="block text-sm font-medium text-gray-700 mb-2">Role</label> <select id="new-staff-role" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required> <option value="">Select Role</option> <option value="Security Guard">Security Guard</option> <option value="Security Supervisor">Security Supervisor</option> <option value="System Administrator">System Administrator</option> </select>
       </div>
       <div><label class="block text-sm font-medium text-gray-700 mb-2">Shift</label> <select id="new-staff-shift" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required> <option value="">Select Shift</option> <option value="Day Shift">Day Shift (06:00 - 18:00)</option> <option value="Night Shift">Night Shift (18:00 - 06:00)</option> </select>
       </div>
       <div class="flex justify-end space-x-3 pt-4"><button type="button" class="close-add-staff px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button> <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Staff</button>
       </div>
      </form>
     </div>
    </div>
   </div>
  </div>
  <script>
        // Configuration object
        const defaultConfig = {
            dashboard_title: "Security System Dashboard",
            company_name: "Western Digital Factory",
            security_section_title: "Security Personnel Status",
            nvr_section_title: "NVR Recording Status",
            camera_section_title: "Camera Online Status",
            parking_section_title: "Parking Lot Report",
            detector_section_title: "Hand Held Metal Detector Status",
            walkthrough_section_title: "Walkthrough Metal Detector Status",
            user_name: "Admin User",
            user_role: "System Administrator"
        };

        function updateShiftStatus(now) {
            const currentHour = now.getHours();
            const currentShiftCountElement = document.getElementById('current-shift-count');
            const currentShiftStatusElement = document.getElementById('current-shift-status');
            const shiftChangeTimeElement = document.getElementById('shift-change-time');

            if (currentHour >= 6 && currentHour < 18) {
                // Day Shift (06:00 - 18:00)
                currentShiftStatusElement.textContent = 'Day Shift Active';
                currentShiftStatusElement.className = 'text-sm font-medium text-green-600';
                shiftChangeTimeElement.textContent = 'Next change: 18:00';
            } else {
                // Night Shift (18:00 - 06:00)
                currentShiftStatusElement.textContent = 'Night Shift Active';
                currentShiftStatusElement.className = 'text-sm font-medium text-indigo-600';
                shiftChangeTimeElement.textContent = 'Next change: 06:00';
            }
        }

        // Update time display and shift status
        function updateTime() {
            const now = new Date();
            const timeString = now.toLocaleString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('current-time').textContent = timeString;
            document.getElementById('last-updated').textContent = timeString;
            
            // Update shift status based on current time
            updateShiftStatus(now);
            // Update section timestamps
            updateSectionTimestamps(timeString);
        }

        function updateSectionTimestamps(timeString) {
            const sections = [
                // 'nvr-last-update', // Removed as it's updated by fetchNvrStatus
                // 'camera-last-update', // Removed as it should be updated by its own fetch function
                // 'parking-last-update', // Removed as it should be updated by its own fetch function
                // 'detector-last-update', // Removed as it should be updated by its own fetch function
                // 'walkthrough-last-update' // Removed as it should be updated by its own fetch function
            ];
            sections.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = timeString;
                }
            });
        }



        function formatRelativeTime(dateString) {
            if (!dateString) return 'N/A';

            // Normalize common MySQL datetime format "YYYY-MM-DD HH:MM:SS" to ISO "YYYY-MM-DDTHH:MM:SS"
            let ds = dateString;
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) {
                ds = ds.replace(' ', 'T');
            }

            let date = new Date(ds);
            // Fallback: try replacing space with 'T' if initial parse failed
            if (isNaN(date.getTime()) && dateString.indexOf(' ') !== -1) {
                date = new Date(dateString.replace(' ', 'T'));
            }

            console.log('formatRelativeTime - raw dateString:', dateString);
            console.log('formatRelativeTime - normalized:', ds);
            console.log('formatRelativeTime - parsed Date object:', date);

            const now = new Date();
            const seconds = Math.floor((now - date) / 1000);
            console.log('formatRelativeTime - calculated seconds:', seconds);

            let interval = seconds / 31536000; // years
            if (interval > 1) {
                return Math.floor(interval) + " ปีที่แล้ว";
            }
            interval = seconds / 2592000; // months
            if (interval > 1) {
                return Math.floor(interval) + " เดือนที่แล้ว";
            }
            interval = seconds / 86400; // days
            if (interval > 1) {
                return Math.floor(interval) + " วันที่แล้ว";
            }
            interval = seconds / 3600; // hours
            if (interval > 1) {
                return Math.floor(interval) + " ชั่วโมงที่แล้ว";
            }
            interval = seconds / 60; // minutes
            if (interval > 1) {
                return Math.floor(interval) + " นาทีที่แล้ว";
            }
            return Math.floor(seconds) + " วินาทีที่แล้ว";
        }

        async function fetchSecurityStatus() {
            console.log('fetchSecurityStatus called');
            try {
                const response = await fetch('get_security_status.php');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Data received from get_security_status.php:', data);
                console.log('Raw data.last_update:', data.last_update);
                // Ensure numeric values and provide fallbacks
                const morning = Number(data.morning_shift) || 0;
                const evening = Number(data.evening_shift) || 0;
                const total = Number(data.total) || (morning + evening);

                const dayShiftCountElement = document.getElementById('day-shift-count');
                if (dayShiftCountElement) dayShiftCountElement.textContent = morning;

                const nightShiftCountElement = document.getElementById('night-shift-count');
                if (nightShiftCountElement) nightShiftCountElement.textContent = evening;

                const currentShiftCountElement = document.getElementById('current-shift-count');
                if (currentShiftCountElement) currentShiftCountElement.textContent = total;

                const securityLastUpdateElement = document.getElementById('security-last-update');
                if (data.last_update && securityLastUpdateElement) {
                    // Normalize MySQL datetime to ISO so Date parsing is reliable in browsers
                    let ds = data.last_update;
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                    const formattedTime = formatRelativeTime(ds);
                    securityLastUpdateElement.textContent = formattedTime;
                    console.log('security-last-update set to:', formattedTime, ' (normalized:', ds, ')');
                } else if (securityLastUpdateElement) {
                    console.log('data.last_update is null or undefined.');
                }

            } catch (error) {
                console.error('Error fetching security status:', error);
                // Optionally, display an error message on the dashboard
            }
        }

        // Initialize time and update every second
        updateTime();
        setInterval(updateTime, 1000);

        // Fetch security status on load and every 30 seconds
        fetchSecurityStatus();
        setInterval(fetchSecurityStatus, 30000); // Update every 30 seconds

        // Fetch NVR status on load and every 30 seconds
        async function fetchNvrStatus() {
            console.log('fetchNvrStatus called');
            try {
                const response = await fetch('get_nvr_status.php');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                console.log('NVR Status data received:', data);

                const buildings = data.buildings || {};
                let totalOnline = 0;
                let totalChannels = 0;
                let totalPassCount = 0;
                let totalFailCount = 0;

                // Process each building
                Object.entries(buildings).forEach(([buildingKey, buildingData]) => {
                    const sanitizedBuildingKey = buildingKey.replace(/\./g, '_');
                    const online = buildingData.online || 0;
                    const total = buildingData.total || 0;
                    const offline = buildingData.offline || 0;
                    const percent = buildingData.percent || 0;
                    const nvrPassCount = buildingData.nvr_pass_count || 0;
                    const nvrFailCount = buildingData.nvr_fail_count || 0;
                    const nvrCount = buildingData.nvr_count || 0; // Use nvr_count from PHP response

                    totalOnline += online;
                    totalChannels += total;
                    totalPassCount += nvrPassCount;
                    totalFailCount += nvrFailCount;

                    // Update elements for the NVR status summary (if they exist)
                    const passEl = document.getElementById(`nvr-pass-${sanitizedBuildingKey}`);
                    const totalEl = document.getElementById(`nvr-total-${sanitizedBuildingKey}`);
                    const percentEl = document.getElementById(`nvr-percent-${sanitizedBuildingKey}`);
                    if (passEl) passEl.textContent = online;
                    if (totalEl) totalEl.textContent = total;
                    if (percentEl) percentEl.textContent = Math.round(percent);

                    // Update elements for the 62-day criteria
                    const nvrPassCountEl = document.getElementById(`nvr-passcount-62-${sanitizedBuildingKey}`);
                    const nvrTotalCountEl = document.getElementById(`nvr-totalcount-62-${sanitizedBuildingKey}`);
                    const nvrProgressBarEl = document.getElementById(`nvr-progressbar-62-${sanitizedBuildingKey}`);
                    const nvrProgressBarFillEl = document.getElementById(`nvr-progressbar-fill-62-${sanitizedBuildingKey}`);
                    const nvrCountTextEl = document.getElementById(`nvr-count-62-${sanitizedBuildingKey}`);

                    if (nvrPassCountEl) nvrPassCountEl.textContent = nvrPassCount;
                    if (nvrTotalCountEl) nvrTotalCountEl.textContent = nvrCount; // Use nvrCount from PHP
                    if (nvrCountTextEl) nvrCountTextEl.textContent = `รวม NVR: ${nvrCount} เครื่อง`;

                    if (nvrProgressBarFillEl) {
                        if (nvrCount > 0) {
                            const progressPercentage = Math.round((nvrPassCount / nvrCount) * 100);
                            nvrProgressBarFillEl.style.width = `${progressPercentage}%`;
                            nvrProgressBarFillEl.className = `h-2.5 rounded-full ${progressPercentage === 100 ? 'bg-green-600' : 'bg-red-600'}`;
                        } else {
                            nvrProgressBarFillEl.style.width = '0%';
                            nvrProgressBarFillEl.className = 'h-2.5 rounded-full bg-red-600';
                        }
                    }
                });

                // Calculate overall summary - percentage of NVRs passing the standard
                const totalExpectedNVRs = data.total_expected_nvrs || 0;
                const calculatedFailCount = totalExpectedNVRs - totalPassCount;
                const overallPercent = totalExpectedNVRs > 0 ? Math.round((totalPassCount / totalExpectedNVRs) * 100) : 0;

                const nvrSummaryTotalElement = document.getElementById('nvr-summary-total');
                if (nvrSummaryTotalElement) nvrSummaryTotalElement.textContent = `${totalPassCount}/${totalExpectedNVRs} (${overallPercent}%)`;

                const nvrSummaryPassElement = document.getElementById('nvr-summary-pass');
                if (nvrSummaryPassElement) nvrSummaryPassElement.textContent = totalPassCount;

                const nvrSummaryFailElement = document.getElementById('nvr-summary-fail');
                if (nvrSummaryFailElement) nvrSummaryFailElement.textContent = calculatedFailCount;

                const nvrSummaryPercentageElement = document.getElementById('nvr-summary-percentage');
                if (nvrSummaryPercentageElement) nvrSummaryPercentageElement.textContent = overallPercent;

                // Update last update label
                const nvrLastUpdateElement = document.getElementById('nvr-last-update');
                if (nvrLastUpdateElement) {
                    const lastUpdate = data.last_update ? new Date(data.last_update).toLocaleTimeString('th-TH') : '-';
                    nvrLastUpdateElement.textContent = lastUpdate;
                }

            } catch (err) {
                console.error('Error fetching NVR status:', err);
            }
        }

        fetchNvrStatus();
        setInterval(fetchNvrStatus, 30000);

        async function fetchParkingStatus() {
            console.log('fetchParkingStatus called');
            try {
                const response = await fetch('get_parking_status.php');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                console.log('Parking data received:', data);

                // Update summary cards
                const carParkingTotalElement = document.getElementById('car-parking-total');
                if (carParkingTotalElement) {
                    carParkingTotalElement.textContent = `${data.total_car_occupied}/${data.total_car_slots}`;
                }
                const carOccupancy = Math.min(100, data.total_car_slots > 0 ? Math.round((data.total_car_occupied / data.total_car_slots) * 100) : 0);
                const carParkingPercentageElement = document.getElementById('car-parking-percentage');
                if (carParkingPercentageElement) {
                    carParkingPercentageElement.textContent = `${carOccupancy}% Occupied`;
                }

                const motorcycleParkingTotalElement = document.getElementById('motorcycle-parking-total');
                if (motorcycleParkingTotalElement) {
                    motorcycleParkingTotalElement.textContent = `${data.total_motorcycle_occupied}/${data.total_motorcycle_slots}`;
                }
                const motorcycleOccupancy = Math.min(100, data.total_motorcycle_slots > 0 ? Math.round((data.total_motorcycle_occupied / data.total_motorcycle_slots) * 100) : 0);
                const motorcycleParkingPercentageElement = document.getElementById('motorcycle-parking-percentage');
                if (motorcycleParkingPercentageElement) {
                    motorcycleParkingPercentageElement.textContent = `${motorcycleOccupancy}% Occupied`;
                }

                // Update individual car lots
                data.car_lots_data.forEach(lot => {
                    const lotNameId = lot.name.replace(/[^a-zA-Z0-9]/g, '-'); // Sanitize lot name for ID
                    const statusElement = document.getElementById(`car-lot-${lotNameId}-status`);
                    const barElement = document.getElementById(`car-lot-${lotNameId}-bar`);
                    const cappedLotPercentage = Math.min(100, lot.percentage);
                    if (statusElement) {
                        statusElement.textContent = `${lot.occupied}/${lot.capacity} (${cappedLotPercentage.toFixed(0)}%)`;
                    }
                    if (barElement) {
                        barElement.style.width = `${cappedLotPercentage}%`;
                        if (cappedLotPercentage >= 75) {
                            barElement.className = 'bg-red-500 h-2 rounded-full';
                        } else if (cappedLotPercentage >= 50) {
                            barElement.className = 'bg-orange-500 h-2 rounded-full';
                        } else {
                            barElement.className = 'bg-green-500 h-2 rounded-full';
                        }
                    }
                });

                // Update individual motorcycle lots
                data.motorcycle_lots_data.forEach(lot => {
                    const lotNameId = lot.name.replace(/[^a-zA-Z0-9]/g, '-'); // Sanitize lot name for ID
                    const statusElement = document.getElementById(`motorcycle-lot-${lotNameId}-status`);
                    const barElement = document.getElementById(`motorcycle-lot-${lotNameId}-bar`);
                    const cappedLotPercentage = Math.min(100, lot.percentage);
                    if (statusElement) {
                        statusElement.textContent = `${lot.occupied}/${lot.capacity} (${cappedLotPercentage.toFixed(0)}%)`;
                    }
                    if (barElement) {
                        barElement.style.width = `${cappedLotPercentage}%`;
                        if (cappedLotPercentage >= 75) {
                            barElement.className = 'bg-red-500 h-2 rounded-full';
                        } else if (cappedLotPercentage >= 50) {
                            barElement.className = 'bg-orange-500 h-2 rounded-full';
                        } else {
                            barElement.className = 'bg-green-500 h-2 rounded-full';
                        }
                    }
                });

                // Update last update label
                const parkingLastUpdateElement = document.getElementById('parking-last-update');
                if (parkingLastUpdateElement && data.last_update) {
                    let ds = data.last_update;
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                    parkingLastUpdateElement.textContent = formatRelativeTime(ds);
                }

            } catch (err) {
                console.error('Error fetching parking status:', err);
            }
        }

        fetchParkingStatus();
        setInterval(fetchParkingStatus, 30000);

        async function fetchHandHeldDetectorStatus() {
            console.log('fetchHandHeldDetectorStatus called');
            try {
                const response = await fetch('get_hand_held_detector_status.php');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                console.log('Hand Held Detector data received:', data);

                // Update individual status cards
                // Battery Check
                document.getElementById('battery-check-text').textContent = data.battery_status_text;
                document.getElementById('battery-check-status').textContent = data.battery_status_indicator;
                document.getElementById('battery-check-indicator').className = `inline-block w-3 h-3 ${data.battery_status_indicator === 'Active' ? 'bg-green-500' : 'bg-red-500'} rounded-full pulse-animation`;

                // LED Power
                document.getElementById('led-power-text').textContent = data.led_status_text;
                document.getElementById('led-power-status').textContent = data.led_status_indicator;
                document.getElementById('led-power-indicator').className = `inline-block w-3 h-3 ${data.led_status_indicator === 'Online' ? 'bg-green-500' : 'bg-red-500'} rounded-full pulse-animation`;

                // Detection Range
                document.getElementById('detection-range-text').textContent = data.detection_status_text;
                document.getElementById('detection-range-status').textContent = data.detection_status_indicator;
                document.getElementById('detection-range-indicator').className = `inline-block w-3 h-3 ${data.detection_status_indicator === 'Calibrated' ? 'bg-green-500' : 'bg-red-500'} rounded-full pulse-animation`;

                // Audio Alert
                document.getElementById('audio-alert-text').textContent = data.alarm_status_text;
                document.getElementById('audio-alert-status').textContent = data.alarm_status_indicator;
                document.getElementById('audio-alert-indicator').className = `inline-block w-3 h-3 ${data.alarm_status_indicator === 'Functional' ? 'bg-green-500' : 'bg-red-500'} rounded-full pulse-animation`;

                // Update Latest Test Results
                document.getElementById('metal-detection-result').textContent = data.metal_detection_result;
                document.getElementById('last-calibration').textContent = data.last_calibration;
                document.getElementById('next-check').textContent = data.next_check;

                // Update last update label
                if (data.last_update) {
                    let ds = data.last_update;
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                    document.getElementById('detector-last-update').textContent = formatRelativeTime(ds);
                }

            } catch (err) {
                console.error('Error fetching hand held detector status:', err);
            }
        }

        fetchHandHeldDetectorStatus();
        setInterval(fetchHandHeldDetectorStatus, 30000);

        async function fetchWalkthroughDetectorStatus() {
            console.log('fetchWalkthroughDetectorStatus called');
            try {
                const response = await fetch('get_walkthrough_detector_status.php');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                console.log('Walkthrough Detector data received:', data);

                const zonesContainer = document.getElementById('walkthrough-zones-container');
                if (zonesContainer) {
                    zonesContainer.innerHTML = ''; // Clear existing zones
                    data.zones.forEach(zone => {
                        const zoneDiv = document.createElement('div');
                        zoneDiv.className = `text-center p-4 ${zone.status_class === 'status-online' ? 'bg-green-50 border-green-200' : zone.status_class === 'status-warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} rounded-lg border-2`;
                        zoneDiv.innerHTML = `
                            <h4 class="text-lg font-semibold text-blue-800 mb-2">Zone ${zone.zone_number}</h4>
                            <div class="flex items-center justify-center">
                                <span class="status-indicator ${zone.status_class}"></span>
                                <span class="${zone.status_class === 'status-online' ? 'text-green-600' : zone.status_class === 'status-warning' ? 'text-yellow-600' : 'text-red-600'} font-semibold text-sm">${zone.display_status}</span>
                            </div>
                        `;
                        zonesContainer.appendChild(zoneDiv);
                    });
                }

                // Update summary counts
                document.getElementById('walkthrough-online-count').textContent = data.online_count;
                document.getElementById('walkthrough-maintenance-count').textContent = data.maintenance_count;
                document.getElementById('walkthrough-offline-count').textContent = data.offline_count;
                document.getElementById('walkthrough-operational-percentage').textContent = `${Math.min(100, data.operational_percentage).toFixed(0)}%`;

                // Update last update label
                if (data.last_update) {
                    let ds = data.last_update;
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                    document.getElementById('walkthrough-last-update').textContent = formatRelativeTime(ds);
                }

            } catch (err) {
                console.error('Error fetching walkthrough detector status:', err);
            }
        }

        fetchWalkthroughDetectorStatus();
        setInterval(fetchWalkthroughDetectorStatus, 30000);

        async function fetchCameraStatus() {
            console.log('fetchCameraStatus called');
            try {
                const cameraStatusResponse = await fetch('get_camera_status.php');

                if (!cameraStatusResponse.ok) throw new Error(`HTTP error! status: ${cameraStatusResponse.status}`);

                const rawCameraResponseText = await cameraStatusResponse.text();
                console.log('Raw Camera Status Response:', rawCameraResponseText); // Log raw text
                const cameraData = JSON.parse(rawCameraResponseText); // Manually parse JSON

                // Temporarily comment out recordingDataResponse to isolate
                // const recordingDataResponse = await fetch('get_nvr_recording_data.php');
                // if (!recordingDataResponse.ok) throw new Error(`HTTP error! status: ${recordingDataResponse.status}`);
                // const recordingData = await recordingDataResponse.json(); // Parse recording history
                const recordingData = { buildings: {} }; // Dummy data for now
                console.log('Camera data received:', cameraData);
                console.log('Recording data received:', recordingData);

                const cameraStatusContainer = document.getElementById('camera-status-container');
                if (cameraStatusContainer) {
                    cameraStatusContainer.innerHTML = ''; // Clear existing content

                    let totalOnlineCameras = 0;
                    let totalCameras = 0;

                    for (const building in cameraData.buildings) {
                        const buildingData = cameraData.buildings[building];
                        const buildingDiv = document.createElement('div');
                        buildingDiv.className = 'bg-white rounded-lg p-6 card-shadow';
                        
                        let nvrHtml = '';
                        let buildingOnlineCameras = 0; // Initialize for current building
                        let buildingTotalCameras = 0; // Initialize for current building

                        buildingData.forEach(nvr => {
                            const barColor = nvr.percentage >= 95 ? 'bg-green-500' : nvr.percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500';
                            const cappedPercentage = Math.min(100, nvr.percentage);

                            // Get recording history for this NVR
                            const buildingRecordingData = recordingData.buildings[building];
                            let nvrRecordingHistory = null;
                            if (buildingRecordingData && buildingRecordingData.nvrs) {
                                nvrRecordingHistory = buildingRecordingData.nvrs.find(recNvr => recNvr.nvr_name === nvr.nvr_name);
                            }
                            
                            const lastRecordedText = nvrRecordingHistory && nvrRecordingHistory.last_recorded ? `Last Recorded: ${nvrRecordingHistory.last_recorded}` : 'Recording history N/A';
                            const recordingStatusClass = nvrRecordingHistory && nvrRecordingHistory.status && nvrRecordingHistory.status.includes('Passed') ? 'text-green-600' : 'text-red-600';
                            const recordingStatusText = nvrRecordingHistory && nvrRecordingHistory.status ? `Status: <span class="${recordingStatusClass}">${nvrRecordingHistory.status}</span>` : '';


                            nvrHtml += `
                                <div class="p-3 bg-blue-50 rounded">
                                    <div class="flex flex-wrap justify-between items-center mb-2">
                                        <span class="font-medium">${nvr.nvr_name}</span>
                                        <span class="text-sm font-semibold">${nvr.online_channels}/${nvr.total_channels} (${cappedPercentage.toFixed(0)}%)</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2">
                                        <div class="${barColor} h-2 rounded-full" style="width: ${cappedPercentage}%"></div>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-2">
                                        <div>${lastRecordedText}</div>
                                        <div>${recordingStatusText}</div>
                                    </div>
                                </div>
                            `;
                            buildingOnlineCameras += nvr.online_channels; // Accumulate for current building
                            buildingTotalCameras += nvr.total_channels; // Accumulate for current building
                            totalOnlineCameras += nvr.online_channels;
                            totalCameras += nvr.total_channels;
                        });

                        const buildingOverallPercentage = buildingTotalCameras > 0 ? Math.round((buildingOnlineCameras / buildingTotalCameras) * 100) : 0;

                        // Log the camera counts for Building B.3 to the console
                        if (building === 'B.3') {
                            console.log(`Building B.3 Camera Summary: Online - ${buildingOnlineCameras}, Total - ${buildingTotalCameras}, Percentage - ${buildingOverallPercentage}%`);
                        }

                        buildingDiv.innerHTML = `
                            <h4 class="text-xl font-semibold text-blue-800 mb-2">Building ${building}</h4>
                            <p class="text-sm text-gray-600 mb-4">Online Cameras: ${buildingOnlineCameras}/${buildingTotalCameras} (${buildingOverallPercentage}%)</p>
                            <div class="space-y-4">
                                ${nvrHtml}
                            </div>
                        `;
                        cameraStatusContainer.appendChild(buildingDiv);
                    }

                    // Update Camera Summary
                    const totalOfflineCameras = totalCameras - totalOnlineCameras;
                    const overallCameraPercentage = totalCameras > 0 ? Math.round((totalOnlineCameras / totalCameras) * 100) : 0;

                    const cameraSummaryOnlineTotalElement = document.getElementById('camera-summary-online-total');
                    if (cameraSummaryOnlineTotalElement) cameraSummaryOnlineTotalElement.textContent = `${totalOnlineCameras}/${totalCameras}`;

                    const cameraSummaryOnlineElement = document.getElementById('camera-summary-online');
                    if (cameraSummaryOnlineElement) cameraSummaryOnlineElement.textContent = totalOnlineCameras;

                    const cameraSummaryOfflineElement = document.getElementById('camera-summary-offline');
                    if (cameraSummaryOfflineElement) cameraSummaryOfflineElement.textContent = totalOfflineCameras;

                    const cameraSummaryPercentageElement = document.getElementById('camera-summary-percentage');
                    if (cameraSummaryPercentageElement) cameraSummaryPercentageElement.textContent = overallCameraPercentage;
                }

                // Update last update label
                const cameraLastUpdateElement = document.getElementById('camera-last-update');
                if (cameraLastUpdateElement && cameraData.last_update) { // Use cameraData for last_update
                    let ds = cameraData.last_update;
                    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                    cameraLastUpdateElement.textContent = formatRelativeTime(ds);
                }

            } catch (err) {
                console.error('Error fetching camera status:', err);
            }
        }

        fetchCameraStatus();
        setInterval(fetchCameraStatus, 30000);

        // Modal and Tab Management
        const settingsModal = document.getElementById('settings-modal');
        const addStaffModal = document.getElementById('add-staff-modal');
        const settingsBtn = document.getElementById('settings-btn');
        const closeModalBtn = document.getElementById('close-modal');
        const addStaffBtn = document.getElementById('add-staff-btn');
        const addStaffForm = document.getElementById('add-staff-form');
        const staffList = document.getElementById('staff-list');

        // Tab functionality
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // Update active tab button
                tabBtns.forEach(b => {
                    b.classList.remove('active', 'bg-white', 'text-blue-600', 'shadow-sm');
                    b.classList.add('text-gray-500', 'hover:text-gray-700');
                });
                btn.classList.add('active', 'bg-white', 'text-blue-600', 'shadow-sm');
                btn.classList.remove('text-gray-500', 'hover:text-gray-700');
                
                // Show target tab content
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                });
                document.getElementById(targetTab + '-tab').classList.remove('hidden');
            });
        });

        // Initialize first tab as active
        tabBtns[0].classList.add('bg-white', 'text-blue-600', 'shadow-sm');
        tabBtns[0].classList.remove('text-gray-500', 'hover:text-gray-700');

        // Settings modal
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });

        closeModalBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        // Close modal when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });

        // Add staff modal
        addStaffBtn.addEventListener('click', () => {
            addStaffModal.classList.remove('hidden');
        });

        // Close add staff modal
        document.querySelectorAll('.close-add-staff').forEach(btn => {
            btn.addEventListener('click', () => {
                addStaffModal.classList.add('hidden');
                addStaffForm.reset();
            });
        });

        // Close add staff modal when clicking outside
        addStaffModal.addEventListener('click', (e) => {
            if (e.target === addStaffModal) {
                addStaffModal.classList.add('hidden');
                addStaffForm.reset();
            }
        });

        // Add staff form submission
        addStaffForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('new-staff-name').value;
            const employeeId = document.getElementById('new-staff-id').value;
            const role = document.getElementById('new-staff-role').value;
            const shift = document.getElementById('new-staff-shift').value;
            
            // Create new staff row
            const newRow = document.createElement('tr');
            newRow.className = 'bg-white';
            newRow.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${name}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${employeeId}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${role}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${shift}</td>
                <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                </td>
                <td class="px-4 py-3 text-sm">
                    <button class="text-blue-600 hover:text-blue-800 mr-3 edit-staff-btn">Edit</button>
                    <button class="text-red-600 hover:text-red-800 delete-staff-btn">Delete</button>
                </td>
            `;
            
            staffList.appendChild(newRow);
            
            // Add event listeners to new buttons
            addStaffEventListeners(newRow);
            
            // Close modal and reset form
            addStaffModal.classList.add('hidden');
            addStaffForm.reset();
            
            // Show success message
            showNotification('Staff member added successfully!', 'success');
        });

        // Staff management functions
        function addStaffEventListeners(row) {
            const deleteBtn = row.querySelector('.delete-staff-btn');
            
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this staff member?')) {
                    row.remove();
                    showNotification('Staff member deleted successfully!', 'success');
                }
            });
        }

        // Role management functions
        document.querySelectorAll('.delete-role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this role?')) {
                    btn.closest('.bg-white').remove();
                    showNotification('Role deleted successfully!', 'success');
                }
            });
        });

        // Profile save functionality
        document.getElementById('save-profile').addEventListener('click', () => {
            const name = document.getElementById('profile-name').value;
            const email = document.getElementById('profile-email').value;
            const department = document.getElementById('profile-department').value;
            const phone = document.getElementById('profile-phone').value;
            
            // Update header display
            document.getElementById('user-name').textContent = name;
            
            showNotification('Profile updated successfully!', 'success');
        });

        // Notification system
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
            
            const colors = {
                success: 'bg-green-500 text-white',
                error: 'bg-red-500 text-white',
                info: 'bg-blue-500 text-white',
                warning: 'bg-yellow-500 text-white'
            };
            
            notification.className += ` ${colors[type]}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 100);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }

        // Element SDK implementation
        async function onConfigChange(config) {
            document.getElementById('dashboard-title').textContent = config.dashboard_title || defaultConfig.dashboard_title;
            document.getElementById('company-name').textContent = config.company_name || defaultConfig.company_name;
            document.getElementById('security-section-title').textContent = config.security_section_title || defaultConfig.security_section_title;
            document.getElementById('nvr-section-title').textContent = config.nvr_section_title || defaultConfig.nvr_section_title;
            document.getElementById('camera-section-title').textContent = config.camera_section_title || defaultConfig.camera_section_title;
            document.getElementById('parking-section-title').textContent = config.parking_section_title || defaultConfig.parking_section_title;
            document.getElementById('detector-section-title').textContent = config.detector_section_title || defaultConfig.detector_section_title;
            document.getElementById('walkthrough-section-title').textContent = config.walkthrough_section_title || defaultConfig.walkthrough_section_title;
            document.getElementById('user-name').textContent = config.user_name || defaultConfig.user_name;
            document.getElementById('user-role').textContent = config.user_role || defaultConfig.user_role;
        }

        function mapToCapabilities(config) {
            return {
                recolorables: [],
                borderables: [],
                fontEditable: undefined,
                fontSizeable: undefined
            };
        }

        function mapToEditPanelValues(config) {
            return new Map([
                ["dashboard_title", config.dashboard_title || defaultConfig.dashboard_title],
                ["company_name", config.company_name || defaultConfig.company_name],
                ["security_section_title", config.security_section_title || defaultConfig.security_section_title],
                ["nvr_section_title", config.nvr_section_title || defaultConfig.nvr_section_title],
                ["camera_section_title", config.camera_section_title || defaultConfig.camera_section_title],
                ["parking_section_title", config.parking_section_title || defaultConfig.parking_section_title],
                ["detector_section_title", config.detector_section_title || defaultConfig.detector_section_title],
                ["walkthrough_section_title", config.walkthrough_section_title || defaultConfig.walkthrough_section_title],
                ["user_name", config.user_name || defaultConfig.user_name],
                ["user_role", config.user_role || defaultConfig.user_role]
            ]);
        }

        // Initialize Element SDK
        if (window.elementSdk) {
            window.elementSdk.init({
                defaultConfig,
                onConfigChange,
                mapToCapabilities,
                mapToEditPanelValues
            });
        }
    </script>
<!-- Removed injected Cloudflare challenge iframe/script to avoid 404 errors on local environment -->
</body>
</html>