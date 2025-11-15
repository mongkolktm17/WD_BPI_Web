<?php
// This will handle authentication, authorization, and session/db setup.
require_once "check_permissions.php";

// Check for any messages passed via URL, like access denied errors.
$error_message = '';
if (isset($_GET['error']) && $_GET['error'] === 'access_denied') {
    $error_message = 'You do not have permission to access that page.';
}

// --- Pagination ---
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$records_per_page = 10;
$offset = ($page - 1) * $records_per_page;

// --- Get Total Records for Pagination ---
$count_sql = "SELECT SUM(c) as total_records FROM (
    (SELECT COUNT(*) as c FROM reports)
    UNION ALL
    (SELECT COUNT(*) as c FROM car_parking_reports)
    UNION ALL
    (SELECT COUNT(*) as c FROM cctv_inspections)
    UNION ALL
    (SELECT COUNT(*) as c FROM hand_held_checks)
    UNION ALL
    (SELECT COUNT(*) as c FROM patrol_reports)
    UNION ALL
    (SELECT COUNT(*) as c FROM security_guard_counts)
    UNION ALL
    (SELECT COUNT(*) as c FROM cctv_reports)
    UNION ALL
    (SELECT COUNT(*) as c FROM cctv_angle_reports)
    UNION ALL
    (SELECT COUNT(*) as c FROM metal_detector_checks)
) as counts";

$count_stmt = $conn->prepare($count_sql);
$total_records = 0;
if ($count_stmt) {
    if ($count_stmt->execute()) {
        $count_result = $count_stmt->get_result();
        $total_records_row = $count_result->fetch_assoc();
        $total_records = $total_records_row ? $total_records_row['total_records'] : 0;
    } else {
        $error_message .= " Error counting records: " . htmlspecialchars($count_stmt->error);
    }
    $count_stmt->close();
} else {
    $error_message .= " Error preparing count query: " . htmlspecialchars($conn->error);
}
$total_pages = $total_records > 0 ? ceil($total_records / $records_per_page) : 0;

// Fetch reports from the database using a prepared statement for consistency.
$reports_result = null;
$sql = "(SELECT
    r.submission_time,
    'รายงานทั่วไป' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('อาคาร: ', r.building, ', จุด: ', r.guard_post, ' - ', r.incident_report) COLLATE utf8mb4_unicode_ci AS details,
    r.full_name COLLATE utf8mb4_unicode_ci AS submitted_by,
    CONCAT('view_report.php?id=', r.id) COLLATE utf8mb4_unicode_ci AS report_link,
    CONCAT('edit_report.php?id=', r.id) COLLATE utf8mb4_unicode_ci AS edit_link,
    CONCAT('delete_report.php?id=', r.id) COLLATE utf8mb4_unicode_ci AS delete_link,
    r.employee_id COLLATE utf8mb4_unicode_ci as employee_id
