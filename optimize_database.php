<?php
/**
 * Database Performance Optimization Script
 * 
 * This script creates indexes and optimizes database tables
 * for better query performance.
 * 
 * Run this script ONCE to apply optimizations.
 * Backup your database before running!
 */

require_once 'config.php';

echo "<h1>Database Performance Optimization</h1>\n";
echo "<pre>\n";

// Track results
$success_count = 0;
$error_count = 0;
$results = [];

/**
 * Execute SQL and track results
 */
function execute_sql($conn, $sql, $description)
{
    global $success_count, $error_count, $results;

    echo "\n" . str_repeat("=", 80) . "\n";
    echo "Executing: $description\n";
    echo str_repeat("-", 80) . "\n";
    echo "SQL: $sql\n";

    try {
        $result = $conn->query($sql);

        // OPTIMIZE TABLE and ANALYZE TABLE return result sets, not TRUE
        if ($result === TRUE || is_object($result)) {
            echo "✅ SUCCESS\n";
            $success_count++;
            $results[] = ['status' => 'success', 'description' => $description];

            // Free result if it's a result set
            if (is_object($result)) {
                $result->free();
            }
            return true;
        } else {
            $error = $conn->error;
            // Ignore "Duplicate key" errors for indexes that already exist
            if (strpos($error, 'Duplicate key name') !== false) {
                echo "ℹ️  SKIPPED (already exists)\n";
                $results[] = ['status' => 'skipped', 'description' => $description];
                return true;
            } else {
                echo "❌ ERROR: " . $error . "\n";
                $error_count++;
                $results[] = ['status' => 'error', 'description' => $description, 'error' => $error];
                return false;
            }
        }
    } catch (mysqli_sql_exception $e) {
        $error = $e->getMessage();
        // Ignore "Duplicate key" errors for indexes that already exist
        if (strpos($error, 'Duplicate key name') !== false) {
            echo "ℹ️  SKIPPED (already exists)\n";
            $results[] = ['status' => 'skipped', 'description' => $description];
            return true;
        } else {
            echo "❌ ERROR: " . $error . "\n";
            $error_count++;
            $results[] = ['status' => 'error', 'description' => $description, 'error' => $error];
            return false;
        }
    }
}

echo "Starting database optimization...\n";
echo "Database: " . $conn->get_server_info() . "\n";

// ============================================================================
// SECTION 1: CREATE INDEXES FOR USERS TABLE
// ============================================================================

echo "\n\n";
echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
echo "║                        SECTION 1: USERS TABLE INDEXES                        ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════════╝\n";

execute_sql(
    $conn,
    "CREATE INDEX idx_users_username ON users(username)",
    "Index on users.username for faster login queries"
);

execute_sql(
    $conn,
    "CREATE INDEX idx_users_employee_id ON users(employee_id)",
    "Index on users.employee_id for faster employee lookups"
);

execute_sql(
    $conn,
    "CREATE INDEX idx_users_role_id ON users(role_id)",
    "Index on users.role_id for faster role-based queries"
);

execute_sql(
    $conn,
    "CREATE INDEX idx_users_user_type ON users(user_type)",
    "Index on users.user_type for faster user type filtering"
);

// ============================================================================
// SECTION 2: CREATE INDEXES FOR CCTV REPORTS
// ============================================================================

echo "\n\n";
echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
echo "║                     SECTION 2: CCTV REPORTS INDEXES                          ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════════╝\n";

execute_sql(
    $conn,
    "CREATE INDEX idx_cctv_reports_building ON cctv_reports(building)",
    "Index on cctv_reports.building for faster building filtering"
);

execute_sql(
    $conn,
    "CREATE INDEX idx_cctv_reports_report_time ON cctv_reports(report_time)",
    "Index on cctv_reports.report_time for faster date filtering"
);

execute_sql(
    $conn,
    "CREATE INDEX idx_cctv_reports_submitted_by ON cctv_reports(submitted_by_id)",
    "Index on cctv_reports.submitted_by_id for faster user lookups"
);

execute_sql(
    $conn,
    "CREATE INDEX idx_cctv_reports_building_time ON cctv_reports(building, report_time)",
    "Composite index for building + time queries"
);

// ============================================================================
// SECTION 3: CREATE INDEXES FOR OTHER REPORT TABLES
// ============================================================================

echo "\n\n";
echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
echo "║                    SECTION 3: OTHER REPORTS INDEXES                          ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════════╝\n";

// Helper function to check if column exists
function column_exists($conn, $table, $column)
{
    $sql = "SHOW COLUMNS FROM `$table` LIKE '$column'";
    $result = $conn->query($sql);
    return $result && $result->num_rows > 0;
}

