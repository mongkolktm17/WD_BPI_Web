<!doctype html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily NVR Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
</head>
<?php
require_once 'config.php';

// --- Authentication Check ---
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

$current_user_id = $_SESSION["id"];
$current_username = $_SESSION["username"];
$is_admin = ($_SESSION["user_type"] === 'admin');
$report_message = '';

// --- AJAX Action Handling ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['action'])) {
    if ($_POST['action'] === 'delete_submission' && $is_admin) {
        $submission_id = $_POST['submission_id'];

        $sql_delete = "DELETE FROM cctv_reports WHERE submission_id = ?";
        $stmt_delete = $conn->prepare($sql_delete);
        $stmt_delete->bind_param("s", $submission_id);

        if ($stmt_delete->execute()) {
            header('Content-Type: application/json');
            echo json_encode(['success' => true]);
        } else {
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database delete failed.']);
        }
        exit;
    }
}

// --- Form Submission Handling ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['days'])) {
    $days_data = $_POST['days'];
    $submission_id = uniqid('sub_');

    $conn->begin_transaction();
    try {
        foreach ($days_data as $building => $nvrs) {
            foreach ($nvrs as $nvrName => $days) {
                $days = trim($days);
                if ($days === '' || (int) $days < 0)
                    continue;
                $days = (int) $days;

                $sql_device = "SELECT channels, target_days FROM cctv_devices WHERE building = ? AND nvr_name = ?";
                $stmt_device = $conn->prepare($sql_device);
                $stmt_device->bind_param("ss", $building, $nvrName);
                $stmt_device->execute();
                $result_device = $stmt_device->get_result();
                $device = $result_device->fetch_assoc();
                $total_channels = $device ? (int) $device['channels'] : 0;
                $offline_channels = $total_channels > 0 ? $total_channels - $days : 0;
                $online_percentage = $total_channels > 0 ? ($days / $total_channels) * 100 : 0;

                $sql_report = "INSERT INTO cctv_reports (building, total_channels, online_channels, offline_channels, online_percentage, submitted_by_id, submission_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt_report = $conn->prepare($sql_report);
                $stmt_report->bind_param("siiidis", $building, $total_channels, $days, $offline_channels, $online_percentage, $current_user_id, $submission_id);
                $stmt_report->execute();
                $report_id = $stmt_report->insert_id;

                $sql_details = "INSERT INTO cctv_report_details (report_id, nvr_name, online_channels) VALUES (?, ?, ?)";
                $stmt_details = $conn->prepare($sql_details);
                $stmt_details->bind_param("isi", $report_id, $nvrName, $days);
                $stmt_details->execute();
            }
        }
        $conn->commit();
        $report_message = '<div class="mt-4 p-4 bg-green-100 text-green-800 rounded-lg">บันทึกรายงานประจำวันสำเร็จ!</div>';
    } catch (Exception $e) {
        $conn->rollback();
        $report_message = '<div class="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">เกิดข้อผิดพลาดในการบันทึกรายงาน: ' . $e->getMessage() . '</div>';
    }
}

// --- Data Fetching for Form ---
$nvr_data_from_db = [];
$sql_nvr = "SELECT building, nvr_name, area, channels, drive_capacity, total_capacity_tb, target_days FROM cctv_devices ORDER BY building, nvr_name";
$result_nvr = $conn->query($sql_nvr);
if ($result_nvr->num_rows > 0) {
    while ($row = $result_nvr->fetch_assoc()) {
        if (!isset($nvr_data_from_db[$row['building']])) {
            $nvr_data_from_db[$row['building']] = [];
        }
        $nvr_data_from_db[$row['building']][] = $row;
    }
}

// --- Data Fetching for History ---
$history_data = [];
$filter_date = $_GET['filter_date'] ?? null;

$sql_history = "SELECT 
                    r.submission_id, 
                    MIN(r.report_time) as submission_time, 
                    u.username as submitted_by,
                    r.submitted_by_id,
                    COUNT(r.id) as nvr_count
                FROM cctv_reports r
                JOIN users u ON r.submitted_by_id = u.id
                WHERE r.submission_id IS NOT NULL";

if ($filter_date) {
    $sql_history .= " AND DATE(r.report_time) = ?";
}

$sql_history .= " GROUP BY r.submission_id, u.username, r.submitted_by_id
                ORDER BY submission_time DESC
                LIMIT 15";

