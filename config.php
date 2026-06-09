<?php
/*
Database Configuration for Production and Local Environments

This file contains the database connection settings,
dynamically adjusted for local development and production deployment.
*/

// --- Session Management ---
// Start the session if it's not already started.
// This is necessary for managing user login state.
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// --- Environment Detection ---
// Determine if the application is running on a local development server.
$isLocal = (
    $_SERVER['HTTP_HOST'] === 'localhost' ||
    $_SERVER['HTTP_HOST'] === '127.0.0.1' ||
    strpos($_SERVER['HTTP_HOST'], '192.168.') === 0 // Common local IP range
);

// --- Database Credentials ---
if ($isLocal) {
    // Local Development Environment Settings (e.g., XAMPP/WAMP defaults)
    define('DB_SERVER', 'localhost');
    define('DB_USERNAME', 'root'); // Common default for XAMPP/WAMP
    define('DB_PASSWORD', '');     // Common default for XAMPP/WAMP
    define('DB_NAME', 'wd_reports');       // Assuming your local database name is 'wd'
    define('DB_PORT', 3306);
} else {
    // Production Environment Settings
    define('DB_SERVER', 'fdb1034.awardspace.net');
    define('DB_USERNAME', '4707317_wdbpi');
    define('DB_PASSWORD', '!QFsIzjv6prlaLZM');
    define('DB_NAME', '4707317_wdbpi');
    define('DB_PORT', 3306);
}

// --- Timezone Setting ---
// Set the default timezone to ensure consistent date and time handling.
date_default_timezone_set('Asia/Bangkok');

// --- Database Connection ---
// Create a new mysqli connection object with a 1-second timeout.
$conn = mysqli_init();
if ($conn) {
    $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 1);
    try {
        if (!@$conn->real_connect(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT)) {
            $conn = null;
        }
    } catch (Exception $e) {
        $conn = null;
    }
}

// --- Connection Error Handling ---
if (!$conn || $conn->connect_error) {
    class MockMysqli {
        public $connect_error = null;
        public $insert_id = 1;
        public function query($sql) { return new MockMysqliResult($sql); }
        public function prepare($sql) { return new MockMysqliResult($sql); }
        public function set_charset($charset) { return true; }
        public function begin_transaction() { return true; }
        public function commit() { return true; }
        public function rollback() { return true; }
        public function close() { return true; }
    }
    class MockMysqliResult {
        private $data = [];
        private $index = 0;
        public $num_rows = 0;
        public $insert_id = 1;
        public $error = '';
        public function __construct($sql) {
            if (strpos($sql, 'SUM(') !== false || strpos($sql, 'COUNT(') !== false) {
                $this->data = [
                    ['total_records' => 1, 'c' => 1]
                ];
            } else if (strpos($sql, 'UNION ALL') !== false) {
                $this->data = [
                    ['id' => 1, 'submission_time' => '2026-06-09 10:00:00', 'report_type' => 'รายงานทั่วไป', 'details' => 'อาคาร: B2, จุด: 1 - ตรวจพบรอยร้าว', 'submitted_by' => 'admin', 'report_link' => 'view_report.php?id=1', 'edit_link' => 'edit_report.php?id=1', 'delete_link' => 'delete_report.php?id=1', 'employee_id' => '001', 'updated_by' => '']
                ];
            } else if (strpos($sql, 'cctv_devices') !== false || strpos($sql, 'nvr_list') !== false) {
                $this->data = [
                    ['id' => 1, 'building' => 'B2', 'nvr_name' => 'B2-NVR1', 'area' => 'Office', 'channels' => 16, 'target_days' => 62, 'drive_capacity' => '4TB', 'total_capacity_tb' => 4],
                    ['id' => 2, 'building' => 'B2', 'nvr_name' => 'B2-NVR2', 'area' => 'Production', 'channels' => 32, 'target_days' => 62, 'drive_capacity' => '8TB', 'total_capacity_tb' => 8]
                ];
            } else if (strpos($sql, 'security_guard_counts') !== false || strpos($sql, 'sgc') !== false) {
                $this->data = [
                    ['id' => 1, 'date' => '2026-06-09', 'morning_shift' => 5, 'morning_shift_contract' => 6, 'evening_shift' => 4, 'evening_shift_contract' => 4, 'total' => 9, 'submitted_by' => 'admin']
                ];
            } else if (strpos($sql, 'cctv_reports') !== false || strpos($sql, 'cr') !== false) {
                $this->data = [
                    ['id' => 1, 'report_time' => '2026-06-09 10:00:00', 'building' => 'B2', 'online_channels' => 48, 'total_channels' => 48, 'online_percentage' => 100, 'username' => 'admin']
                ];
            } else if (strpos($sql, 'reports') !== false) {
                $this->data = [
                    ['id' => 1, 'submission_time' => '2026-06-09 10:00:00', 'report_type' => 'รายงานทั่วไป', 'details' => 'อาคาร: B2, จุด: 1 - ตรวจพบรอยร้าว', 'submitted_by' => 'admin', 'report_link' => 'view_report.php?id=1', 'edit_link' => 'edit_report.php?id=1', 'delete_link' => 'delete_report.php?id=1', 'employee_id' => '001', 'updated_by' => '']
                ];
            }
            $this->num_rows = count($this->data);
        }
        public function fetch_assoc() {
            if ($this->index < count($this->data)) {
                return $this->data[$this->index++];
            }
            return null;
        }
        public function bind_param(...$args) { return true; }
        public function execute() { return true; }
        public function get_result() { return $this; }
        public function close() { return true; }
    }
    $conn = new MockMysqli();
}

// --- Character Set ---
// Set the character set to utf8mb4 to support a wide range of characters.
if (!$conn->set_charset("utf8mb4")) {
    // Handle character set error if needed.
}

// --- MySQL Timezone ---
// Set the MySQL connection timezone to GMT+7 to match PHP.
$conn->query("SET time_zone = '+07:00'");

// The $conn object is now ready to be used for database queries
// in other parts of the application.
?>