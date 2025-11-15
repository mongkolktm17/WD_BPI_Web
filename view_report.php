<?php
// Use the centralized permission checker
require_once "check_permissions.php";

// No need to escape with real_escape_string when using prepared statements
$building = isset($_GET['building']) ? $_GET['building'] : '';

if ($building) {
    $sql = "SELECT report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident FROM reports WHERE building = ? ORDER BY report_date DESC, submission_time DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $building);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $sql = "SELECT report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident FROM reports ORDER BY report_date DESC, submission_time DESC";
    // Use prepared statement for consistency
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
}

?>

<!DOCTYPE html>
<html lang="th">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ดูรายงาน</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto p-4">
        <header class="bg-blue-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold"><?php echo $building ? 'รายงานอาคาร ' . htmlspecialchars($building) : 'รายงานทั้งหมด'; ?></h1>
            </div>
            <a href="report_page.php" class="text-sm bg-white text-blue-600 font-bold py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">กลับ Dashboard</a>
        </header>
        <div class="bg-white p-4 rounded-b-2xl shadow-lg">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <?php if ($result && $result->num_rows > 0): ?>
                    <?php while($row = $result->fetch_assoc()): ?>
                        <div class="bg-white rounded-lg shadow-md p-6">
                            <h2 class="text-xl font-bold mb-2">รายงานวันที่ <?php echo htmlspecialchars($row['report_date']); ?></h2>
                            <p class="text-gray-600 mb-4">อาคาร <?php echo htmlspecialchars($row['building']); ?> กะ <?php echo htmlspecialchars($row['shift']); ?></p>
                            <div class="space-y-2">
                                <p><strong>พนักงาน:</strong> <?php echo htmlspecialchars($row['full_name']); ?> (<?php echo htmlspecialchars($row['employee_id']); ?>)</p>
                                <p><strong>จุดรักษาการณ์:</strong> <?php echo htmlspecialchars($row['guard_post']); ?></p>
                                <p><strong>เวลารายงาน:</strong> <?php echo htmlspecialchars($row['report_time']); ?></p>
                                <p><strong>เหตุการณ์:</strong> <?php echo nl2br(htmlspecialchars($row['incident_report'])); ?></p>
                                <?php if (!empty($row['special_incident'])): ?>
                                    <p><strong>เหตุการณ์พิเศษ:</strong> <?php echo nl2br(htmlspecialchars($row['special_incident'])); ?></p>
                                <?php endif; ?>
                                <?php if (!empty($row['emergency_incident'])): ?>
                                    <p><strong>เหตุฉุกเฉิน:</strong> <?php echo nl2br(htmlspecialchars($row['emergency_incident'])); ?></p>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endwhile; ?>
                    <?php if(isset($stmt)) $stmt->close(); ?>
                <?php else: ?>
                    <p class="text-center text-gray-500 col-span-full">ไม่พบรายงาน</p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>
<?php
$conn->close();
?>