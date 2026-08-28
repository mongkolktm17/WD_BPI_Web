<?php
require_once 'config.php';

// --- Authentication Check ---
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

$current_user_id = $_SESSION["id"];
$current_username = $_SESSION["username"];

// Ensure split timestamp columns exist
$col_check = $conn->query("SHOW COLUMNS FROM security_guard_counts LIKE 'morning_reported_at'");
if ($col_check && $col_check->num_rows === 0) {
    @$conn->query("ALTER TABLE security_guard_counts ADD COLUMN morning_reported_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER morning_shift_contract");
    @$conn->query("ALTER TABLE security_guard_counts ADD COLUMN evening_reported_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER evening_shift_contract");
}

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // Handle Delete
    if (isset($data['action']) && $data['action'] === 'delete' && isset($data['id'])) {
        $id = $data['id'];
        $stmt = $conn->prepare("UPDATE security_guard_counts SET is_deleted = 1 WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete record.']);
        }
        $stmt->close();
        exit;
    }

    // Handle Create
    if (isset($data['action']) && $data['action'] === 'create') {
        $shift_mode = $data['shift_mode'] ?? 'both'; // 'morning' | 'evening' | 'both'

        // Get latest record for fallback
        $latest_res = $conn->query("SELECT * FROM security_guard_counts WHERE is_deleted = 0 ORDER BY record_date DESC, created_at DESC LIMIT 1");
        $latest = ($latest_res && $latest_res->num_rows > 0) ? $latest_res->fetch_assoc() : null;

        $morning_shift = ($shift_mode === 'morning' || $shift_mode === 'both')
            ? (isset($data['morning_shift']) && $data['morning_shift'] !== '' ? (int)$data['morning_shift'] : ($latest['morning_shift'] ?? 60))
            : ($latest['morning_shift'] ?? 60);

        $morning_shift_contract = ($shift_mode === 'morning' || $shift_mode === 'both')
            ? (isset($data['morning_shift_contract']) && $data['morning_shift_contract'] !== '' ? (int)$data['morning_shift_contract'] : ($latest['morning_shift_contract'] ?? 60))
            : ($latest['morning_shift_contract'] ?? 60);

        $evening_shift = ($shift_mode === 'evening' || $shift_mode === 'both')
            ? (isset($data['evening_shift']) && $data['evening_shift'] !== '' ? (int)$data['evening_shift'] : ($latest['evening_shift'] ?? 47))
            : ($latest['evening_shift'] ?? 47);

        $evening_shift_contract = ($shift_mode === 'evening' || $shift_mode === 'both')
            ? (isset($data['evening_shift_contract']) && $data['evening_shift_contract'] !== '' ? (int)$data['evening_shift_contract'] : ($latest['evening_shift_contract'] ?? 47))
            : ($latest['evening_shift_contract'] ?? 47);

        $morning_reported_at = ($shift_mode === 'morning' || $shift_mode === 'both') ? date('Y-m-d H:i:s') : ($latest['morning_reported_at'] ?? $latest['created_at'] ?? date('Y-m-d H:i:s'));
        $evening_reported_at = ($shift_mode === 'evening' || $shift_mode === 'both') ? date('Y-m-d H:i:s') : ($latest['evening_reported_at'] ?? $latest['created_at'] ?? date('Y-m-d H:i:s'));

        $total = $morning_shift + $evening_shift;

        $stmt = $conn->prepare("INSERT INTO security_guard_counts (record_date, morning_shift, morning_shift_contract, morning_reported_at, evening_shift, evening_shift_contract, evening_reported_at, total, submitted_by_id) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iisisiii", $morning_shift, $morning_shift_contract, $morning_reported_at, $evening_shift, $evening_shift_contract, $evening_reported_at, $total, $current_user_id);

        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'id' => $stmt->insert_id]);
        } else {
            // Fallback for older schema without timestamp columns
            $stmt_old = $conn->prepare("INSERT INTO security_guard_counts (record_date, morning_shift, morning_shift_contract, evening_shift, evening_shift_contract, total, submitted_by_id) VALUES (NOW(), ?, ?, ?, ?, ?, ?)");
            $stmt_old->bind_param("iiiiii", $morning_shift, $morning_shift_contract, $evening_shift, $evening_shift_contract, $total, $current_user_id);
            if ($stmt_old->execute()) {
                echo json_encode(['status' => 'success', 'id' => $stmt_old->insert_id]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to insert record.']);
            }
            $stmt_old->close();
        }
        $stmt->close();
        exit;
    }
}

