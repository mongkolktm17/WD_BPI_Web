<?php
/**
 * Docker-specific Database Configuration
 * This file is used inside Docker containers only.
 * It reads database credentials from environment variables.
 */

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// --- Docker Environment Database Credentials ---
define('DB_SERVER', getenv('DB_SERVER') ?: 'mysql');
define('DB_USERNAME', getenv('DB_USERNAME') ?: 'wdbpi_legacy');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'wdbpi_legacy_pass');
define('DB_NAME', getenv('DB_NAME') ?: 'wdbpi_legacy');
define('DB_PORT', 3306);

// --- Timezone Setting ---
date_default_timezone_set('Asia/Bangkok');

// --- Database Connection ---
$conn = mysqli_init();
if ($conn) {
    $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 3);
    try {
        if (!@$conn->real_connect(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT)) {
            error_log("Docker MySQL Connection Failed: " . $conn->connect_error);
            $conn = null;
        }
    } catch (Exception $e) {
        error_log("Docker MySQL Exception: " . $e->getMessage());
        $conn = null;
    }
}

// --- Connection Error Handling (Mock fallback) ---
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
            $this->num_rows = 0;
        }
        public function fetch_assoc() { return null; }
        public function bind_param(...$args) { return true; }
        public function execute() { return true; }
        public function get_result() { return $this; }
        public function close() { return true; }
    }
    $conn = new MockMysqli();
}

// --- Character Set ---
if (!$conn->set_charset("utf8mb4")) {
    // Handle character set error if needed.
}

// --- MySQL Timezone ---
$conn->query("SET time_zone = '+07:00'");
?>
