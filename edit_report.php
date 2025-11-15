<?php
require_once "check_permissions.php";

$report_id = $_GET['id'] ?? null;
if (!$report_id) {
    header("Location: report_page.php");
    exit;
}

$error_message = '';
$message = '';
$report = null;

// Fetch the report from the database
$stmt = $conn->prepare("SELECT * FROM reports WHERE id = ?");
if ($stmt) {
    $stmt->bind_param("i", $report_id);
    if ($stmt->execute()) {
        $result = $stmt->get_result();
        if ($result->num_rows === 1) {
            $report = $result->fetch_assoc();
        } else {
            $error_message = "Report not found.";
        }
    } else {
        $error_message = "Error executing query: " . htmlspecialchars($stmt->error);
    }
    $stmt->close();
} else {
    $error_message = "Error preparing query: " . htmlspecialchars($conn->error);
}

// Handle form submission
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // CSRF Protection
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error_message = "Invalid CSRF token. Action blocked for security.";
    } else {
        // Assign variables from POST data
        $report_date = trim($_POST['report-date']);
        $employee_id = trim($_POST['employee-id']);
        $full_name = trim($_POST['full-name']);
        $shift = trim($_POST['shift']);
        $building = trim($_POST['building']);
        $guard_post = trim($_POST['guard-post']);
        $report_time = trim($_POST['report-time']);
        $incident_report = trim($_POST['incident-report']);
        $special_incident = trim($_POST['special-incident']);
        $emergency_incident = trim($_POST['emergency-incident']);

        // Basic validation
        if (empty($report_date) || empty($employee_id) || empty($full_name) || empty($shift) || empty($building) || empty($guard_post) || empty($report_time) || empty($incident_report)) {
            $error_message = "Please fill in all required fields.";
        } else {
            $sql = "UPDATE reports SET 
                        report_date = ?, 
                        employee_id = ?, 
                        full_name = ?, 
                        shift = ?, 
                        building = ?, 
                        guard_post = ?, 
                        report_time = ?, 
                        incident_report = ?, 
                        special_incident = ?, 
                        emergency_incident = ?
                    WHERE id = ?";

            if ($stmt = $conn->prepare($sql)) {
                $stmt->bind_param("ssssssssssi", 
                    $report_date, $employee_id, $full_name, $shift, $building, 
                    $guard_post, $report_time, $incident_report, $special_incident, $emergency_incident,
                    $report_id
                );
                
                if ($stmt->execute()) {
                    // Refresh the report data to show updated values
                    $stmt->close();
                    $stmt = $conn->prepare("SELECT * FROM reports WHERE id = ?");
                    $stmt->bind_param("i", $report_id);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $report = $result->fetch_assoc();
                    $stmt->close();
                    
                    $message = "Report updated successfully!";

                } else {
                    $error_message = "Error updating report: " . htmlspecialchars($stmt->error);
                }
            } else {
                $error_message = "Error preparing update query: " . htmlspecialchars($conn->error);
            }
        }
    }
}

