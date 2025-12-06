<?php
/**
 * generate_camera_names_sql.php
 * 
 * อ่านไฟล์ CSV ทั้งหมดและสร้าง SQL INSERT statements
 * สำหรับตาราง cctv_camera_names
 */

$buildings = ['B2', 'B3', 'B4', 'B9'];
$csv_dir = 'report_assets/CCTV/';
$insert_statements = [];
$create_table_sql = "
-- สร้างตาราง cctv_camera_names
CREATE TABLE IF NOT EXISTS cctv_camera_names (
    id INT AUTO_INCREMENT PRIMARY KEY,
    building VARCHAR(10) NOT NULL,
    nvr_name VARCHAR(20) NOT NULL,
    channel_number INT NOT NULL,
    camera_name VARCHAR(200),
    UNIQUE KEY unique_camera (building, nvr_name, channel_number),
    INDEX idx_building (building),
    INDEX idx_nvr (building, nvr_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ลบข้อมูลเดิม (ถ้ามี)
TRUNCATE TABLE cctv_camera_names;

";

echo "กำลังประมวลผลไฟล์ CSV...\n\n";

foreach ($buildings as $building) {
    $building_dir = $csv_dir . $building . '/';

    if (!is_dir($building_dir)) {
        echo "ไม่พบโฟลเดอร์: $building_dir\n";
        continue;
    }

    $csv_files = glob($building_dir . $building . '_NVR*.csv');

    foreach ($csv_files as $csv_file) {
        $filename = basename($csv_file);
        preg_match('/NVR(\d+)/', $filename, $matches);
        $nvr_number = $matches[1];
        $nvr_name = 'NVR' . $nvr_number;

        echo "ประมวลผล: $building / $nvr_name\n";

        $handle = fopen($csv_file, 'r');
        if (!$handle)
            continue;

        // ข้ามบรรทัดแรก 3 บรรทัด (header)
        for ($i = 0; $i < 4; $i++) {
            fgetcsv($handle);
        }

        while (($data = fgetcsv($handle)) !== FALSE) {
            if (count($data) < 3)
                continue;
            if (empty(trim($data[0])))
                continue;

            $nvr_num = trim($data[0]);
            $channel_num = trim($data[1]);
            $camera_name = isset($data[2]) ? trim($data[2]) : '';

            if (empty($channel_num) || !is_numeric($channel_num))
                continue;

            // Escape single quotes
            $camera_name_escaped = str_replace("'", "''", $camera_name);

            $insert_statements[] = "('$building', '$nvr_name', $channel_num, '$camera_name_escaped')";
        }

        fclose($handle);
    }
}

// สร้าง SQL INSERT statements
$sql_output = $create_table_sql;
$sql_output .= "-- นำเข้าชื่อกล้องทั้งหมด\n";
$sql_output .= "INSERT INTO cctv_camera_names (building, nvr_name, channel_number, camera_name) VALUES\n";
$sql_output .= implode(",\n", $insert_statements);
$sql_output .= ";\n\n";

// เพิ่ม SELECT เพื่อตรวจสอบ
$sql_output .= "-- ตรวจสอบข้อมูลที่นำเข้า\n";
$sql_output .= "SELECT building, nvr_name, COUNT(*) as total_cameras FROM cctv_camera_names GROUP BY building, nvr_name ORDER BY building, nvr_name;\n";

// บันทึกไฟล์
file_put_contents('camera_names_insert.sql', $sql_output);

echo "\nเสร็จสิ้น! สร้างไฟล์ camera_names_insert.sql แล้ว\n";
echo "จำนวน INSERT statements ทั้งหมด: " . count($insert_statements) . "\n";
?>