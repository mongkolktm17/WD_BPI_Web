<?php
// Use the centralized permission checker
require_once "check_permissions.php";

// No need to escape with real_escape_string when using prepared statements
$building = $_GET['building'] ?? '';
$report_id = $_GET['id'] ?? $_GET['submission_id'] ?? null;
$type = $_GET['type'] ?? 'reports';

$reports = [];
$type_label = "รายงานทั่วไป";

if ($report_id) {
    // Single report detail view
    $table_map = [
        'reports' => ['table' => 'reports', 'pk' => 'id', 'label' => 'รายงานทั่วไป'],
        'car_parking' => ['table' => 'car_parking_reports', 'pk' => 'id', 'label' => 'ตรวจลานจอดรถ'],
        'cctv_inspection' => ['table' => 'cctv_inspections', 'pk' => 'id', 'label' => 'ตรวจห้อง CCTV'],
        'hand_held' => ['table' => 'hand_held_checks', 'pk' => 'id', 'label' => 'ตรวจ Hand Held'],
        'patrol' => ['table' => 'patrol_reports', 'pk' => 'id', 'label' => 'Checklist Patrol'],
        'guard_count' => ['table' => 'security_guard_counts', 'pk' => 'id', 'label' => 'บันทึกจำนวน รปภ.'],
        'cctv_report' => ['table' => 'cctv_reports', 'pk' => 'id', 'label' => 'NVR Recording'],
        'cctv_angle' => ['table' => 'cctv_angle_reports', 'pk' => 'id', 'label' => 'CCTV Angle Check'],
        'metal_detector' => ['table' => 'metal_detector_checks', 'pk' => 'id', 'label' => 'ตรวจ Metal Detector']
    ];

    if (isset($table_map[$type])) {
        $config = $table_map[$type];
        $table = $config['table'];
        $pk = $config['pk'];
        $type_label = $config['label'];
        $pk_type = $config['type'] ?? 'i';

        $sql = "SELECT * FROM `$table` WHERE `$pk` = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($pk_type, $report_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $reports[] = $row;

            // Fetch extra data if needed (e.g., car parking lots)
            if ($type === 'car_parking') {
                $sql_lots = "SELECT * FROM parking_lot_counts WHERE report_id = ?";
                $stmt_lots = $conn->prepare($sql_lots);
                $stmt_lots->bind_param("i", $report_id);
                $stmt_lots->execute();
                $res_lots = $stmt_lots->get_result();
                $reports[0]['lots'] = $res_lots->fetch_all(MYSQLI_ASSOC);
                $stmt_lots->close();
            }
        }
        $stmt->close();
    }
} else {
    // List view by building (default behavior)
    if ($building) {
        $sql = "SELECT * FROM reports WHERE building = ? AND (is_deleted IS NULL OR is_deleted = 0) ORDER BY report_date DESC, submission_time DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $building);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $sql = "SELECT * FROM reports WHERE (is_deleted IS NULL OR is_deleted = 0) ORDER BY report_date DESC, submission_time DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
    }
    while ($row = $result->fetch_assoc()) {
        $reports[] = $row;
    }
    if (isset($stmt))
        $stmt->close();
}

?>

