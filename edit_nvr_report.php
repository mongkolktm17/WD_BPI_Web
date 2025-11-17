<?php
require_once 'config.php';

// --- Authentication Check ---
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

// --- Get Submission ID and verify ---
if (!isset($_GET['submission_id'])) {
    die("Error: No submission ID provided.");
}
$submission_id = $_GET['submission_id'];

$current_user_id = $_SESSION["id"];
$current_username = $_SESSION["username"];
$is_admin = ($_SESSION["user_type"] === 'admin');
$report_message = '';

// --- Fetch original submitter to check permissions ---
$sql_perm_check = "SELECT submitted_by_id FROM cctv_reports WHERE submission_id = ? LIMIT 1";
$stmt_perm_check = $conn->prepare($sql_perm_check);
$stmt_perm_check->bind_param("s", $submission_id);
$stmt_perm_check->execute();
$result_perm_check = $stmt_perm_check->get_result();
$report_owner = $result_perm_check->fetch_assoc();

if (!$report_owner || (!$is_admin && $report_owner['submitted_by_id'] != $current_user_id)) {
    die("Error: You do not have permission to edit this report.");
}

// --- Form Update Handling ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['days'])) {
    $days_data = $_POST['days'];
    
    $conn->begin_transaction();
    try {
        foreach ($days_data as $building => $nvrs) {
            foreach ($nvrs as $nvrName => $days) {
                $days = trim($days);
                if ($days === '' || (int)$days < 0) continue; 
                $days = (int)$days;

                // Get total channels to recalculate offline channels
                $sql_device = "SELECT channels FROM cctv_devices WHERE building = ? AND nvr_name = ?";
                $stmt_device = $conn->prepare($sql_device);
                $stmt_device->bind_param("ss", $building, $nvrName);
                $stmt_device->execute();
                $result_device = $stmt_device->get_result();
                $device = $result_device->fetch_assoc();
                $total_channels = $device ? (int)$device['channels'] : 0;
                $offline_channels = $total_channels > 0 ? $total_channels - $days : 0;

                // Update both tables using a JOIN
                $sql_update = "UPDATE cctv_reports r
                               JOIN cctv_report_details d ON r.id = d.report_id
                               SET r.online_channels = ?, d.online_channels = ?, r.offline_channels = ?
                               WHERE r.submission_id = ? AND r.building = ? AND d.nvr_name = ?";
                $stmt_update = $conn->prepare($sql_update);
                $stmt_update->bind_param("iiisss", $days, $days, $offline_channels, $submission_id, $building, $nvrName);
                $stmt_update->execute();
            }
        }
        $conn->commit();
        $report_message = '<div class="mt-4 p-4 bg-green-100 text-green-800 rounded-lg">อัปเดตรายงานสำเร็จ! <a href="nvr_recording_days.php" class="font-bold underline">กลับไปหน้ารายงานหลัก</a></div>';
    } catch (Exception $e) {
        $conn->rollback();
        $report_message = '<div class="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">เกิดข้อผิดพลาดในการอัปเดต: ' . $e->getMessage() . '</div>';
    }
}


// --- Data Fetching for Form ---
$nvr_data_from_db = [];
$sql_nvr = "SELECT building, nvr_name, area, channels, drive_capacity, total_capacity_tb, target_days FROM cctv_devices ORDER BY building, nvr_name";
$result_nvr = $conn->query($sql_nvr);
if ($result_nvr->num_rows > 0) {
    while($row = $result_nvr->fetch_assoc()) {
        if (!isset($nvr_data_from_db[$row['building']])) {
            $nvr_data_from_db[$row['building']] = [];
        }
        $nvr_data_from_db[$row['building']][] = $row;
    }
}

// --- Fetch existing data for this specific report ---
$existing_report_data = [];
$sql_existing = "SELECT r.building, d.nvr_name, d.online_channels FROM cctv_reports r JOIN cctv_report_details d ON r.id = d.report_id WHERE r.submission_id = ?";
$stmt_existing = $conn->prepare($sql_existing);
$stmt_existing->bind_param("s", $submission_id);
$stmt_existing->execute();
$result_existing = $stmt_existing->get_result();
if ($result_existing) {
    while($row = $result_existing->fetch_assoc()) {
        $existing_report_data[$row['building']][$row['nvr_name']] = $row['online_channels'];
    }
}


$conn->close();
?>
<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit NVR Report</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
</head>
<body class="bg-slate-50 text-slate-800">
  <div class="container mx-auto px-4 py-8">
   <div class="max-w-7xl mx-auto">
    <header class="text-center mb-8 md:mb-12">
        <h1 class="text-3xl md:text-4xl font-bold text-slate-900">Edit Report (ID: <?php echo htmlspecialchars($submission_id); ?>)</h1>
        <p class="text-slate-600">แก้ไขจำนวนวันที่บันทึกได้ แล้วกดอัปเดต</p>
        <a href="nvr_recording_days.php" class="text-blue-600 hover:underline">&larr; กลับไปหน้ารายงานหลัก</a>
    </header>

    <?php echo $report_message; ?>

    <form id="nvrReportForm" method="POST" action="<?php echo htmlspecialchars($_SERVER["REQUEST_URI"]); ?>" class="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-slate-200">
        <div id="formContainer"></div>
        <div class="mt-8 border-t border-slate-200 pt-6 flex justify-end">
            <button type="submit" class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg transition-colors">อัปเดตรายงาน</button>
        </div>
    </form>

   </div>
  </div>

  <script>
    const nvrData = <?php echo json_encode($nvr_data_from_db); ?>;
    const existingReportData = <?php echo json_encode($existing_report_data); ?>;

    function renderEditForm() {
        const container = document.getElementById('formContainer');
        let formHtml = '';

        for (const [building, nvrs] of Object.entries(nvrData)) {
            formHtml += `<section class="mb-10">
                    <h2 class="text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">อาคาร ${building}</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            `;

            nvrs.forEach(nvr => {
                const inputName = `days[${building}][${nvr.nvr_name}]`;
                const savedValue = existingReportData[building]?.[nvr.nvr_name] || '';
                
                formHtml += `<div class="nvr-card bg-slate-100 border border-slate-200 rounded-lg p-4 flex flex-col space-y-4">
                        <div>
                            <h3 class="font-bold text-lg text-slate-800">${nvr.nvr_name}</h3>
                        </div>
                        <div class="flex flex-col">
                            <label for="${inputName}" class="text-sm font-medium text-slate-700 mb-2">จำนวนวันที่บันทึกได้</label>
                            <input type="number" value="${savedValue}" id="${inputName}" name="${inputName}" class="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="กรอกจำนวนวัน" min="0">
                        </div>
                    </div>`;
            });

            formHtml += `</div></section>`;
        }

        container.innerHTML = formHtml;
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderEditForm();
    });
  </script>
</body>
</html>