// Fetch all records
$result = $conn->query("
    SELECT sgc.id, sgc.record_date as date, sgc.created_at, sgc.morning_shift, sgc.morning_shift_contract, sgc.evening_shift, sgc.evening_shift_contract, sgc.total, u.username as submitted_by 
    FROM security_guard_counts sgc
    LEFT JOIN users u ON sgc.submitted_by_id = u.id
    WHERE sgc.is_deleted = 0
    ORDER BY sgc.record_date DESC, sgc.created_at DESC
");
$records = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }
}

$latest_record = $records[0] ?? null;
$default_morning_actual = $latest_record['morning_shift'] ?? 60;
$default_morning_contract = $latest_record['morning_shift_contract'] ?? 60;
$default_evening_actual = $latest_record['evening_shift'] ?? 47;
$default_evening_contract = $latest_record['evening_shift_contract'] ?? 47;
$conn->close();
?>
<!doctype html>
<html lang="th" class="h-full">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ระบบบันทึกจำนวน รปภ.</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="theme.css">
    <style>
        body {
            box-sizing: border-box;
        }

        .gradient-bg {
            background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
        }

        .card-shadow {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .input-focus:focus {
            box-shadow: 0 0 0 3px rgba(21, 230, 208, 0.3);
        }

        .btn-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(43, 107, 239, 0.3);
        }

        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .loading-spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #15E6D0;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }
    </style>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
</head>