<!DOCTYPE html>
<html lang="th">

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ดูรายละเอียด - <?php echo htmlspecialchars($type_label); ?></title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto p-4 max-w-4xl">
        <header class="bg-blue-600 text-white p-6 rounded-t-2xl flex justify-between items-center shadow-lg">
            <div>
                <h1 class="text-2xl font-bold">
                    <?php
                    if ($report_id)
                        echo $type_label;
                    else
                        echo $building ? 'รายงานอาคาร ' . htmlspecialchars($building) : 'รายงานทั้งหมด';
                    ?>
                </h1>
            </div>
            <a href="report_page.php"
                class="text-sm bg-white text-blue-600 font-bold py-2 px-3 rounded-xl hover:bg-gray-200 transition-colors">กลับ
                Dashboard</a>
        </header>
        <div class="bg-white p-8 rounded-b-2xl shadow-xl border-x border-b border-gray-200">
            <div class="space-y-6">
                <?php if (!empty($reports)): ?>
                    <?php foreach ($reports as $row): ?>
                        <div class="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                            <div class="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
                                <div>
                                    <h2 class="text-2xl font-bold text-gray-800">
                                        <?php
                                        $date_val = $row['report_date'] ?? $row['inspection_date'] ?? $row['report_time'] ?? $row['created_at'] ?? 'ไม่ทราบวันที่';
                                        echo 'วันที่ ' . htmlspecialchars(substr($date_val, 0, 10));
                                        ?>
                                    </h2>
                                    <p class="text-gray-500 mt-1">ผู้รายงาน:
                                        <?php echo htmlspecialchars($row['full_name'] ?? $row['inspector_name'] ?? $row['employee_name'] ?? $row['checked_by'] ?? 'N/A'); ?>
                                    </p>
                                </div>
                                <div class="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-bold">
                                    <?php echo htmlspecialchars($row['shift'] ?? 'N/A'); ?>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-gray-700">
                                <?php
                                $exclude = ['id', 'is_deleted', 'deleted_by', 'deleted_at', 'updated_by', 'updated_at', 'lots', 'submission_id', 'submitted_by_id'];
                                foreach ($row as $key => $value):
                                    if (in_array($key, $exclude) || empty($value) && $value !== '0')
                                        continue;

                                    $label = ucwords(str_replace('_', ' ', $key));
                                    // Custom labels translates
                                    $translations = [
                                        'report_date' => 'วันที่รายงาน',
                                        'inspection_date' => 'วันที่ตรวจสอบ',
                                        'employee_id' => 'รหัสพนักงาน',
                                        'full_name' => 'ชื่อ-นามสกุล',
                                        'inspector_name' => 'ชื่อผู้ตรวจ',
                                        'inspector_code' => 'รหัสผู้ตรวจ',
                                        'shift' => 'กะ',
                                        'building' => 'อาคาร',
                                        'guard_post' => 'จุดรักษาการณ์',
                                        'report_time' => 'เวลารายงาน',
                                        'incident_report' => 'รายละเอียดเหตุการณ์',
                                        'special_incident' => 'เหตุการณ์พิเศษ',
                                        'emergency_incident' => 'เหตุฉุกเฉิน',
                                        'spare_tire_status' => 'สถานะยางอะไหล่',
                                        'license_plates' => 'ป้ายทะเบียน',
                                        'cctv_room' => 'ห้อง CCTV',
                                        'patrol_time' => 'เวลาสายตรวจ',
                                        'report_condition' => 'เงื่อนไขรายงาน'
                                    ];
                                    $display_label = $translations[$key] ?? $label;
                                    ?>
                                    <div
                                        class="border-b border-gray-100 pb-2 col-span-1 <?php echo strlen($value) > 50 ? 'md:col-span-2' : ''; ?>">
                                        <span
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1"><?php echo htmlspecialchars($display_label); ?></span>
                                        <span class="text-lg font-medium"><?php echo nl2br(htmlspecialchars($value)); ?></span>
                                    </div>
                                <?php endforeach; ?>

                                <?php if (isset($row['lots']) && !empty($row['lots'])): ?>
                                    <div class="col-span-1 md:col-span-2 mt-4">
                                        <span
                                            class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">จำนวนรถในแต่ละลาน</span>
                                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <?php foreach ($row['lots'] as $lot): ?>
                                                <div class="bg-white p-3 rounded-xl border border-gray-200">
                                                    <span class="block text-xs text-gray-500 truncate"
                                                        title="<?php echo htmlspecialchars($lot['lot_name']); ?>"><?php echo htmlspecialchars($lot['lot_name']); ?></span>
                                                    <span
                                                        class="text-xl font-bold text-blue-600"><?php echo htmlspecialchars($lot['vehicle_count']); ?></span>
                                                    <span
                                                        class="text-xs text-gray-400 ml-1"><?php echo $lot['vehicle_type'] === 'car' ? 'คัน' : 'คัน'; ?></span>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-center py-12">
                        <div
                            class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                class="w-8 h-8">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold text-gray-400">ไม่พบข้อมูลรายงาน</h3>
                        <p class="text-gray-400 mt-2">รายงานอาจถูกลบหรือไม่มีอยู่ในระบบ</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <footer class="mt-8 text-center text-gray-400 text-sm">
            &copy; 2025 PCS Engineering Solution. All rights reserved.
        </footer>
    </div>
</body>

</html>
<?php
$conn->close();
?>