FROM reports r)
UNION ALL
(SELECT
    cpr.created_at AS submission_time,
    'ตรวจลานจอดรถ' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('กะ: ', cpr.shift, ', สถานะยางอะไหล่: ', cpr.spare_tire_status) COLLATE utf8mb4_unicode_ci AS details,
    cpr.inspector_name COLLATE utf8mb4_unicode_ci AS submitted_by,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS report_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS edit_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS delete_link,
    cpr.inspector_code COLLATE utf8mb4_unicode_ci as employee_id
FROM car_parking_reports cpr)
UNION ALL
(SELECT
    ci.created_at AS submission_time,
    'ตรวจห้อง CCTV' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('ห้อง: ', ci.cctv_room, ', กะ: ', ci.shift) COLLATE utf8mb4_unicode_ci AS details,
    ci.employee_name COLLATE utf8mb4_unicode_ci AS submitted_by,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS report_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS edit_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS delete_link,
    ci.employee_id COLLATE utf8mb4_unicode_ci as employee_id
FROM cctv_inspections ci)
UNION ALL
(SELECT
    hhc.created_at AS submission_time,
    'ตรวจ Hand Held' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('อาคาร: ', hhc.building, ', จุด: ', hhc.guard_post, ', กะ: ', hhc.shift) COLLATE utf8mb4_unicode_ci AS details,
    hhc.inspector_name COLLATE utf8mb4_unicode_ci AS submitted_by,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS report_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS edit_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS delete_link,
    hhc.inspector_code COLLATE utf8mb4_unicode_ci as employee_id
FROM hand_held_checks hhc)
UNION ALL
(SELECT
    pr.created_at AS submission_time,
    'Checklist Patrol' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('อาคาร: ', pr.building, ', กะ: ', pr.shift, ', เวลา: ', pr.patrol_time) COLLATE utf8mb4_unicode_ci AS details,
    pr.inspector_name COLLATE utf8mb4_unicode_ci AS submitted_by,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS report_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS edit_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS delete_link,
    pr.employee_id COLLATE utf8mb4_unicode_ci as employee_id
FROM patrol_reports pr)
UNION ALL
(SELECT
    sgc.created_at AS submission_time,
    'บันทึกจำนวน รปภ.' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('กะเช้า: ', sgc.morning_shift, ', กะค่ำ: ', sgc.evening_shift, ', รวม: ', sgc.total) COLLATE utf8mb4_unicode_ci AS details,
    u.username COLLATE utf8mb4_unicode_ci AS submitted_by,
    'guard_duty_log.php' COLLATE utf8mb4_unicode_ci AS report_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS edit_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS delete_link,
    u.employee_id COLLATE utf8mb4_unicode_ci as employee_id
FROM security_guard_counts sgc
LEFT JOIN users u ON sgc.submitted_by_id = u.id)
UNION ALL
(SELECT
    cr.report_time AS submission_time,
    'NVR Recording' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('อาคาร: ', cr.building, ', Online: ', cr.online_channels, '/', cr.total_channels) COLLATE utf8mb4_unicode_ci AS details,
    u.username COLLATE utf8mb4_unicode_ci AS submitted_by,
    CONCAT('edit_nvr_report.php?submission_id=', cr.submission_id) COLLATE utf8mb4_unicode_ci AS report_link,
    CONCAT('edit_nvr_report.php?submission_id=', cr.submission_id) COLLATE utf8mb4_unicode_ci AS edit_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS delete_link,
    u.employee_id COLLATE utf8mb4_unicode_ci as employee_id
FROM cctv_reports cr
JOIN users u ON cr.submitted_by_id = u.id)
UNION ALL
(SELECT
    car.report_date AS submission_time,
    'CCTV Angle Check' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('อาคาร: ', car.building, ', NVR: ', car.nvr, ', ถูกต้อง: ', car.correct_cameras, '/', car.total_cameras) COLLATE utf8mb4_unicode_ci AS details,
    car.checked_by COLLATE utf8mb4_unicode_ci AS submitted_by,
    'cctv_angle_check.php' COLLATE utf8mb4_unicode_ci AS report_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS edit_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS delete_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci as employee_id
FROM cctv_angle_reports car)
UNION ALL
(SELECT
    mdc.created_at AS submission_time,
    'ตรวจ Metal Detector' COLLATE utf8mb4_unicode_ci AS report_type,
    CONCAT('อาคาร: ', mdc.building, ', จุด: ', mdc.guard_post, ', ยี่ห้อ: ', mdc.scanner_brand) COLLATE utf8mb4_unicode_ci AS details,
    mdc.employee_name COLLATE utf8mb4_unicode_ci AS submitted_by,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS report_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS edit_link,
    CAST(NULL AS CHAR(255)) COLLATE utf8mb4_unicode_ci AS delete_link,
    mdc.employee_id COLLATE utf8mb4_unicode_ci as employee_id
FROM metal_detector_checks mdc)
ORDER BY submission_time DESC
LIMIT ? OFFSET ?";

$stmt = $conn->prepare($sql);