<body class="h-full gradient-bg font-sans custom-font">
    <main class="min-h-full flex items-center justify-center p-4">
        <div class="w-full max-w-4xl">

            <!-- Header -->
            <div class="glass-card rounded-3xl shadow-xl p-8 mb-8 fade-in">
                <div class="flex justify-between items-start">
                    <!-- Left side: Title and Subtitle -->
                    <div>
                        <h1 id="page-title" class="text-3xl font-bold section-title mb-2">ระบบบันทึกจำนวน รปภ.</h1>
                        <p id="subtitle" class="text-gray-600 text-lg">บันทึกจำนวนเจ้าหน้าที่รักษาความปลอดภัยประจำวัน
                        </p>
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

            <div class="bg-white rounded-2xl card-shadow p-8 mb-6 fade-in">
                <form id="attendance-form" class="space-y-6">
                    <div>
                        <label for="date" class="block text-sm font-semibold text-gray-700 mb-2">วันที่</label>
                        <input type="date" id="date" name="date" required
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-400 input-focus outline-none transition-all duration-300">
                    </div>

                    <!-- Shift Selector Mode -->
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">เลือกกะที่ต้องการบันทึก</label>
                        <div class="grid grid-cols-3 gap-3">
                            <button type="button" id="btn-shift-morning" onclick="setShiftMode('morning')"
                                class="py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all bg-amber-50 border-amber-400 text-amber-800 shadow-sm">
                                ☀️ เฉพาะกะเช้า
                            </button>
                            <button type="button" id="btn-shift-evening" onclick="setShiftMode('evening')"
                                class="py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all bg-gray-50 border-gray-200 text-gray-600 hover:bg-indigo-50">
                                🌙 เฉพาะกะค่ำ
                            </button>
                            <button type="button" id="btn-shift-both" onclick="setShiftMode('both')"
                                class="py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50">
                                ☀️🌙 ทั้งสองกะ
                            </button>
                        </div>
                        <p class="text-xs text-gray-400 mt-1.5">* กะที่ไม่ได้เลือก ระบบจะใช้ค่าเดิมล่าสุดไปรายงานต่อโดยอัตโนมัติ</p>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6">
                        <!-- Morning Shift -->
                        <div id="morning-card" class="p-5 rounded-xl border-2 border-amber-300 bg-amber-50/50 transition-all">
                            <div class="flex items-center justify-between mb-2">
                                <label for="morning-shift" id="morning-label" class="block text-sm font-bold text-amber-900">☀️ กะเช้า (07:00-19:00)</label>
                                <span id="morning-badge" class="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">บันทึกกะนี้</span>
                            </div>
                            <label class="block text-xs text-gray-600 mb-1">จำนวนที่มาจริง (Actual)</label>
                            <input type="number" id="morning-shift" name="morning-shift" min="0" value="<?php echo $default_morning_actual; ?>" required
                                class="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl focus:border-amber-400 input-focus outline-none transition-all duration-300 text-lg font-bold">
                            <label class="block text-xs text-gray-600 mb-1 mt-3">Headcount Contract</label>
                            <input type="number" id="morning-shift-contract" name="morning-shift-contract" min="0" value="<?php echo $default_morning_contract; ?>"
                                class="w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:border-amber-400 input-focus outline-none transition-all duration-300">
                        </div>

                        <!-- Evening Shift -->
                        <div id="evening-card" class="p-5 rounded-xl border-2 border-gray-200 bg-gray-50/50 transition-all">
                            <div class="flex items-center justify-between mb-2">
                                <label for="evening-shift" id="evening-label" class="block text-sm font-bold text-gray-700">🌙 กะค่ำ (19:00-07:00)</label>
                                <span id="evening-badge" class="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">คงค่าเดิม</span>
                            </div>
                            <label class="block text-xs text-gray-600 mb-1">จำนวนที่มาจริง (Actual)</label>
                            <input type="number" id="evening-shift" name="evening-shift" min="0" value="<?php echo $default_evening_actual; ?>" disabled
                                class="w-full px-4 py-3 border-2 border-gray-200 bg-gray-100 rounded-xl focus:border-indigo-400 input-focus outline-none transition-all duration-300 text-lg font-bold text-gray-400">
                            <label class="block text-xs text-gray-600 mb-1 mt-3">Headcount Contract</label>
                            <input type="number" id="evening-shift-contract" name="evening-shift-contract" min="0" value="<?php echo $default_evening_contract; ?>" disabled
                                class="w-full px-4 py-2 border-2 border-gray-200 bg-gray-100 rounded-xl focus:border-indigo-400 input-focus outline-none transition-all duration-300 text-gray-400">
                        </div>
                    </div>

                    <div class="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border-2 border-cyan-100">
                        <label id="total-label" class="block text-sm font-semibold text-gray-700 mb-2">จำนวนรวม (Total)</label>
                        <div id="total-display" class="text-3xl font-bold text-blue-600">
                            <?php echo $default_morning_actual + $default_evening_actual; ?>
                        </div>
                    </div>
                    <button type="submit" id="submit-btn"
                        class="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl btn-hover transition-all duration-300 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                        <span id="submit-text">💾 บันทึกข้อมูล</span>
                        <div id="loading-spinner" class="loading-spinner mx-auto hidden"></div>
                    </button>
                </form>
                <div id="success-message"
                    class="hidden mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewbox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clip-rule="evenodd"></path>
                        </svg> บันทึกข้อมูลเรียบร้อยแล้ว!
                    </div>
                </div>
                <div id="error-message"
                    class="hidden mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewbox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clip-rule="evenodd"></path>
                        </svg><span id="error-text">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</span>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl card-shadow p-8 fade-in">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">ประวัติการบันทึก</h2>
                    <button onclick="exportTableToCSV('guard_duty_log_history.csv')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors shadow-md flex items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        ส่งออกเป็น CSV
                    </button>
                </div>
                <div id="records-container">
                    <div class="overflow-x-auto rounded-xl border border-gray-200">
                        <table class="w-full text-left border-collapse bg-white table-layout-fixed">
                            <thead class="bg-gray-50 text-gray-700 uppercase text-xs leading-normal">
                                <tr>
                                    <th class="py-3 px-4 font-bold text-center whitespace-nowrap" title="วันที่">วันที่</th>
                                    <th class="py-3 px-4 font-bold whitespace-nowrap" title="ผู้รายงาน">ผู้รายงาน</th>
                                    <th class="py-3 px-4 font-bold text-center whitespace-nowrap" title="กะเช้า (Actual / Contract)">กะเช้า (Actual / Contract)</th>
                                    <th class="py-3 px-4 font-bold text-center whitespace-nowrap" title="กะค่ำ (Actual / Contract)">กะค่ำ (Actual / Contract)</th>
                                    <th class="py-3 px-4 font-bold text-center whitespace-nowrap" title="จำนวนรวม">จำนวนรวม</th>
                                    <th class="py-3 px-4 font-bold text-center whitespace-nowrap">การกระทำ</th>
                                </tr>
                            </thead>
                            <tbody class="text-gray-600 text-xs font-light" id="records-table-body">
                                <?php if (!empty($records)): ?>
                                    <?php foreach ($records as $row):
                                        $date = new DateTime($row['date']);
                                        ?>
                                        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors" id="record-row-<?php echo $row['id']; ?>">
                                            <td class="py-3 px-4 text-center whitespace-nowrap">
                                                <div class="font-medium text-gray-800"><?php echo $date->format('d/m/Y'); ?></div>
                                            </td>
                                            <td class="py-3 px-4 whitespace-nowrap font-medium text-gray-700">
                                                <?php echo htmlspecialchars($row['submitted_by'] ?? 'N/A'); ?>
                                            </td>
                                            <td class="py-3 px-4 text-center whitespace-nowrap font-bold text-cyan-600 text-sm">
                                                <?php echo htmlspecialchars($row['morning_shift']); ?>
                                                <?php if (!empty($row['morning_shift_contract'])): ?>
                                                    <span class="text-gray-400 font-normal"> / <?php echo htmlspecialchars($row['morning_shift_contract']); ?></span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="py-3 px-4 text-center whitespace-nowrap font-bold text-blue-600 text-sm">
                                                <?php echo htmlspecialchars($row['evening_shift']); ?>
                                                <?php if (!empty($row['evening_shift_contract'])): ?>
                                                    <span class="text-gray-400 font-normal"> / <?php echo htmlspecialchars($row['evening_shift_contract']); ?></span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="py-3 px-4 text-center whitespace-nowrap font-bold text-green-600 text-sm">
                                                <?php echo htmlspecialchars($row['total']); ?>
                                            </td>
                                            <td class="py-3 px-4 text-center whitespace-nowrap font-medium">
                                                <button onclick="deleteRecord(<?php echo $row['id']; ?>)" class="text-red-500 hover:text-red-700 transition-colors duration-200">
                                                    ลบ
                                                </button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <tr id="no-records-row">
                                        <td colspan="6" class="py-8 px-6 text-center text-gray-400 bg-gray-50">
                                            ไม่พบข้อมูลประวัติการรายงาน
                                        </td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <script>
        let currentRecords = <?php echo json_encode($records); ?>;
        const currentUsername = <?php echo json_encode($current_username); ?>;

        // DOM Elements
        const form = document.getElementById('attendance-form');
        const dateInput = document.getElementById('date');
        const morningInput = document.getElementById('morning-shift');
        const eveningInput = document.getElementById('evening-shift');
        const totalDisplay = document.getElementById('total-display');
        const submitBtn = document.getElementById('submit-btn');
        const submitText = document.getElementById('submit-text');
        const loadingSpinner = document.getElementById('loading-spinner');
        const successMessage = document.getElementById('success-message');
        const errorMessage = document.getElementById('error-message');
        const recordsList = document.getElementById('records-list');
        const noRecords = document.getElementById('no-records');

        // Set today's date as default
        dateInput.value = new Date().toISOString().split('T')[0];

        // Calculate total automatically
        function updateTotal() {
            const morning = parseInt(morningInput.value) || 0;
            const evening = parseInt(eveningInput.value) || 0;
            const total = morning + evening;
            totalDisplay.textContent = total;
        }

        morningInput.addEventListener('input', updateTotal);
        eveningInput.addEventListener('input', updateTotal);

        // Show loading state
        function showLoading() {
            submitBtn.disabled = true;
            submitText.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');
        }

        // Hide loading state
        function hideLoading() {
            submitBtn.disabled = false;
            submitText.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
        }

        // Show success message
        function showSuccess() {
            successMessage.classList.remove('hidden');
            errorMessage.classList.add('hidden');
            setTimeout(() => {
                successMessage.classList.add('hidden');
            }, 3000);
        }

        // Show error message
        function showError(message = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง') {
            document.getElementById('error-text').textContent = message;
            errorMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
            setTimeout(() => {
                errorMessage.classList.add('hidden');
            }, 5000);
        }

        // Format date for display
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
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

        // Delete record
        async function deleteRecord(id) {
            if (!confirm('Are you sure you want to delete this record?')) {
                return;
            }

            showLoading();

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ action: 'delete', id: id }),
                });

                const result = await response.json();

                if (result.status === 'success') {
                    showSuccess();
                    location.reload();
                } else {
                    showError(result.message || 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
                }
            } catch (error) {
                showError('ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
            } finally {
                hideLoading();
            }
        }

        let currentShiftMode = 'morning'; // default

        function setShiftMode(mode) {
            currentShiftMode = mode;
            const btnM = document.getElementById('btn-shift-morning');
            const btnE = document.getElementById('btn-shift-evening');
            const btnB = document.getElementById('btn-shift-both');

            const cardM = document.getElementById('morning-card');
            const cardE = document.getElementById('evening-card');

            const badgeM = document.getElementById('morning-badge');
            const badgeE = document.getElementById('evening-badge');

            const mActual = document.getElementById('morning-shift');
            const mContract = document.getElementById('morning-shift-contract');
            const eActual = document.getElementById('evening-shift');
            const eContract = document.getElementById('evening-shift-contract');

            // Reset button classes
            [btnM, btnE, btnB].forEach(b => {
                b.className = 'py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all bg-gray-50 border-gray-200 text-gray-600';
            });

            if (mode === 'morning') {
                btnM.className = 'py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all bg-amber-50 border-amber-400 text-amber-800 shadow-sm';

                cardM.className = 'p-5 rounded-xl border-2 border-amber-300 bg-amber-50/50 transition-all';
                badgeM.textContent = 'บันทึกกะนี้';
                badgeM.className = 'text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold';
                mActual.disabled = false;
                mActual.className = 'w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl focus:border-amber-400 input-focus outline-none transition-all duration-300 text-lg font-bold';
                mContract.disabled = false;
                mContract.className = 'w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:border-amber-400 input-focus outline-none transition-all duration-300';

                cardE.className = 'p-5 rounded-xl border-2 border-gray-200 bg-gray-50/50 opacity-70 transition-all';
                badgeE.textContent = 'คงค่าเดิม';
                badgeE.className = 'text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold';
                eActual.disabled = true;
                eActual.className = 'w-full px-4 py-3 border-2 border-gray-200 bg-gray-100 rounded-xl focus:border-indigo-400 input-focus outline-none transition-all duration-300 text-lg font-bold text-gray-400';
                eContract.disabled = true;
                eContract.className = 'w-full px-4 py-2 border-2 border-gray-200 bg-gray-100 rounded-xl focus:border-indigo-400 input-focus outline-none transition-all duration-300 text-gray-400';
            } else if (mode === 'evening') {
                btnE.className = 'py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all bg-indigo-50 border-indigo-400 text-indigo-800 shadow-sm';

                cardE.className = 'p-5 rounded-xl border-2 border-indigo-300 bg-indigo-50/50 transition-all';
                badgeE.textContent = 'บันทึกกะนี้';
                badgeE.className = 'text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold';
                eActual.disabled = false;
                eActual.className = 'w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl focus:border-indigo-400 input-focus outline-none transition-all duration-300 text-lg font-bold';
                eContract.disabled = false;
                eContract.className = 'w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:border-indigo-400 input-focus outline-none transition-all duration-300';

                cardM.className = 'p-5 rounded-xl border-2 border-gray-200 bg-gray-50/50 opacity-70 transition-all';
                badgeM.textContent = 'คงค่าเดิม';
                badgeM.className = 'text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold';
                mActual.disabled = true;
                mActual.className = 'w-full px-4 py-3 border-2 border-gray-200 bg-gray-100 rounded-xl focus:border-amber-400 input-focus outline-none transition-all duration-300 text-lg font-bold text-gray-400';
                mContract.disabled = true;
                mContract.className = 'w-full px-4 py-2 border-2 border-gray-200 bg-gray-100 rounded-xl focus:border-amber-400 input-focus outline-none transition-all duration-300 text-gray-400';
            } else {
                btnB.className = 'py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all bg-blue-50 border-blue-400 text-blue-800 shadow-sm';

                cardM.className = 'p-5 rounded-xl border-2 border-amber-300 bg-amber-50/50 transition-all';
                badgeM.textContent = 'บันทึกกะนี้';
                badgeM.className = 'text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold';
                mActual.disabled = false;
                mActual.className = 'w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl focus:border-amber-400 input-focus outline-none transition-all duration-300 text-lg font-bold';
                mContract.disabled = false;
                mContract.className = 'w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:border-amber-400 input-focus outline-none transition-all duration-300';

                cardE.className = 'p-5 rounded-xl border-2 border-indigo-300 bg-indigo-50/50 transition-all';
                badgeE.textContent = 'บันทึกกะนี้';
                badgeE.className = 'text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold';
                eActual.disabled = false;
                eActual.className = 'w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl focus:border-indigo-400 input-focus outline-none transition-all duration-300 text-lg font-bold';
                eContract.disabled = false;
                eContract.className = 'w-full px-4 py-2 border-2 border-gray-200 bg-white rounded-xl focus:border-indigo-400 input-focus outline-none transition-all duration-300';
            }
            updateTotal();
        }

        // Auto detect shift on load
        const curHour = new Date().getHours();
        if (curHour >= 7 && curHour < 19) {
            setShiftMode('morning');
        } else {
            setShiftMode('evening');
        }

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const morning = parseInt(morningInput.value) || 0;
            const evening = parseInt(eveningInput.value) || 0;
            const morningContract = document.getElementById('morning-shift-contract').value !== '' ? parseInt(document.getElementById('morning-shift-contract').value) : null;
            const eveningContract = document.getElementById('evening-shift-contract').value !== '' ? parseInt(document.getElementById('evening-shift-contract').value) : null;
            const total = morning + evening;

            const recordData = {
                action: 'create',
                shift_mode: currentShiftMode,
                date: dateInput.value,
                morning_shift: morning,
                morning_shift_contract: morningContract,
                evening_shift: evening,
                evening_shift_contract: eveningContract,
                total: total,
            };

            showLoading();

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(recordData),
                });

                const result = await response.json();

                if (result.status === 'success') {
                    showSuccess();
                    location.reload();
                } else {
                    showError(result.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
                }
            } catch (error) {
                showError('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
            } finally {
                hideLoading();
            }
        });
    </script>
</body>

</html>