// Set CSRF token for the form
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Report</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style> body { font-family: 'Sarabun', sans-serif; } </style>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">

    <div class="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <header class="bg-purple-600 text-white p-6 flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold">Edit Report</h1>
                <p class="text-purple-200">Update the report details below.</p>
            </div>
            <a href="report_page.php" class="text-sm bg-white text-purple-600 font-bold py-2 px-3 rounded-lg hover:bg-gray-200">Back to Dashboard</a>
        </header>

        <main class="p-6 md:p-8">
            <?php if ($message): ?>
                <div class="mb-4 p-4 rounded-lg bg-green-100 text-green-700"><?php echo htmlspecialchars($message); ?></div>
            <?php endif; ?>
            <?php if ($error_message): ?>
                <div class="mb-4 p-4 rounded-lg bg-red-100 text-red-700"><?php echo htmlspecialchars($error_message); ?></div>
            <?php endif; ?>

            <?php if ($report): ?>
                <form action="edit_report.php?id=<?php echo $report_id; ?>" method="post" class="space-y-6">
                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                    
                    <div>
                        <label for="report-date" class="block text-sm font-medium text-gray-700 mb-1">1. วัน เดือน ปี <span class="text-red-500">*</span></label>
                        <input type="date" id="report-date" name="report-date" required class="form-input w-full px-4 py-3 bg-gray-50 border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($report['report_date']); ?>">
                    </div>

                    <div>
                        <label for="employee-id" class="block text-sm font-medium text-gray-700 mb-1">2. รหัสพนักงาน PCS (8 หลัก) <span class="text-red-500">*</span></label>
                        <input type="text" id="employee-id" name="employee-id" placeholder="กรอกรหัสพนักงาน" required maxlength="8" class="form-input w-full px-4 py-3 bg-gray-50 border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($report['employee_id']); ?>">
                    </div>

                    <div>
                        <label for="full-name" class="block text-sm font-medium text-gray-700 mb-1">3. ชื่อ นามสกุล <span class="text-red-500">*</span></label>
                        <input type="text" id="full-name" name="full-name" placeholder="กรอกชื่อและนามสกุล" required class="form-input w-full px-4 py-3 bg-gray-50 border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($report['full_name']); ?>">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">4. กะ <span class="text-red-500">*</span></label>
                        <div class="flex rounded-md shadow-sm" role="group">
                            <input type="radio" id="shift_morning" name="shift" value="เช้า" class="hidden peer/morning" required <?php echo ($report['shift'] === 'เช้า') ? 'checked' : ''; ?>>
                            <label for="shift_morning" class="w-full text-center px-4 py-3 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg cursor-pointer hover:bg-gray-100 peer-checked/morning:bg-blue-500 peer-checked/morning:text-white">เช้า</label>
                            
                            <input type="radio" id="shift_night" name="shift" value="ดึก" class="hidden peer/night" <?php echo ($report['shift'] === 'ดึก') ? 'checked' : ''; ?>>
                            <label for="shift_night" class="w-full text-center px-4 py-3 text-sm font-medium text-gray-900 bg-white border-t border-b border-r border-gray-200 rounded-r-lg cursor-pointer hover:bg-gray-100 peer-checked/night:bg-blue-500 peer-checked/night:text-white">ดึก</label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">5. อาคาร <span class="text-red-500">*</span></label>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center p-3 border rounded-lg flex-1 cursor-pointer hover:bg-gray-50">
                                <input type="radio" name="building" value="4" class="h-4 w-4 text-blue-600" required <?php echo ($report['building'] === '4') ? 'checked' : ''; ?>>
                                <span class="ml-3">4</span>
                            </label>
                            <label class="flex items-center p-3 border rounded-lg flex-1 cursor-pointer hover:bg-gray-50">
                                <input type="radio" name="building" value="6" class="h-4 w-4 text-blue-600" <?php echo ($report['building'] === '6') ? 'checked' : ''; ?>>
                                <span class="ml-3">6</span>
                            </label>
                            <label class="flex items-center p-3 border rounded-lg flex-1 cursor-pointer hover:bg-gray-50">
                                <input type="radio" name="building" value="8" class="h-4 w-4 text-blue-600" <?php echo ($report['building'] === '8') ? 'checked' : ''; ?>>
                                <span class="ml-3">8</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label for="guard-post" class="block text-sm font-medium text-gray-700 mb-1">6. จุดรักษาการณ์ <span class="text-red-500">*</span></label>
                        <select id="guard-post" name="guard-post" required class="form-select w-full px-4 py-3 bg-gray-50 border-gray-300 rounded-lg">
                            <option value="" disabled>เลือกจุดรักษาการณ์</option>
                            <?php 
                            $posts = ["Gate 1", "Gate 5", "Gate 6", "Worker", "Scan Receiving", "Receiving", "Traffic Receiving", "Transfer room", "Scan Link way", "Park 3", "Custom Park 2", "Patrol 1", "Patrol 2", "Support", "B 6/1", "B 6/2", "Rel lab B2L3", "Other"];
                            foreach ($posts as $post): ?>
                                <option value="<?php echo $post; ?>" <?php echo ($report['guard_post'] === $post) ? 'selected' : ''; ?>><?php echo $post; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div>
                        <label for="report-time" class="block text-sm font-medium text-gray-700 mb-1">7. เวลารายงาน <span class="text-red-500">*</span></label>
                        <input type="time" id="report-time" name="report-time" required class="form-input w-full px-4 py-3 bg-gray-50 border-gray-300 rounded-lg" value="<?php echo htmlspecialchars($report['report_time']); ?>">
                    </div>

                    <div>
                        <label for="incident-report" class="block text-sm font-medium text-gray-700 mb-1">8. รายงานเหตุการณ์ <span class="text-red-500">*</span></label>
                        <textarea id="incident-report" name="incident-report" rows="4" placeholder="กรอกรายละเอียดเหตุการณ์" required class="form-input w-full px-4 py-3 bg-gray-50 border-gray-300 rounded-lg"><?php echo htmlspecialchars($report['incident_report']); ?></textarea>
                    </div>

                    <div>
                        <label for="special-incident" class="block text-sm font-medium text-gray-700 mb-1">9. กรณีเหตุการณ์พิเศษ</label>
                        <textarea id="special-incident" name="special-incident" rows="3" placeholder="ถ้ามี (ไม่บังคับ)" class="form-input w-full px-4 py-3 bg-gray-50 border-gray-300 rounded-lg"><?php echo htmlspecialchars($report['special_incident']); ?></textarea>
                    </div>

                    <div>
                        <label for="emergency-incident" class="block text-sm font-medium text-gray-700 mb-1">10. กรณีเหตุฉุกเฉิน</label>
                        <textarea id="emergency-incident" name="emergency-incident" rows="3" placeholder="ถ้ามี (ไม่บังคับ)" class="form-input w-full px-4 py-3 bg-gray-50 border-gray-300 rounded-lg"><?php echo htmlspecialchars($report['emergency_incident']); ?></textarea>
                    </div>

                    <div class="mt-8">
                        <button type="submit" class="w-full bg-purple-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-purple-700">Save Changes</button>
                    </div>
                </form>
            <?php elseif (!$error_message): ?>
                <p class="text-center text-gray-500">Loading report...</p>
            <?php endif; ?>
        </main>
        <footer class="text-center p-4 bg-gray-50 border-t"><p class="text-xs text-gray-500">Powered by PCS Engineering</p></footer>
    </div>

</body>
</html>
<?php
$conn->close();
?>