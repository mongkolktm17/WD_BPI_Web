<?php
/**
 * test_encoding.php
 * Test script to check Thai encoding in database
 */

require_once "check_permissions.php";

// Set charset to UTF-8
$conn->set_charset("utf8mb4");

// Get officer 242 data
$sql = "SELECT id, first_name, last_name, eng_first_name, eng_last_name, employee_id, username 
        FROM users 
        WHERE id = 242";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $officer = $result->fetch_assoc();
    echo "<h1>ข้อมูลพนักงาน ID 242</h1>";
    echo "<table border='1' cellpadding='10'>";
    echo "<tr><th>ฟิลด์</th><th>ค่า</th><th>Hex</th></tr>";

    foreach ($officer as $key => $value) {
        $hex = bin2hex($value);
        echo "<tr>";
        echo "<td><strong>$key</strong></td>";
        echo "<td>" . htmlspecialchars($value, ENT_QUOTES, 'UTF-8') . "</td>";
        echo "<td style='font-family: monospace; font-size: 10px;'>" . $hex . "</td>";
        echo "</tr>";
    }

    echo "</table>";

    // Check CSV data
    echo "<hr>";
    echo "<h2>ข้อมูลจาก CSV (รหัส 10546294)</h2>";

    $csv_file = 'report_assets/officers.csv';
    if (file_exists($csv_file)) {
        $handle = fopen($csv_file, 'r');

        // Set locale for proper Thai character handling
        setlocale(LC_ALL, 'th_TH.UTF-8');

        // Skip header
        fgetcsv($handle);

        while (($data = fgetcsv($handle)) !== FALSE) {
            if (trim($data[1]) == '10546294') {
                echo "<table border='1' cellpadding='10'>";
                echo "<tr><th>Field</th><th>Value</th></tr>";
                echo "<tr><td>ลำดับ</td><td>" . htmlspecialchars($data[0]) . "</td></tr>";
                echo "<tr><td>รหัสพนักงาน</td><td>" . htmlspecialchars($data[1]) . "</td></tr>";
                echo "<tr><td>ชื่อภาษาไทย</td><td>" . htmlspecialchars($data[2]) . "</td></tr>";
                echo "<tr><td>นามสกุลภาษาไทย</td><td>" . htmlspecialchars($data[3]) . "</td></tr>";
                echo "<tr><td>ชื่อภาษาอังกฤษ</td><td>" . htmlspecialchars($data[4]) . "</td></tr>";
                echo "<tr><td>นามสกุลภาษาอังกฤษ</td><td>" . htmlspecialchars($data[5]) . "</td></tr>";
                echo "<tr><td>username</td><td>" . htmlspecialchars($data[6]) . "</td></tr>";
                echo "<tr><td>password</td><td>" . htmlspecialchars($data[7]) . "</td></tr>";
                echo "</table>";
                break;
            }
        }
        fclose($handle);
    }
} else {
    echo "ไม่พบข้อมูล";
}

$conn->close();
?>