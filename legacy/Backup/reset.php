<?php
/**
 * reset.php
 *
 * DANGEROUS SCRIPT!
 * This script drops all application tables from the database.
 * It is intended for development and testing purposes only.
 *
 * To prevent accidental execution, this script requires a confirmation step.
 * To run the reset, you must access it with `?confirm=true`.
 */

header('Content-Type: text/html; charset=utf-8');

// --- Database Configuration ---
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "wd_reports";

// --- Confirmation Check ---
if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'true') {
    echo "<h1>Confirm Database Reset</h1>";
    echo "<p style='color:red; font-weight:bold;'>WARNING: This is a destructive action that will permanently delete all data from the application tables.</p>";
    echo "<p>This script will drop the following tables:</p>";
    echo "<ul><li>roles</li><li>users</li><li>role_permissions</li><li>reports</li><li>car_parking_reports</li><li>cctv_inspections</li><li>hand_held_checks</li></ul>";
    echo "<p>This action cannot be undone.</p>";
    echo "<p>To proceed with the reset, click the link below:</p>";
    echo "<a href='reset.php?confirm=true' style='font-size:1.2em; color:red;'>Yes, I am sure. Reset the database.</a>";
    exit;
}

// --- Execution ---
$conn = null;
try {
    echo "<h1>Initiating Database Reset...</h1>";
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        throw new Exception("Database Connection Failed: " . $conn->connect_error);
    }
    $conn->set_charset("utf8mb4");

    $tables = [
        'hand_held_checks',
        'cctv_inspections',
        'car_parking_reports',
        'reports',
        'role_permissions',
        'users',
        'roles'
    ];

    // Start transaction
    $conn->begin_transaction();

    echo "Disabling foreign key checks...<br>";
    $conn->query("SET FOREIGN_KEY_CHECKS=0");

    foreach ($tables as $table) {
        $sql = "DROP TABLE IF EXISTS `$table`";
        if ($conn->query($sql) === TRUE) {
            echo "Table `$table` dropped successfully.<br>";
        } else {
            throw new Exception("Error dropping table `$table`: " . $conn->error);
        }
    }

    echo "Enabling foreign key checks...<br>";
    $conn->query("SET FOREIGN_KEY_CHECKS=1");

    // Commit transaction
    $conn->commit();

    echo "<h2 style='color:green;'>Database reset complete.</h2>";
    echo "<p>All application tables have been removed. You should now run <a href='setup.php'>setup.php</a> to rebuild the database schema and seed initial data.</p>";

} catch (Exception $e) {
    if ($conn) {
        $conn->rollback();
    }
    http_response_code(500);
    echo "<h2 style='color:red;'>An Error Occurred</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

?>