$stmt_history = $conn->prepare($sql_history);

if ($filter_date) {
    $stmt_history->bind_param("s", $filter_date);
}
$stmt_history->execute();
$result_history = $stmt_history->get_result();

if ($result_history && $result_history->num_rows > 0) {
    while ($row = $result_history->fetch_assoc()) {
        $history_data[] = $row;
    }
}

// --- NVR Status Counts for 62-day criteria ---
$nvr_status_counts = [
    'B2' => ['total' => 10, 'passed' => 0],
    'B3' => ['total' => 2, 'passed' => 0],
    'B4' => ['total' => 6, 'passed' => 0],
    'B9' => ['total' => 1, 'passed' => 0],
];

$sql_latest_nvr_data = "
    SELECT
        cr.building,
        crd.nvr_name,
        crd.online_channels
    FROM
        cctv_reports cr
    JOIN
        cctv_report_details crd ON cr.id = crd.report_id
    WHERE
        (cr.building, crd.nvr_name, cr.report_time) IN (
            SELECT
                cr_inner.building,
                crd_inner.nvr_name,
                MAX(cr_inner.report_time)
            FROM
                cctv_reports cr_inner
            JOIN
                cctv_report_details crd_inner ON cr_inner.id = crd_inner.report_id
            GROUP BY
                cr_inner.building,
                crd_inner.nvr_name
        )
";

$result_latest_nvr_data = $conn->query($sql_latest_nvr_data);

if ($result_latest_nvr_data && $result_latest_nvr_data->num_rows > 0) {
    while ($row = $result_latest_nvr_data->fetch_assoc()) {
        $building = $row['building'];
        $online_channels = (int) $row['online_channels'];

        // Check if the building is one of the specified ones and if it passes the 62-day criteria
        if (isset($nvr_status_counts[$building]) && $online_channels >= 62) {
            $nvr_status_counts[$building]['passed']++;
        }
    }
}

$conn->close();
?>
<link rel="stylesheet" href="theme.css">
</head>