if ($stmt) {
    $stmt->bind_param("ii", $records_per_page, $offset);
    if ($stmt->execute()) {
        $reports_result = $stmt->get_result();
    } else {
        // In a production app, log this error. For now, display it.
        $error_message = "Error executing query: " . htmlspecialchars($stmt->error);
    }
    $stmt->close();
} else {
    // In a production app, log this error. For now, display it.
    $error_message = "Error preparing query: " . htmlspecialchars($conn->error);
}

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard ระบบความปลอดภัย</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="theme.css">
</head>
<body class="custom-font" style="background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <!-- Header -->
        <div class="glass-card rounded-3xl shadow-xl p-8 mb-8">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold section-title mb-2">Dashboard</h1>
                    <p class="text-gray-600 text-lg">ยินดีต้อนรับ, <?php echo htmlspecialchars($_SESSION["username"]); ?>!</p>
                </div>
                <div class="flex items-center space-x-2">
                    <?php if (isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions'])) : ?>
                        <a href="manage_officers.php" class="submit-btn-modern text-white text-sm font-semibold py-2 px-4 rounded-xl">จัดการเจ้าหน้าที่</a>
                        <a href="manage_roles.php" class="submit-btn-modern text-white text-sm font-semibold py-2 px-4 rounded-xl">จัดการ Role</a>
                    <?php endif; ?>
                    <a href="logout.php" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl transition-colors">ออกจากระบบ</a>
                </div>
            </div>
        </div>

        <!-- Navigation Links -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
            <?php 
            $forms = [
                ['title' => 'รายงานทั่วไป', 'link' => 'report.php', 'icon' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>'],
                ['title' => 'รายงานอาคาร', 'link' => 'select_building.php', 'icon' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M9 21v-2.25a2.25 2.25 0 00-2.25-2.25H5.25v-2.25H3v4.5h1.5v-2.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75V21m-3-18h-2.25a2.25 2.25 0 00-2.25 2.25v2.25H3V1.5h2.25A2.25 2.25 0 017.5 3.75v2.25H9V3.75A2.25 2.25 0 006.75 1.5z" /></svg>'],
                ['title' => 'ตรวจลานจอดรถ', 'link' => 'car_parking.php', 'icon' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h10.5a1.125 1.125 0 001.125-1.125V6.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 6.75v10.5a1.125 1.125 0 001.125 1.125z" /></svg>'],
                ['title' => 'ตรวจห้อง CCTV', 'link' => 'cctv_inspection_form.php', 'icon' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3"><path stroke-linecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg>'],
                ['title' => 'ตรวจ Hand Held', 'link' => 'check_hand_held.php', 'icon' => '<img src="report_assets/Images/tool_2.png" alt="Hand Held" class="w-10 h-10 mb-3">'],
                ['title' => 'Checklist Patrol', 'link' => 'check_list_patrol_new.php', 'icon' => '<img src="report_assets/Images/security-officer.png" alt="Patrol" class="w-10 h-10 mb-3">'],
                ['title' => 'ตรวจ Metal Detector', 'link' => 'walkthrough_metal_detector.php', 'icon' => '<img src="report_assets/Images/metal-detector-gate.png" alt="Metal Detector" class="w-10 h-10 mb-3">'],
                ['title' => 'NVR Recording Days', 'link' => 'nvr_recording_days.php', 'icon' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'],
                ['title' => 'CCTV Angle Check', 'link' => 'cctv_angle_check.php', 'icon' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>'],
                ['title' => 'Guard Duty Log', 'link' => 'guard_duty_log.php', 'icon' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>'],
                ['title' => 'รายงาน CCTV', 'link' => 'cctv_report.php', 'icon' => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>']
            ];

            $user_permissions = $_SESSION['permissions'] ?? [];

            foreach ($forms as $form):
                $page_name = strtok($form['link'], '?'); // Get the file name from the link
                if (in_array('all', $user_permissions) || in_array($page_name, $user_permissions)):
            ?>
                <a href="<?php echo $form['link']; ?>" class="glass-card rounded-2xl p-6 text-center text-slate-700 hover:text-blue-600 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div class="text-blue-500 mx-auto"><?php echo $form['icon']; ?></div>
                    <span class="font-semibold mt-2 block"><?php echo $form['title']; ?></span>
                </a>
            <?php 
                endif;
            endforeach; 
            ?>
        </div>

        <?php if (!empty($error_message)): ?>
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong class="font-bold">Notice:</strong>
                <span class="block sm:inline"><?php echo htmlspecialchars($error_message); ?></span>
            </div>
        <?php endif; ?>

        <!-- Reports Table -->
        <div class="glass-card rounded-3xl shadow-xl p-6 mt-8">
            <h2 class="text-2xl font-bold section-title mb-6">รายงานเหตุการณ์ล่าสุด</h2>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-transparent">
                    <thead class="text-slate-600 uppercase text-sm leading-normal">
                        <tr>
                            <th class="py-3 px-6 text-left">เวลาส่ง</th>
                            <th class="py-3 px-6 text-left">ประเภทรายงาน</th>
                            <th class="py-3 px-6 text-left">รายละเอียด</th>
                            <th class="py-3 px-6 text-left">ผู้รายงาน</th>
                            <th class="py-3 px-6 text-center">การกระทำ</th>
                        </tr>
                    </thead>
                    <tbody class="text-slate-600 text-sm font-light">
                        <?php if ($reports_result && $reports_result->num_rows > 0): ?>
                            <?php while($row = $reports_result->fetch_assoc()): ?>
                                <tr class="border-b border-slate-200/50 hover:bg-white/50">
                                    <td class="py-4 px-6 text-left whitespace-nowrap"><?php echo htmlspecialchars($row["submission_time"]); ?></td>
                                    <td class="py-4 px-6 text-left"><?php echo htmlspecialchars($row["report_type"]); ?></td>
                                    <td class="py-4 px-6 text-left max-w-xs truncate"><?php echo htmlspecialchars($row["details"]); ?></td>
                                    <td class="py-4 px-6 text-left"><?php echo htmlspecialchars($row["submitted_by"]); ?></td>
                                    <td class="py-4 px-6 text-center">
                                        <div class="flex item-center justify-center">
                                            <?php
                                            $is_admin = isset($_SESSION['permissions']) && in_array('all', $_SESSION['permissions']);
                                            $is_author = isset($_SESSION['employee_id']) && isset($row['employee_id']) && $_SESSION['employee_id'] == $row['employee_id'];

                                            if ($row['report_link']):
                                            ?>
                                                <a href="<?php echo htmlspecialchars($row['report_link']); ?>" class="w-5 mr-2 transform text-blue-500 hover:text-blue-700 hover:scale-110">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </a>
                                            <?php endif; ?>
                                            <?php if (($is_admin || $is_author) && $row['edit_link']): ?>
                                                <a href="<?php echo htmlspecialchars($row['edit_link']); ?>" class="w-5 mr-2 transform text-blue-500 hover:text-blue-700 hover:scale-110">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                                                    </svg>
                                                </a>
                                            <?php endif; ?>
                                            <?php if (($is_admin || $is_author) && $row['delete_link']): ?>
                                                <a href="<?php echo htmlspecialchars($row['delete_link']); ?>" onclick="return confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายงานนี้?');" class="w-5 mr-2 transform text-red-500 hover:text-red-700 hover:scale-110">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </a>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php endwhile; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="5" class="py-6 text-center text-slate-500">ยังไม่มีรายงาน</td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <?php if ($total_pages > 1): ?>
            <div class="mt-6 flex items-center justify-between">
                <div class="text-sm text-slate-600">
                    Showing page <?php echo $page; ?> of <?php echo $total_pages; ?>
                </div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <?php if ($page > 1): ?>
                        <a href="?page=<?php echo $page - 1; ?>" class="relative inline-flex items-center px-3 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                            <span>Previous</span>
                        </a>
                    <?php endif; ?>

                    <?php
                    // Pagination with ellipsis
                    $start = max(1, $page - 2);
                    $end = min($total_pages, $page + 2);

                    if ($start > 1) {
                        echo '<a href="?page=1" class="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">1</a>';
                        if ($start > 2) {
                            echo '<span class="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">...</span>';
                        }
                    }

                    for ($i = $start; $i <= $end; $i++):
                    ?>
                        <a href="?page=<?php echo $i; ?>" class="relative inline-flex items-center px-4 py-2 border text-sm font-medium <?php echo $i == $page ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'; ?> transition-colors">
                            <?php echo $i; ?>
                        </a>
                    <?php endfor; ?>

                    <?php
                    if ($end < $total_pages) {
                        if ($end < $total_pages - 1) {
                            echo '<span class="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">...</span>';
                        }
                        echo '<a href="?page='.$total_pages.'" class="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">'.$total_pages.'</a>';
                    }
                    ?>

                    <?php if ($page < $total_pages): ?>
                        <a href="?page=<?php echo $page + 1; ?>" class="relative inline-flex items-center px-3 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                            <span>Next</span>
                        </a>
                    <?php endif; ?>
                </nav>
            </div>
            <?php endif; ?>
        </div>
    </div>

</body>
</html>
<?php
$conn->close();
?>