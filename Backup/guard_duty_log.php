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
    $data = json_decode(file_get_contents('php://input'), true);

    // Handle Delete
    if (isset($data['action']) && $data['action'] === 'delete' && isset($data['id'])) {
        $id = $data['id'];
        $stmt = $conn->prepare("DELETE FROM security_guard_counts WHERE id = ?");
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
        $morning_shift = $data['morning_shift'];
        $evening_shift = $data['evening_shift'];
        $total = $data['total'];
        $morning_shift_contract = isset($data['morning_shift_contract']) ? $data['morning_shift_contract'] : null;
        $evening_shift_contract = isset($data['evening_shift_contract']) ? $data['evening_shift_contract'] : null;

        $stmt = $conn->prepare("INSERT INTO security_guard_counts (record_date, morning_shift, morning_shift_contract, evening_shift, evening_shift_contract, total, submitted_by_id) VALUES (NOW(), ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iiiiii", $morning_shift, $morning_shift_contract, $evening_shift, $evening_shift_contract, $total, $current_user_id);

        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'id' => $stmt->insert_id]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to insert record.']);
        }
        $stmt->close();
        exit;
    }
}

// Fetch all records
$result = $conn->query("
    SELECT sgc.id, sgc.record_date as date, sgc.morning_shift, sgc.morning_shift_contract, sgc.evening_shift, sgc.evening_shift_contract, sgc.total, u.username as submitted_by 
    FROM security_guard_counts sgc
    LEFT JOIN users u ON sgc.submitted_by_id = u.id
    ORDER BY sgc.record_date DESC
");
$records = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }
}
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
                    <div><label for="date" class="block text-sm font-semibold text-gray-700 mb-2">วันที่</label> <input
                            type="date" id="date" name="date" required
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-400 input-focus outline-none transition-all duration-300">
                    </div>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label for="morning-shift" id="morning-label"
                                class="block text-sm font-semibold text-gray-700 mb-2">กะเช้า (07:00-19:00)</label>
                            <label class="block text-xs text-gray-500 mb-1">จำนวนที่มาจริง</label>
                            <input type="number" id="morning-shift" name="morning-shift" min="0" required
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-400 input-focus outline-none transition-all duration-300 text-lg">
                            <label class="block text-xs text-gray-500 mb-1 mt-3">Headcount Contract</label>
                            <input type="number" id="morning-shift-contract" name="morning-shift-contract" min="0"
                                class="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-400 input-focus outline-none transition-all duration-300"
                                placeholder="ไม่บังคับ">
                        </div>
                        <div>
                            <label for="evening-shift" id="evening-label"
                                class="block text-sm font-semibold text-gray-700 mb-2">กะค่ำ (19:00-07:00)</label>
                            <label class="block text-xs text-gray-500 mb-1">จำนวนที่มาจริง</label>
                            <input type="number" id="evening-shift" name="evening-shift" min="0" required
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-400 input-focus outline-none transition-all duration-300 text-lg">
                            <label class="block text-xs text-gray-500 mb-1 mt-3">Headcount Contract</label>
                            <input type="number" id="evening-shift-contract" name="evening-shift-contract" min="0"
                                class="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-400 input-focus outline-none transition-all duration-300"
                                placeholder="ไม่บังคับ">
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border-2 border-cyan-100"><label
                            id="total-label" class="block text-sm font-semibold text-gray-700 mb-2">จำนวนรวม</label>
                        <div id="total-display" class="text-3xl font-bold text-blue-600">
                            0
                        </div>
                    </div>
                    <button type="submit" id="submit-btn"
                        class="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold py-4 px-6 rounded-xl btn-hover transition-all duration-300 text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        <span id="submit-text">บันทึกข้อมูล</span>
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
                <h2 class="text-2xl font-bold text-gray-800 mb-6">ประวัติการบันทึก</h2>
                <div id="records-container">
                    <div id="no-records" class="text-center py-8 text-gray-500">
                        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor"
                            viewbox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                            </path>
                        </svg>
                        <p class="text-lg">ยังไม่มีข้อมูลที่บันทึก</p>
                        <p class="text-sm">เริ่มต้นด้วยการกรอกข้อมูลด้านบน</p>
                    </div>
                    <div id="records-list" class="space-y-4"></div>
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

        // Render records list
        function renderRecords() {
            if (currentRecords.length === 0) {
                noRecords.classList.remove('hidden');
                recordsList.innerHTML = '';
                return;
            }

            noRecords.classList.add('hidden');

            const sortedRecords = [...currentRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

            recordsList.innerHTML = sortedRecords.map(record => `
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow duration-300">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h3 class="font-semibold text-gray-800">${formatDate(record.date)}</h3>
                            <p class="text-sm text-gray-500">บันทึกโดย: ${record.submitted_by || 'N/A'}</p>
                        </div>
                        <button onclick="deleteRecord(${record.id})" 
                                class="text-red-500 hover:text-red-700 transition-colors duration-200 p-1">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                        <div class="text-center">
                            <div class="text-gray-600">กะเช้า</div>
                            <div class="font-bold text-cyan-600 text-lg">
                                ${record.morning_shift}${record.morning_shift_contract ? ' / ' + record.morning_shift_contract : ''}
                            </div>
                            ${record.morning_shift_contract ? '<div class="text-xs text-gray-500">Actual / Contract</div>' : ''}
                        </div>
                        <div class="text-center">
                            <div class="text-gray-600">กะค่ำ</div>
                            <div class="font-bold text-blue-600 text-lg">
                                ${record.evening_shift}${record.evening_shift_contract ? ' / ' + record.evening_shift_contract : ''}
                            </div>
                            ${record.evening_shift_contract ? '<div class="text-xs text-gray-500">Actual / Contract</div>' : ''}
                        </div>
                        <div class="text-center">
                            <div class="text-gray-600">รวม</div>
                            <div class="font-bold text-green-600 text-lg">${record.total}</div>
                        </div>
                    </div>
                </div>
            `).join('');
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
                    currentRecords = currentRecords.filter(r => r.id !== id);
                    renderRecords();
                    showSuccess();
                } else {
                    showError(result.message || 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
                }
            } catch (error) {
                showError('ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
            } finally {
                hideLoading();
            }
        }

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const morning = parseInt(formData.get('morning-shift')) || 0;
            const evening = parseInt(formData.get('evening-shift')) || 0;
            const morningContract = formData.get('morning-shift-contract') ? parseInt(formData.get('morning-shift-contract')) : null;
            const eveningContract = formData.get('evening-shift-contract') ? parseInt(formData.get('evening-shift-contract')) : null;
            const total = morning + evening;

            const recordData = {
                action: 'create',
                date: formData.get('date'),
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
                    recordData.id = result.id;
                    recordData.submitted_by = currentUsername; // Add username for immediate display
                    currentRecords.push(recordData);
                    renderRecords();
                    showSuccess();
                    form.reset();
                    dateInput.value = new Date().toISOString().split('T')[0];
                    updateTotal();
                } else {
                    showError(result.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
                }
            } catch (error) {
                showError('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
            } finally {
                hideLoading();
            }
        });

        // Initial render
        renderRecords();
    </script>
</body>

</html>