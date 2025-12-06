<?php
/**
 * check_officers_db.php
 * Debug script to check officers in database vs CSV
 */

require_once "check_permissions.php";

// Get all officers from database
$sql = "SELECT employee_id, first_name, last_name, eng_first_name, eng_last_name, username 
        FROM users 
        WHERE user_type = 'officer' 
        ORDER BY employee_id";
$result = $conn->query($sql);

$db_officers = [];
while ($row = $result->fetch_assoc()) {
    $db_officers[$row['employee_id']] = $row;
}

// Read CSV file
$csv_officers = [];
$csv_file = 'report_assets/officers.csv';
if (file_exists($csv_file)) {
    $handle = fopen($csv_file, 'r');
    // Skip header
    fgetcsv($handle);

    while (($data = fgetcsv($handle)) !== FALSE) {
        if (count($data) >= 8) {
            $csv_officers[$data[1]] = [
                'employee_id' => $data[1],
                'first_name' => $data[2],
                'last_name' => $data[3],
                'eng_first_name' => $data[4],
                'eng_last_name' => $data[5],
                'username' => $data[6]
            ];
        }
    }
    fclose($handle);
}

// Compare
echo "<h1>การเปรียบเทียบข้อมูลพนักงาน</h1>";
echo "<h2>จำนวน:</h2>";
echo "<p>ในฐานข้อมูล: " . count($db_officers) . " คน</p>";
echo "<p>ในไฟล์ CSV: " . count($csv_officers) . " คน</p>";

echo "<h2>รายการที่อยู่ใน CSV แต่ไม่มีในฐานข้อมูล:</h2>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><th>รหัสพนักงาน</th><th>ชื่อไทย</th><th>นามสกุลไทย</th><th>ชื่ออังกฤษ</th><th>Username</th></tr>";

$missing_count = 0;
foreach ($csv_officers as $emp_id => $csv_data) {
    if (!isset($db_officers[$emp_id])) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($emp_id) . "</td>";
        echo "<td>" . htmlspecialchars($csv_data['first_name']) . "</td>";
        echo "<td>" . htmlspecialchars($csv_data['last_name']) . "</td>";
        echo "<td>" . htmlspecialchars($csv_data['eng_first_name'] . ' ' . $csv_data['eng_last_name']) . "</td>";
        echo "<td>" . htmlspecialchars($csv_data['username']) . "</td>";
        echo "</tr>";
        $missing_count++;
    }
}
echo "</table>";
echo "<p><strong>รวม: $missing_count คนที่ยังไม่ได้นำเข้า</strong></p>";

echo "<h2>รายการที่อยู่ในฐานข้อมูล แต่ไม่มีใน CSV:</h2>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><th>รหัสพนักงาน</th><th>ชื่อไทย</th><th>นามสกุลไทย</th><th>ชื่ออังกฤษ</th><th>Username</th></tr>";

$extra_count = 0;
foreach ($db_officers as $emp_id => $db_data) {
    if (!isset($csv_officers[$emp_id])) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($emp_id) . "</td>";
        echo "<td>" . htmlspecialchars($db_data['first_name']) . "</td>";
        echo "<td>" . htmlspecialchars($db_data['last_name']) . "</td>";
        echo "<td>" . htmlspecialchars($db_data['eng_first_name'] . ' ' . $db_data['eng_last_name']) . "</td>";
        echo "<td>" . htmlspecialchars($db_data['username']) . "</td>";
        echo "</tr>";
        $extra_count++;
    }
}
echo "</table>";
echo "<p><strong>รวม: $extra_count คนที่อยู่ในฐานข้อมูลเกิน</strong></p>";

$conn->close();
?>