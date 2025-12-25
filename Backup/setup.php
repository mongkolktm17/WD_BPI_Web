<?php
/**
 * setup.php
 *
 * This script performs the complete initial setup for the application.
 * It is idempotent, meaning it can be run multiple times without causing errors or duplicating data.
 *
 * It performs the following actions:
 * 1. Creates the database if it does not exist.
 * 2. Creates all necessary tables if they do not exist.
 * 3. Seeds the database with default roles.
 * 4. Creates a default admin user.
 * 5. Seeds the database with sample officer users if none exist.
 */

require_once 'config.php';

try {
    // --- Start Transaction ---
    $conn->begin_transaction();

    // --- 3. Create Tables ---
    $table_queries = [
        "roles" => "CREATE TABLE IF NOT EXISTS `roles` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `role_name` VARCHAR(255) NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "users" => "CREATE TABLE IF NOT EXISTS `users` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `username` VARCHAR(50) NOT NULL UNIQUE,
            `password` VARCHAR(255) NOT NULL,
            `first_name` VARCHAR(50) NOT NULL,
            `last_name` VARCHAR(50) NOT NULL,
            `employee_id` VARCHAR(8) NOT NULL UNIQUE,
            `phone_number` VARCHAR(20) NOT NULL,
            `user_type` ENUM('admin', 'officer') NOT NULL DEFAULT 'officer',
            `role_id` INT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "role_permissions" => "CREATE TABLE IF NOT EXISTS `role_permissions` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `role_id` INT NOT NULL,
            `page_name` VARCHAR(255) NOT NULL,
            FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "reports" => "CREATE TABLE IF NOT EXISTS `reports` (
            `id` INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `report_date` DATE NOT NULL,
            `employee_id` VARCHAR(10) NOT NULL,
            `full_name` VARCHAR(100) NOT NULL,
            `shift` VARCHAR(10) NOT NULL,
            `building` VARCHAR(10) NOT NULL,
            `guard_post` VARCHAR(50) NOT NULL,
            `report_time` VARCHAR(10) NOT NULL,
            `incident_report` TEXT NOT NULL,
            `special_incident` TEXT,
            `emergency_incident` TEXT,
            `submission_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "car_parking_reports" => "CREATE TABLE IF NOT EXISTS `car_parking_reports` (
            `id` INT(11) AUTO_INCREMENT PRIMARY KEY,
            `inspection_date` DATE NOT NULL,
            `inspector_code` VARCHAR(255) NOT NULL,
            `inspector_name` VARCHAR(255) NOT NULL,
            `shift` VARCHAR(50) NOT NULL,
            `spare_tire_status` VARCHAR(50) NOT NULL,
            `license_plates` TEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "parking_lot_counts" => "CREATE TABLE IF NOT EXISTS `parking_lot_counts` (
            `id` INT(11) AUTO_INCREMENT PRIMARY KEY,
            `report_id` INT(11) NOT NULL,
            `lot_name` VARCHAR(255) NOT NULL,
            `vehicle_type` ENUM('car', 'motorcycle') NOT NULL,
            `vehicle_count` INT(11),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`report_id`) REFERENCES `car_parking_reports`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "cctv_inspections" => "CREATE TABLE IF NOT EXISTS `cctv_inspections` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `inspection_date` DATE NOT NULL,
            `shift` VARCHAR(50) NOT NULL,
            `cctv_room` VARCHAR(255) NOT NULL,
            `employee_id` VARCHAR(255) NOT NULL,
            `employee_name` VARCHAR(255) NOT NULL,
            `radio_status` VARCHAR(255) NOT NULL,
            `report_books_status` VARCHAR(255) NOT NULL,
            `nvr_screen_status` VARCHAR(255) NOT NULL,
            `nvr_machine_status` VARCHAR(255) NOT NULL,
            `keys_status` VARCHAR(255) NOT NULL,
            `access_control_status` VARCHAR(255) NOT NULL,
            `incident_report_status` VARCHAR(255) NOT NULL,
            `submitted_by_id` INT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "hand_held_checks" => "CREATE TABLE IF NOT EXISTS `hand_held_checks` (
            `id` INT(11) AUTO_INCREMENT PRIMARY KEY,
            `inspection_date` DATE NOT NULL,
            `building` VARCHAR(255) NOT NULL,
            `guard_post` VARCHAR(255) NOT NULL,
            `inspector_code` VARCHAR(255) NOT NULL,
            `inspector_name` VARCHAR(255) NOT NULL,
            `shift` VARCHAR(50) NOT NULL,
            `battery_status` VARCHAR(255) NOT NULL,
            `led_status` VARCHAR(255) NOT NULL,
            `detection_test_status` VARCHAR(255) NOT NULL,
            `alarm_status` VARCHAR(255) NOT NULL,
            `remarks` TEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "patrol_reports" => "CREATE TABLE IF NOT EXISTS `patrol_reports` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `report_date` DATE NOT NULL,
            `report_condition` VARCHAR(255) NOT NULL,
            `shift` VARCHAR(50) NOT NULL,
            `employee_id` VARCHAR(255) NOT NULL,
            `inspector_name` VARCHAR(255) NOT NULL,
            `patrol_time` VARCHAR(50) NOT NULL,
            `building` VARCHAR(255) NOT NULL,
            `fence_lighting` VARCHAR(50) NOT NULL,
            `fence_objects` VARCHAR(50) NOT NULL,
            `no_gathering` VARCHAR(50) NOT NULL,
            `no_flyers` VARCHAR(50) NOT NULL,
            `fence_normal` VARCHAR(50) NOT NULL,
            `no_suspicious_parking` VARCHAR(50) NOT NULL,
            `no_suspicious_boxes` VARCHAR(50) NOT NULL,
            `no_unauthorized_persons_area` VARCHAR(50) NOT NULL,
            `door_system_normal` VARCHAR(50) NOT NULL,
            `electrical_system_normal` VARCHAR(50) NOT NULL,
            `no_room_abnormalities` VARCHAR(50) NOT NULL,
            `no_unauthorized_persons_room` VARCHAR(50) NOT NULL,
            `no_chemical_obstruction` VARCHAR(50) NOT NULL,
            `no_container_leaks` VARCHAR(50) NOT NULL,
            `no_unauthorized_persons_chemical` VARCHAR(50) NOT NULL,
            `chemical_door_normal` VARCHAR(50) NOT NULL,
            `no_unauthorized_persons_electrical` VARCHAR(50) NOT NULL,
            `electrical_door_normal` VARCHAR(50) NOT NULL,
            `no_electrical_abnormalities` VARCHAR(50) NOT NULL,
            `equipment_normal` VARCHAR(50) NOT NULL,
            `no_fire_door_obstruction` VARCHAR(50) NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "metal_detector_checks" => "CREATE TABLE IF NOT EXISTS `metal_detector_checks` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `inspection_date` DATE NOT NULL,
            `shift` VARCHAR(50) NOT NULL,
            `employee_id` VARCHAR(255) NOT NULL,
            `employee_name` VARCHAR(255) NOT NULL,
            `building` VARCHAR(255) NOT NULL,
            `guard_post` VARCHAR(255) NOT NULL,
            `scanner_brand` VARCHAR(255) NOT NULL,
            `zone1_status` VARCHAR(255) NOT NULL,
            `zone2_status` VARCHAR(255) NOT NULL,
            `zone3_status` VARCHAR(255) NOT NULL,
            `zone4_status` VARCHAR(255) NOT NULL,
            `zone5_status` VARCHAR(255) NOT NULL,
            `zone6_status` VARCHAR(255) NOT NULL,
            `submitted_by_id` INT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "security_guard_counts" => "CREATE TABLE IF NOT EXISTS `security_guard_counts` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `record_date` DATE NOT NULL,
            `morning_shift` INT NOT NULL,
            `evening_shift` INT NOT NULL,
            `total` INT NOT NULL,
            `submitted_by_id` INT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "cctv_devices" => "CREATE TABLE IF NOT EXISTS `cctv_devices` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `building` VARCHAR(255) NOT NULL,
            `nvr_name` VARCHAR(255) NOT NULL,
            `channels` INT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "cctv_reports" => "CREATE TABLE IF NOT EXISTS `cctv_reports` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `building` VARCHAR(255) NOT NULL,
            `report_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `total_channels` INT NOT NULL,
            `online_channels` INT NOT NULL,
            `offline_channels` INT NOT NULL,
            `online_percentage` FLOAT NOT NULL,
            `submission_id` VARCHAR(255) NULL, -- Added for grouping submissions
            `submitted_by_id` INT,
            FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "cctv_report_details" => "CREATE TABLE IF NOT EXISTS `cctv_report_details` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `report_id` INT NOT NULL,
            `nvr_name` VARCHAR(255) NOT NULL,
            `online_channels` INT NOT NULL,
            `total_channels` INT NOT NULL DEFAULT 0,
            `channel_statuses_json` TEXT NULL,
            FOREIGN KEY (`report_id`) REFERENCES `cctv_reports`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "cctv_angle_reports" => "CREATE TABLE IF NOT EXISTS `cctv_angle_reports` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `report_date` DATETIME NOT NULL,
            `building` VARCHAR(255) NOT NULL,
            `nvr` INT NOT NULL,
            `total_cameras` INT NOT NULL,
            `correct_cameras` INT NOT NULL,
            `incorrect_cameras` INT NOT NULL,
            `checked_by` VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "nvr_recording_reports" => "CREATE TABLE IF NOT EXISTS `nvr_recording_reports` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `building` VARCHAR(10) NOT NULL,
            `submission_id` VARCHAR(50),
            `submitted_by_id` INT NOT NULL,
            `report_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_building` (`building`),
            INDEX `idx_submission_id` (`submission_id`),
            INDEX `idx_report_time` (`report_time`),
            FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores NVR recording days reports'",

        "nvr_recording_details" => "CREATE TABLE IF NOT EXISTS `nvr_recording_details` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `report_id` INT NOT NULL,
            `nvr_name` VARCHAR(50) NOT NULL,
            `recording_days` INT NOT NULL,
            `target_days` INT DEFAULT 62,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_report_id` (`report_id`),
            INDEX `idx_nvr_name` (`nvr_name`),
            FOREIGN KEY (`report_id`) REFERENCES `nvr_recording_reports`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores per-NVR recording days details'"
    ];

    foreach ($table_queries as $table_name => $sql) {
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Error creating table '$table_name': " . $conn->error);
        }
    }

    // --- 3.1. Define database name for schema checks ---
    $dbname = DB_NAME;

    // --- 3.2. Ensure cctv_devices table has all required columns ---
    $columns_to_add = [
        'area' => 'VARCHAR(255) NULL AFTER `nvr_name`',
        'drive_capacity' => 'VARCHAR(255) NULL AFTER `channels`',
        'total_capacity_tb' => 'DECIMAL(10, 3) NULL AFTER `drive_capacity`',
        'target_days' => 'INT NULL AFTER `total_capacity_tb`'
    ];

    foreach ($columns_to_add as $column => $definition) {
        $sql_check_column = "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$dbname' AND TABLE_NAME = 'cctv_devices' AND COLUMN_NAME = '$column'";
        $result_check_column = $conn->query($sql_check_column);
        if ($result_check_column->num_rows == 0) {
            $sql_alter = "ALTER TABLE `cctv_devices` ADD COLUMN `$column` $definition";
            if ($conn->query($sql_alter) !== TRUE) {
                throw new Exception("Error adding column `$column` to `cctv_devices`: " . $conn->error);
            }
        }
    }

    // --- 3.3. Ensure `submission_id` column exists in `cctv_reports` ---
    $sql_check_submission_id = "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$dbname' AND TABLE_NAME = 'cctv_reports' AND COLUMN_NAME = 'submission_id'";
    $result_check_submission_id = $conn->query($sql_check_submission_id);
    if ($result_check_submission_id->num_rows == 0) {
        $sql_alter_submission = "ALTER TABLE `cctv_reports` ADD COLUMN `submission_id` VARCHAR(255) NULL AFTER `submitted_by_id`";
        if ($conn->query($sql_alter_submission) !== TRUE) {
            throw new Exception("Error adding column `submission_id` to `cctv_reports`: " . $conn->error);
        }
    }

    // --- 3.5. Ensure `total_channels` column exists in `cctv_report_details` ---
    $sql_check_column_total_channels = "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$dbname' AND TABLE_NAME = 'cctv_report_details' AND COLUMN_NAME = 'total_channels'";
    $result_check_column_total_channels = $conn->query($sql_check_column_total_channels);
    if ($result_check_column_total_channels->num_rows == 0) {
        $sql_alter_table = "ALTER TABLE `cctv_report_details` ADD COLUMN `total_channels` INT NOT NULL DEFAULT 0 AFTER `online_channels`";
        if ($conn->query($sql_alter_table) !== TRUE) {
            throw new Exception("Error altering `cctv_report_details` table: " . $conn->error);
        }
    }

    // --- 3.6. Ensure `channel_statuses_json` column exists in `cctv_report_details` ---
    $sql_check_column = "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$dbname' AND TABLE_NAME = 'cctv_report_details' AND COLUMN_NAME = 'channel_statuses_json'";
    $result_check_column = $conn->query($sql_check_column);
    if ($result_check_column->num_rows == 0) {
        $sql_alter_table = "ALTER TABLE `cctv_report_details` ADD COLUMN `channel_statuses_json` TEXT NULL AFTER `total_channels`";
        if ($conn->query($sql_alter_table) !== TRUE) {
            throw new Exception("Error altering `cctv_report_details` table for `channel_statuses_json`: " . $conn->error);
        }
    }

    // --- 3.7. Drop UNIQUE constraint from nvr_recording_reports.submission_id if exists ---
    $sql_check_unique = "SELECT 1 FROM information_schema.statistics 
                         WHERE table_schema = '$dbname' 
                         AND table_name = 'nvr_recording_reports' 
                         AND index_name = 'submission_id'";
    $result_check_unique = $conn->query($sql_check_unique);
    if ($result_check_unique && $result_check_unique->num_rows > 0) {
        $sql_drop_unique = "ALTER TABLE `nvr_recording_reports` DROP INDEX `submission_id`";
        if ($conn->query($sql_drop_unique) !== TRUE) {
            // Ignore error if index doesn't exist
        }
    }

    // Temporarily disable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 0;");

    // --- Truncate CCTV report tables for clean slate during setup ---
    $conn->query("TRUNCATE TABLE `cctv_report_details`");
    $conn->query("TRUNCATE TABLE `cctv_reports`");

    // Re-enable foreign key checks
    $conn->query("SET FOREIGN_KEY_CHECKS = 1;");

    // --- 4. Truncate and Re-seed CCTV Devices with new detailed data ---
    $conn->query("TRUNCATE TABLE `cctv_devices`");

    $cctv_devices = [
        ['B2', 'NVR-1', 'Centen Canteen กลาง+Canteen B2L4', 31, '8TB (2ลูก),4TB (4ลูก)', 36.387, 62],
        ['B2', 'NVR-2', 'Relialab lab room B2L3+ภายใน Lift', 32, '8TB (4ลูก),4TB (4ลูก)', 43.664, 62],
        ['B2', 'NVR-3', 'แนวรั้วด้านนอกอาคาร 1-2-6', 61, '10TB (6ลูก),8TB (2ลูก)', 69.129, 62],
        ['B2', 'NVR-4', 'ภายในห้องครัว+ลานจอดรถ Park 1,Park 2', 64, '10TB (8ลูก)', 72.765, 62],
        ['B2', 'NVR-5', 'ภายในอาคาร 6 ชั้น 1-2-3 เพิ่มกล้อง 2 ตัว', 38, '10TB (3ลูก),8TB (5ลูก)', 63.674, 62],
        ['B2', 'NVR-6', 'ภายในอาคาร 1 ชั้น 1', 32, '8TB (8ลูก)', 58.219, 62],
        ['B2', 'NVR-7', 'ลานจอดรถ Park 1,Park 2', 32, '8TB (5ลูก),4TB (3ลูก)', 47.303, 62],
        ['B2', 'NVR-8', 'แนว Locker อาคาร 1-2-6+ภายในอาคาร2 ชั้น 3', 63, '10TB (8ลูก)', 72.765, 62],
        ['B2', 'NVR-9', 'Receiving อาคาร 2 + หน้า Lift อาคาร 2', 32, '8TB (4ลูก),4TB (3ลูก)', 40.025, 62],
        ['B2', 'NVR-10', 'ภายในอาคาร 2 ชั้น 2', 32, '8TB (4ลูก),4TB (4ลูก)', 43.664, 62],
        ['B3', 'NVR-1', 'ภายในอาคาร 3+แนวรั้ว', 32, '4TB(6 ลูก) 10TB(2 ลูก)', 40.023, 62],
        ['B3', 'NVR-2', 'Park 4', 46, '8TB(3 ลูก) 10TB(5 ลูก)', 67.310, 62],
        ['B4', 'NVR-1', 'Office  ชั้น ลอย,ชั้นลอยจุดพักผ่อน', 64, '8 TB ( 3ลูก),10 TB ( 5ลูก)', 67.310, 62],
        ['B4', 'NVR-2', 'Scrap park 3/1,จุดรวมพล+เต็นท์มาเลย์', 32, '4 TB ( 4ลูก),8 TB ( 4ลูก)', 43.664, 62],
        ['B4', 'NVR-3', 'Transfer room+ด้านใน Lift ของอาคาร 4', 62, '8 TB ( 8ลูก)', 58.219, 62],
        ['B4', 'NVR-4', 'แนวรั้วด้านนอกอาคาร 4+Receiving อาคาร 4', 32, '4 TB ( 3ลูก),8 TB ( 5ลูก)', 47.303, 62],
        ['B4', 'NVR-5', 'Packing+แนวทางเดินเข้าอาคาร 4 ชั้น 1', 62, '8 TB ( 1ลูก),10 TB ( 7ลูก)', 70.947, 62],
        ['B4', 'NVR-6', 'ห้อง IT DATA  เพิ่มกล้อง 4 ตัว Speed dome 2 ตัว-กล้องเลนวาย 1 ตัว-Gate 5 =1 ตัว', 29, '4 TB ( 2ลูก),8 TB ( 6ลูก)', 50.941, 62],
        ['B9', 'NVR-1', 'ทุกพื้นที่ของอาคาร 8 + แนวถนนทางเข้าซอย 2  +ติดตั้งกล้อง Speed Dome เพิ่ม', 41, '8 TB  ( 7ลูก) 4 TB ( 1ลูก)', 54.580, 62]
    ];

    $sql_cctv = "INSERT INTO cctv_devices (building, nvr_name, area, channels, drive_capacity, total_capacity_tb, target_days) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt_cctv = $conn->prepare($sql_cctv);
    if ($stmt_cctv === false) {
        throw new Exception("Error preparing cctv_devices statement: " . $conn->error);
    }

    foreach ($cctv_devices as $device) {
        $stmt_cctv->bind_param("sssisdi", $device[0], $device[1], $device[2], $device[3], $device[4], $device[5], $device[6]);
        if (!$stmt_cctv->execute()) {
            throw new Exception("Error adding CCTV device '{$device[1]}': " . $stmt_cctv->error);
        }
    }
    $stmt_cctv->close();

    // --- 4.1. Import Camera Names from CSV Files ---
    $conn->query("TRUNCATE TABLE `cctv_camera_names`");

    $csv_files = [
        ['B.2', 'NVR-1', __DIR__ . '/report_assets/CCTV/B2/B2_NVR1.csv'],
        ['B.2', 'NVR-2', __DIR__ . '/report_assets/CCTV/B2/B2_NVR2.csv'],
        ['B.2', 'NVR-3', __DIR__ . '/report_assets/CCTV/B2/B2_NVR3.csv'],
        ['B.2', 'NVR-4', __DIR__ . '/report_assets/CCTV/B2/B2_NVR4.csv'],
        ['B.2', 'NVR-5', __DIR__ . '/report_assets/CCTV/B2/B2_NVR5.csv'],
        ['B.2', 'NVR-6', __DIR__ . '/report_assets/CCTV/B2/B2_NVR6.csv'],
        ['B.2', 'NVR-7', __DIR__ . '/report_assets/CCTV/B2/B2_NVR7.csv'],
        ['B.2', 'NVR-8', __DIR__ . '/report_assets/CCTV/B2/B2_NVR8.csv'],
        ['B.2', 'NVR-9', __DIR__ . '/report_assets/CCTV/B2/B2_NVR9.csv'],
        ['B.2', 'NVR-10', __DIR__ . '/report_assets/CCTV/B2/B2_NVR10.csv'],
        ['B.3', 'NVR-1', __DIR__ . '/report_assets/CCTV/B3/B3_NVR1.csv'],
        ['B.3', 'NVR-2', __DIR__ . '/report_assets/CCTV/B3/B3_NVR2.csv'],
        ['B.4', 'NVR-1', __DIR__ . '/report_assets/CCTV/B4/B4_NVR1.csv'],
        ['B.4', 'NVR-2', __DIR__ . '/report_assets/CCTV/B4/B4_NVR2.csv'],
        ['B.4', 'NVR-3', __DIR__ . '/report_assets/CCTV/B4/B4_NVR3.csv'],
        ['B.4', 'NVR-4', __DIR__ . '/report_assets/CCTV/B4/B4_NVR4.csv'],
        ['B.4', 'NVR-5', __DIR__ . '/report_assets/CCTV/B4/B4_NVR5.csv'],
        ['B.4', 'NVR-6', __DIR__ . '/report_assets/CCTV/B4/B4_NVR6.csv'],
        ['B.8', 'NVR-1', __DIR__ . '/report_assets/CCTV/B9/B9_NVR1.csv'],
    ];

    $sql_camera_names = "INSERT INTO cctv_camera_names (building, nvr_name, channel_number, camera_name) VALUES (?, ?, ?, ?)";
    $stmt_camera = $conn->prepare($sql_camera_names);
    if ($stmt_camera === false) {
        throw new Exception("Error preparing camera names statement: " . $conn->error);
    }

    foreach ($csv_files as list($building, $nvr_name, $csv_path)) {
        if (!file_exists($csv_path)) {
            continue; // Skip missing files silently
        }

        $file = fopen($csv_path, 'r');
        if ($file === false) {
            continue;
        }

        // Skip header rows (first 4 lines)
        for ($i = 0; $i < 4; $i++) {
            fgetcsv($file);
        }

        // Read camera data
        while (($row = fgetcsv($file)) !== false) {
            // Skip empty rows
            if (empty($row[0]) && empty($row[1]) && empty($row[2])) {
                continue;
            }

            $channel_number = isset($row[1]) ? intval($row[1]) : 0;
            $camera_name = isset($row[2]) ? trim($row[2]) : '';

            if ($channel_number <= 0 || empty($camera_name)) {
                continue;
            }

            // Insert into database
            $stmt_camera->bind_param("ssis", $building, $nvr_name, $channel_number, $camera_name);
            if (!$stmt_camera->execute()) {
                // Skip duplicates silently
                if ($conn->errno != 1062) {
                    throw new Exception("Error adding camera '{$camera_name}': " . $stmt_camera->error);
                }
            }
        }

        fclose($file);
    }

    $stmt_camera->close();

    // --- 5. Seed Default Roles ---
    $default_roles = [
        ['id' => 1, 'role_name' => 'ผู้ดูแลระบบ'],
        ['id' => 2, 'role_name' => 'หัวหน้าเจ้าหน้าที่รักษาความปลอดภัย'],
        ['id' => 3, 'role_name' => 'เจ้าหน้าที่รักษาความปลอดภัย'],
        ['id' => 4, 'role_name' => 'เจ้าหน้าที่ตรวจตรา']
    ];

    $sql_roles = "INSERT IGNORE INTO roles (id, role_name) VALUES (?, ?)";
    $stmt_roles = $conn->prepare($sql_roles);
    if ($stmt_roles === false) {
        throw new Exception("Error preparing roles statement: " . $conn->error);
    }

    foreach ($default_roles as $role) {
        $stmt_roles->bind_param("is", $role['id'], $role['role_name']);
        if ($stmt_roles->execute()) {
        } else {
            // This should not happen with INSERT IGNORE for duplicate keys
            throw new Exception("Error inserting role '{$role['role_name']}': " . $stmt_roles->error);
        }
    }
    $stmt_roles->close();

    // --- 6. Create Default Admin User ---
    $sql_admin_user = "INSERT INTO `users` (`username`, `password`, `first_name`, `last_name`, `employee_id`, `phone_number`, `user_type`, `role_id`) 
                       VALUES ('admin', ?, 'System', 'Admin', '00000000', '0000000000', 'admin', 1) 
                       ON DUPLICATE KEY UPDATE `username`=`username`"; // No-op update

    $stmt_admin = $conn->prepare($sql_admin_user);
    if ($stmt_admin === false) {
        throw new Exception("Error preparing admin user statement: " . $conn->error);
    }

    $hashed_password_admin = password_hash("admin123", PASSWORD_DEFAULT);
    $stmt_admin->bind_param("s", $hashed_password_admin);

    if ($stmt_admin->execute()) {
    } else {
        throw new Exception("Error creating default admin user: " . $stmt_admin->error);
    }
    $stmt_admin->close();

    // --- 7. Seed Sample Officer Users ---
    $sql_check_users = "SELECT COUNT(*) as count FROM users WHERE user_type = 'officer'";
    $result = $conn->query($sql_check_users);
    $row = $result->fetch_assoc();

    if ($row['count'] == 0) {
        $users = [
            [
                'first_name' => 'สมชาย',
                'last_name' => 'ใจดี',
                'employee_id' => '10000001',
                'phone_number' => '0812345678',
                'username' => 'somchai',
                'password' => password_hash('somchai123', PASSWORD_DEFAULT),
                'role_id' => 2
            ],
            [
                'first_name' => 'วิชัย',
                'last_name' => 'รักงาน',
                'employee_id' => '10000002',
                'phone_number' => '0823456789',
                'username' => 'wichai',
                'password' => password_hash('wichai123', PASSWORD_DEFAULT),
                'role_id' => 3
            ],
            [
                'first_name' => 'สมหญิง',
                'last_name' => 'มั่นคง',
                'employee_id' => '10000003',
                'phone_number' => '0834567890',
                'username' => 'somying',
                'password' => password_hash('somying123', PASSWORD_DEFAULT),
                'role_id' => 3
            ]
        ];

        $sql_users = "INSERT INTO users (first_name, last_name, employee_id, phone_number, username, password, user_type, role_id) 
                      VALUES (?, ?, ?, ?, ?, ?, 'officer', ?)";
        $stmt_users = $conn->prepare($sql_users);
        if ($stmt_users === false) {
            throw new Exception("Error preparing users statement: " . $conn->error);
        }

        foreach ($users as $user) {
            $stmt_users->bind_param(
                "ssssssi",
                $user['first_name'],
                $user['last_name'],
                $user['employee_id'],
                $user['phone_number'],
                $user['username'],
                $user['password'],
                $user['role_id']
            );
            if (!$stmt_users->execute()) {
                throw new Exception("Error adding officer '{$user['first_name']}': " . $stmt_users->error);
            }
        }
        $stmt_users->close();
    }

    // --- Commit Transaction ---
    $conn->commit();

    echo '<div style="font-family: sans-serif; padding: 20px; border: 1px solid #22c55e; background-color: #f0fdf4; color: #15803d; border-radius: 8px; max-width: 800px; margin: 40px auto;">';
    echo '<h1 style="font-size: 24px; margin-top: 0;">Setup Complete!</h1>';
    echo '<p>The database and all tables have been created and seeded successfully.</p>';
    echo '</div>';

} catch (Exception $e) {
    if ($conn && $conn->connect_errno) {
        // No transaction to rollback if connection failed
    } else if ($conn) {
        $conn->rollback(); // Rollback changes on error
    }
    http_response_code(500);
    die($e->getMessage());
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

?>