<body class="custom-font" style="background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);">
    <main class="min-h-full py-8 px-4">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="glass-card rounded-3xl shadow-xl p-8 mb-8">
                <div class="flex justify-between items-start">
                    <!-- Left side: Title and Subtitle -->
                    <div>
                        <h1 class="text-3xl font-bold section-title mb-2">Daily NVR Report</h1>
                        <p class="text-gray-600 text-lg">กรอกจำนวนวันที่สามารถบันทึกข้อมูลย้อนหลังได้ของ NVR
                            แต่ละเครื่อง</p>
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

            <?php echo $report_message; ?>

            <div class="glass-card rounded-3xl shadow-xl p-8 mb-8">
                <h2 class="text-2xl font-bold section-title mb-4">สรุปสถานะ NVR (≥ 62 วัน)</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <?php foreach ($nvr_status_counts as $building_key => $counts): ?>
                        <div class="bg-white/50 border border-slate-200/50 rounded-lg p-4 text-center">
                            <p class="text-lg font-semibold text-slate-700">อาคาร
                                <?php echo htmlspecialchars($building_key); ?></p>
                            <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 mb-1">
                                <?php
                                $percentage = ($counts['total'] > 0) ? round(($counts['passed'] / $counts['total']) * 100) : 0;
                                $bar_color = ($percentage == 100) ? 'bg-green-600' : 'bg-red-600';
                                ?>
                                <div class="<?php echo $bar_color; ?> h-2.5 rounded-full"
                                    style="width: <?php echo $percentage; ?>%"></div>
                            </div>
                            <p class="text-sm text-slate-500 mt-2">
                                <span
                                    class="font-bold <?php echo ($counts['passed'] == $counts['total']) ? 'text-green-600' : 'text-red-600'; ?>"><?php echo $counts['passed']; ?></span>
                                / <?php echo $counts['total']; ?> ผ่านเกณฑ์
                            </p>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <div id="buildingTabsContainer" class="flex items-center border-b border-sky-200 mb-4 overflow-x-auto pb-2">
            </div>

            <form id="nvrReportForm" method="POST" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>"
                class="glass-card rounded-3xl shadow-xl p-8 border border-sky-100">
                <div id="formContainer"></div>
                <div class="mt-8 border-t border-gray-200 pt-6 flex justify-end">
                    <button type="submit"
                        class="submit-btn-modern text-white py-3 px-8 rounded-2xl text-lg">ส่งรายงานทั้งหมด</button>
                </div>
            </form>

            <div id="historySection" class="glass-card rounded-3xl shadow-xl p-8 mt-12 border border-sky-100">
                <h2 class="text-2xl font-bold section-title mb-6">ประวัติการรายงาน</h2>

                <div class="flex flex-wrap items-center gap-4 mb-6">
                    <label for="filterDate" class="font-medium text-slate-700">กรองตามวันที่:</label>
                    <input type="date" id="filterDate"
                        class="input-modern px-4 py-3 rounded-2xl font-medium text-gray-700">
                    <button id="applyFilterBtn"
                        class="submit-btn-modern text-white font-semibold py-3 px-6 rounded-xl">ค้นหา</button>
                    <button id="clearFilterBtn"
                        class="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 px-6 rounded-xl">ล้างตัวกรอง</button>
                </div>

                <div id="historyContainer" class="space-y-4"></div>
            </div>
        </div>
    </main>

    <script>
        const nvrData = <?php echo json_encode($nvr_data_from_db); ?>;
        let historyData = <?php echo json_encode($history_data); ?>;
        const isAdmin = <?php echo json_encode($is_admin); ?>;
        const currentUserId = <?php echo json_encode($current_user_id); ?>;
        let currentBuilding = null;

        function handleDelete(submissionId) {
            if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายงาน ID: ${submissionId}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                return;
            }
            const formData = new FormData();
            formData.append('action', 'delete_submission');
            formData.append('submission_id', submissionId);
            fetch('nvr_recording_days.php', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('ลบรายงานสำเร็จ');
                        location.reload();
                    } else {
                        alert('เกิดข้อผิดพลาดในการลบ: ' + (data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    alert('เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์');
                    console.error('Error:', error);
                });
        }

        function renderHistory() {
            const container = document.getElementById('historyContainer');
            if (historyData.length === 0) {
                container.innerHTML = '<p class="text-center text-slate-500 py-8">ยังไม่มีประวัติการรายงาน</p>';
                return;
            }
            container.innerHTML = historyData.map((report, index) => {
                const canEdit = isAdmin || currentUserId === parseInt(report.submitted_by_id, 10);
                const canDelete = isAdmin;
                const editButton = canEdit ? `<a href="edit_nvr_report.php?submission_id=${report.submission_id}" class="text-sm font-semibold text-blue-600 hover:text-blue-800">แก้ไข</a>` : '';
                const deleteButton = canDelete ? `<button onclick="handleDelete('${report.submission_id}')" class="text-sm font-semibold text-red-600 hover:text-red-800">ลบ</button>` : '';

                return `
                <div class="bg-white/50 border border-slate-200/50 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p class="font-bold text-slate-800">รายงาน #${historyData.length - index}</p>
                        <p class="text-sm text-slate-500">โดย: ${report.submitted_by} | เวลา: ${new Date(report.submission_time).toLocaleString('th-TH')} | จำนวน: ${report.nvr_count} เครื่อง</p>
                    </div>
                    <div class="flex items-center gap-4">
                        ${editButton}
                        ${deleteButton}
                    </div>
                </div>
            `;
            }).join('');
        }

        function renderBuildingTabs() {
            const container = document.getElementById('buildingTabsContainer');
            const buildings = Object.keys(nvrData);
            if (buildings.length === 0) return;
            currentBuilding = buildings[0];
            container.innerHTML = buildings.map((building, index) => {
                const isActive = index === 0;
                return `<button type="button" class="building-tab px-4 py-3 font-semibold text-sm rounded-t-lg whitespace-nowrap transition-colors duration-200 ${isActive ? 'bg-white/80 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-white/50'}" data-building="${building}">อาคาร ${building}</button>`;
            }).join('');
            document.querySelectorAll('.building-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const targetBuilding = e.target.dataset.building;
                    currentBuilding = targetBuilding;
                    document.querySelectorAll('.building-tab').forEach(t => {
                        t.classList.remove('bg-white/80', 'text-blue-700', 'border-b-2', 'border-blue-600');
                        t.classList.add('text-slate-500', 'hover:bg-white/50');
                    });
                    e.target.classList.add('bg-white/80', 'text-blue-700', 'border-b-2', 'border-blue-600');
                    e.target.classList.remove('text-slate-500', 'hover:bg-white/50');
                    document.querySelectorAll('.building-section').forEach(section => {
                        section.style.display = section.id === `building-${targetBuilding}` ? 'block' : 'none';
                    });
                });
            });
        }

        function renderDailyReportForm() {
            const container = document.getElementById('formContainer');
            let formHtml = '';
            if (Object.keys(nvrData).length === 0) {
                container.innerHTML = '<p class="text-center text-slate-500">ไม่พบข้อมูล NVR ในระบบ</p>';
                return;
            }
            for (const [building, nvrs] of Object.entries(nvrData)) {
                const isFirstBuilding = building === currentBuilding;
                formHtml += `<section id="building-${building}" class="building-section" style="display: ${isFirstBuilding ? 'block' : 'none'};">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            `;
                nvrs.forEach(nvr => {
                    const inputName = `days[${building}][${nvr.nvr_name}]`;
                    const cardId = `nvr-card-${building}-${nvr.nvr_name.replace(/\s+/g, '-')}`;
                    formHtml += `<div id="${cardId}" class="nvr-card bg-slate-100/50 border border-slate-200/50 rounded-lg p-4 flex flex-col space-y-4 transition-colors duration-300">
                        <div>
                            <h3 class="font-bold text-lg text-slate-800">${nvr.nvr_name}</h3>
                            <p class="text-sm text-slate-500 h-10">${nvr.area}</p>
                        </div>
                        <div class="text-sm space-y-2 border-t border-b border-slate-200/50 py-3">
                            <dl class="flex justify-between"><dt class="text-slate-500">CH</dt><dd class="font-semibold">${nvr.channels}</dd></dl>
                            <dl class="flex justify-between"><dt class="text-slate-500">Capacity</dt><dd class="font-semibold">${nvr.total_capacity_tb} TB</dd></dl>
                            <dl class="flex justify-between"><dt class="text-green-600">Target</dt><dd class="font-semibold text-green-700">≥${nvr.target_days} วัน</dd></dl>
                        </div>
                        <div class="flex flex-col">
                            <label for="${inputName}" class="text-sm font-medium text-slate-700 mb-2">จำนวนวันที่บันทึกได้</label>
                            <input type="number" id="${inputName}" name="${inputName}" data-target="${nvr.target_days}" data-card-id="${cardId}" class="nvr-days-input input-modern w-full px-4 py-3 rounded-2xl font-medium text-gray-700" placeholder="กรอกจำนวนวัน" min="0">
                        </div>
                    </div>`;
                });
                formHtml += `</div></section>`;
            }
            container.innerHTML = formHtml;
        }

        function setupInputListeners() {
            document.querySelectorAll('.nvr-days-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const card = document.getElementById(e.target.dataset.cardId);
                    // Use 62 as the target for coloring, as per user's request
                    const target = 62;
                    const value = e.target.value;
                    card.classList.remove('bg-green-200/50', 'border-green-300/50', 'bg-red-200/50', 'border-red-300/50', 'bg-slate-100/50', 'border-slate-200/50');
                    if (value === '' || value === null) {
                        card.classList.add('bg-slate-100/50', 'border-slate-200/50');
                    } else {
                        const numericValue = parseInt(value, 10);
                        if (numericValue >= target) {
                            card.classList.add('bg-green-200/50', 'border-green-300/50');
                        } else {
                            card.classList.add('bg-red-200/50', 'border-red-300/50');
                        }
                    }
                });
            });
        }

        document.addEventListener('DOMContentLoaded', () => {
            renderBuildingTabs();
            renderDailyReportForm();
            setupInputListeners();
            renderHistory();

            const filterDateInput = document.getElementById('filterDate');
            const urlParams = new URLSearchParams(window.location.search);
            const filterDate = urlParams.get('filter_date');
            filterDateInput.value = filterDate || new Date().toISOString().split('T')[0];

            document.getElementById('applyFilterBtn').addEventListener('click', () => {
                const selectedDate = filterDateInput.value;
                if (selectedDate) {
                    window.location.href = `nvr_recording_days.php?filter_date=${selectedDate}`;
                } else {
                    alert('กรุณาเลือกวันที่เพื่อกรองรายงาน');
                }
            });

            document.getElementById('clearFilterBtn').addEventListener('click', () => {
                window.location.href = 'nvr_recording_days.php';
            });
        });
    </script>
</body>

</html>