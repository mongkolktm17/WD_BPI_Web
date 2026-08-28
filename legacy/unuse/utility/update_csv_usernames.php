<?php
/**
 * update_csv_usernames.php
 * 
 * Updates the officers.csv file to reflect new username format
 * (English first name + 2 chars from English last name)
 */

// CSV file path
$csv_file = 'report_assets/officers.csv';
$output_file = 'report_assets/officers_updated.csv';

if (!file_exists($csv_file)) {
    die("Error: CSV file not found at $csv_file");
}

echo "<!DOCTYPE html>";
echo "<html lang='th'>";
echo "<head>";
echo "<meta charset='UTF-8'>";
echo "<title>Update CSV Usernames</title>";
echo "<link href='https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap' rel='stylesheet'>";
echo "<script src='https://cdn.tailwindcss.com'></script>";
echo "<style>body { font-family: 'Sarabun', sans-serif; }</style>";
echo "</head>";
echo "<body class='bg-gray-100 p-8'>";

echo "<div class='max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8'>";
echo "<h1 class='text-3xl font-bold text-gray-800 mb-6'>อัพเดต CSV File - Username Format</h1>";

// Read CSV
$handle = fopen($csv_file, 'r');
$output_data = [];

// Read header
$header = fgetcsv($handle);
$output_data[] = $header;

$updated_count = 0;
$unchanged_count = 0;

echo "<div class='mb-6'>";
echo "<h2 class='text-2xl font-bold text-gray-700 mb-4'>กำลังประมวลผล...</h2>";
echo "<div class='bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto'>";
echo "<table class='min-w-full text-sm'>";
echo "<thead class='bg-gray-200'>";
echo "<tr>";
echo "<th class='px-3 py-2'>ลำดับ</th>";
echo "<th class='px-3 py-2'>รหัสพนักงาน</th>";
echo "<th class='px-3 py-2'>ชื่อ-นามสกุล</th>";
echo "<th class='px-3 py-2'>Username เดิม</th>";
echo "<th class='px-3 py-2'>→</th>";
echo "<th class='px-3 py-2'>Username ใหม่</th>";
echo "</tr>";
echo "</thead>";
echo "<tbody>";

while (($data = fgetcsv($handle)) !== FALSE) {
    if (count($data) < 8) {
        $output_data[] = $data;
        continue;
    }

    $employee_id = trim($data[1]);
    $first_name = trim($data[2]);
    $last_name = trim($data[3]);
    $eng_first_name = trim($data[4]);
    $eng_last_name = trim($data[5]);
    $old_username = trim($data[6]);

    // Generate new username
    $base_username = strtolower($eng_first_name);
    $last_name_suffix = strtolower(substr($eng_last_name, 0, 2));
    $new_username = $base_username . $last_name_suffix;

    // Update username in data array
    $data[6] = $new_username;
    $output_data[] = $data;

    // Display change
    $changed = ($old_username !== $new_username);
    if ($changed) {
        $updated_count++;
        $row_class = "bg-yellow-50";
    } else {
        $unchanged_count++;
        $row_class = "bg-white";
    }

    echo "<tr class='$row_class'>";
    echo "<td class='px-3 py-2 border text-center'>" . htmlspecialchars($data[0]) . "</td>";
    echo "<td class='px-3 py-2 border text-center'>" . htmlspecialchars($employee_id) . "</td>";
    echo "<td class='px-3 py-2 border'>" . htmlspecialchars($first_name . ' ' . $last_name) . "</td>";
    echo "<td class='px-3 py-2 border font-mono text-gray-600'>" . htmlspecialchars($old_username) . "</td>";
    echo "<td class='px-3 py-2 border text-center'>" . ($changed ? "→" : "=") . "</td>";
    echo "<td class='px-3 py-2 border font-mono font-bold'>";
    if ($changed) {
        echo "<span class='text-green-600'>✅ " . htmlspecialchars($new_username) . "</span>";
    } else {
        echo htmlspecialchars($new_username);
    }
    echo "</td>";
    echo "</tr>";
}

echo "</tbody>";
echo "</table>";
echo "</div>";
echo "</div>";

fclose($handle);

// Write updated CSV
$output_handle = fopen($output_file, 'w');
foreach ($output_data as $row) {
    fputcsv($output_handle, $row);
}
fclose($output_handle);

echo "<div class='mb-6 bg-green-50 border border-green-300 rounded-lg p-4'>";
echo "<h3 class='font-bold text-green-800 mb-2'>✅ สำเร็จ!</h3>";
echo "<p class='text-green-700'>อัพเดต: $updated_count รายการ</p>";
echo "<p class='text-green-700'>ไม่เปลี่ยนแปลง: $unchanged_count รายการ</p>";
echo "<p class='text-green-700 mt-2'>ไฟล์ใหม่ถูกบันทึกที่: <strong>$output_file</strong></p>";
echo "</div>";

echo "<div class='bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6'>";
echo "<h3 class='font-bold text-yellow-800 mb-2'>⚠️ คำแนะนำ</h3>";
echo "<p class='text-yellow-700'>1. ตรวจสอบไฟล์ <strong>officers_updated.csv</strong> ให้แน่ใจว่าถูกต้อง</p>";
echo "<p class='text-yellow-700'>2. สำรองไฟล์เดิม officers.csv</p>";
echo "<p class='text-yellow-700'>3. เปลี่ยนชื่อ officers_updated.csv เป็น officers.csv</p>";
echo "</div>";

echo "<div class='flex gap-4'>";
echo "<a href='report_assets/officers_updated.csv' download class='bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold'>💾 ดาวน์โหลด CSV ใหม่</a>";
echo "<a href='dashboard.php' class='bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700'>กลับ Dashboard</a>";
echo "</div>";

echo "</div>";
echo "</body>";
echo "</html>";
?>