// Car Parking Reports - check columns first
if (column_exists($conn, 'car_parking_reports', 'report_time')) {
    execute_sql(
        $conn,
        "CREATE INDEX idx_car_parking_report_time ON car_parking_reports(report_time)",
        "Index on car_parking_reports.report_time"
    );
} else {
    echo "\nℹ️  SKIPPED: car_parking_reports.report_time column not found\n";
}

if (column_exists($conn, 'car_parking_reports', 'submitted_by_id')) {
    execute_sql(
        $conn,
        "CREATE INDEX idx_car_parking_submitted_by ON car_parking_reports(submitted_by_id)",
        "Index on car_parking_reports.submitted_by_id"
    );
} else {
    echo "\nℹ️  SKIPPED: car_parking_reports.submitted_by_id column not found\n";
}

// CCTV Inspections
if (column_exists($conn, 'cctv_inspections', 'inspection_time')) {
    execute_sql(
        $conn,
        "CREATE INDEX idx_cctv_inspection_time ON cctv_inspections(inspection_time)",
        "Index on cctv_inspections.inspection_time"
    );
}

if (column_exists($conn, 'cctv_inspections', 'cctv_room')) {
    execute_sql(
        $conn,
        "CREATE INDEX idx_cctv_inspection_room ON cctv_inspections(cctv_room)",
        "Index on cctv_inspections.cctv_room"
    );
}

// Hand Held Checks
if (column_exists($conn, 'hand_held_checks', 'check_time')) {
    execute_sql(
        $conn,
        "CREATE INDEX idx_hand_held_check_time ON hand_held_checks(check_time)",
        "Index on hand_held_checks.check_time"
    );
}

// Patrol Reports
if (column_exists($conn, 'patrol_reports', 'submission_time')) {
    execute_sql(
        $conn,
        "CREATE INDEX idx_patrol_submission_time ON patrol_reports(submission_time)",
        "Index on patrol_reports.submission_time"
    );
}

// Security Guard Counts
if (column_exists($conn, 'security_guard_counts', 'record_date')) {
    execute_sql(
        $conn,
        "CREATE INDEX idx_guard_count_date ON security_guard_counts(record_date)",
        "Index on security_guard_counts.record_date"
    );
}

if (column_exists($conn, 'security_guard_counts', 'created_at')) {
    execute_sql(
        $conn,
        "CREATE INDEX idx_guard_count_created ON security_guard_counts(created_at)",
        "Index on security_guard_counts.created_at"
    );
}

// ============================================================================
// SECTION 4: OPTIMIZE TABLES
// ============================================================================

echo "\n\n";
echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
echo "║                        SECTION 4: OPTIMIZE TABLES                            ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════════╝\n";

$tables_to_optimize = [
    'users',
    'roles',
    'cctv_reports',
    'car_parking_reports',
    'cctv_inspections',
    'hand_held_checks',
    'patrol_reports',
    'security_guard_counts',
    'cctv_devices',
    'nvr_recording_reports'
];

foreach ($tables_to_optimize as $table) {
    execute_sql(
        $conn,
        "OPTIMIZE TABLE $table",
        "Optimize table: $table"
    );
}

// ============================================================================
// SECTION 5: ANALYZE TABLES
// ============================================================================

echo "\n\n";
echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
echo "║                         SECTION 5: ANALYZE TABLES                            ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════════╝\n";

foreach ($tables_to_optimize as $table) {
    execute_sql(
        $conn,
        "ANALYZE TABLE $table",
        "Analyze table: $table"
    );
}

// ============================================================================
// SUMMARY
// ============================================================================

echo "\n\n";
echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
echo "║                              OPTIMIZATION SUMMARY                            ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════════╝\n";

echo "\n";
echo "Total operations: " . count($results) . "\n";
echo "✅ Successful: $success_count\n";
echo "❌ Errors: $error_count\n";
echo "ℹ️  Skipped: " . (count($results) - $success_count - $error_count) . "\n";

if ($error_count > 0) {
    echo "\n⚠️  ERRORS OCCURRED:\n";
    echo str_repeat("-", 80) . "\n";
    foreach ($results as $result) {
        if ($result['status'] === 'error') {
            echo "❌ " . $result['description'] . "\n";
            echo "   Error: " . $result['error'] . "\n\n";
        }
    }
}

echo "\n";
echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
echo "║                            OPTIMIZATION COMPLETE                             ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════════╝\n";

echo "\n";
echo "Next steps:\n";
echo "1. Test your application to ensure everything works correctly\n";
echo "2. Monitor query performance using EXPLAIN queries\n";
echo "3. Check MySQL slow query log for any remaining slow queries\n";
echo "4. Consider adding more indexes based on your specific query patterns\n";

echo "\n</pre>\n";

$conn->close();
?>