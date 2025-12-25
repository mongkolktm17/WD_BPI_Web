<?php
/**
 * import_camera_names.php
 * 
 * Import camera names from CSV files into the cctv_camera_names table
 * This script reads all CSV files from report_assets/CCTV/ directory
 */

require_once 'config.php';

try {
    // Start transaction
    $conn->begin_transaction();

    // Clear existing camera names
    $conn->query("TRUNCATE TABLE `cctv_camera_names`");
    echo "<h2>Importing Camera Names from CSV Files</h2>";

    // Define CSV file paths for each building/NVR
    $csv_files = [
        ['B2', 'NVR-1', __DIR__ . '/report_assets/CCTV/B2/B2_NVR1.csv'],
        ['B2', 'NVR-2', __DIR__ . '/report_assets/CCTV/B2/B2_NVR2.csv'],
        ['B2', 'NVR-3', __DIR__ . '/report_assets/CCTV/B2/B2_NVR3.csv'],
        ['B2', 'NVR-4', __DIR__ . '/report_assets/CCTV/B2/B2_NVR4.csv'],
        ['B2', 'NVR-5', __DIR__ . '/report_assets/CCTV/B2/B2_NVR5.csv'],
        ['B2', 'NVR-6', __DIR__ . '/report_assets/CCTV/B2/B2_NVR6.csv'],
        ['B2', 'NVR-7', __DIR__ . '/report_assets/CCTV/B2/B2_NVR7.csv'],
        ['B2', 'NVR-8', __DIR__ . '/report_assets/CCTV/B2/B2_NVR8.csv'],
        ['B2', 'NVR-9', __DIR__ . '/report_assets/CCTV/B2/B2_NVR9.csv'],
        ['B2', 'NVR-10', __DIR__ . '/report_assets/CCTV/B2/B2_NVR10.csv'],
        ['B3', 'NVR-1', __DIR__ . '/report_assets/CCTV/B3/B3_NVR1.csv'],
        ['B3', 'NVR-2', __DIR__ . '/report_assets/CCTV/B3/B3_NVR2.csv'],
        ['B4', 'NVR-1', __DIR__ . '/report_assets/CCTV/B4/B4_NVR1.csv'],
        ['B4', 'NVR-2', __DIR__ . '/report_assets/CCTV/B4/B4_NVR2.csv'],
        ['B4', 'NVR-3', __DIR__ . '/report_assets/CCTV/B4/B4_NVR3.csv'],
        ['B4', 'NVR-4', __DIR__ . '/report_assets/CCTV/B4/B4_NVR4.csv'],
        ['B4', 'NVR-5', __DIR__ . '/report_assets/CCTV/B4/B4_NVR5.csv'],
        ['B4', 'NVR-6', __DIR__ . '/report_assets/CCTV/B4/B4_NVR6.csv'],
        ['B9', 'NVR-1', __DIR__ . '/report_assets/CCTV/B9/B9_NVR1.csv'],
    ];

    $sql_camera_names = "INSERT INTO cctv_camera_names (building, nvr_name, channel_number, camera_name) VALUES (?, ?, ?, ?)";
    $stmt_camera = $conn->prepare($sql_camera_names);
    if ($stmt_camera === false) {
        throw new Exception("Error preparing camera names statement: " . $conn->error);
    }

    $total_cameras_imported = 0;
    $files_processed = 0;

    echo "<ul style='font-family: monospace;'>";

    foreach ($csv_files as list($building, $nvr_name, $csv_path)) {
        if (!file_exists($csv_path)) {
            echo "<li style='color: orange;'>⚠ Warning: CSV file not found: {$csv_path}</li>";
            continue;
        }

        $file = fopen($csv_path, 'r');
        if ($file === false) {
            echo "<li style='color: orange;'>⚠ Warning: Cannot open CSV file: {$csv_path}</li>";
            continue;
        }

        // Skip header rows (first 4 lines)
        for ($i = 0; $i < 4; $i++) {
            fgetcsv($file);
        }

        $cameras_in_file = 0;

        // Read camera data
        while (($row = fgetcsv($file)) !== false) {
            // Skip empty rows
            if (empty($row[0]) && empty($row[1]) && empty($row[2])) {
                continue;
            }

            // Extract data: row[0]=NVR, row[1]=CH, row[2]=Name
            $channel_number = isset($row[1]) ? intval($row[1]) : 0;
            $camera_name = isset($row[2]) ? trim($row[2]) : '';

            // Skip if no valid data
            if ($channel_number <= 0 || empty($camera_name)) {
                continue;
            }

            // Insert into database
            $stmt_camera->bind_param("ssis", $building, $nvr_name, $channel_number, $camera_name);
            if ($stmt_camera->execute()) {
                $total_cameras_imported++;
                $cameras_in_file++;
            } else {
                // Skip duplicates silently
                if ($conn->errno != 1062) { // 1062 = Duplicate entry error
                    echo "<li style='color: red;'>❌ Error adding camera '{$camera_name}' (CH{$channel_number}): " . htmlspecialchars($stmt_camera->error) . "</li>";
                }
            }
        }

        fclose($file);
        $files_processed++;

        echo "<li style='color: green;'>✓ {$building} {$nvr_name}: {$cameras_in_file} cameras imported</li>";
    }

    echo "</ul>";

    $stmt_camera->close();

    // Commit transaction
    $conn->commit();

    echo "<div style='background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; margin: 20px 0; border-radius: 5px;'>";
    echo "<h3 style='margin-top: 0;'>✅ Import Completed Successfully!</h3>";
    echo "<p><strong>Files processed:</strong> {$files_processed}/19</p>";
    echo "<p><strong>Total cameras imported:</strong> {$total_cameras_imported}</p>";
    echo "</div>";

    echo "<p><a href='cctv_report.php' style='display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Go to CCTV Report</a></p>";

} catch (Exception $e) {
    if ($conn) {
        $conn->rollback();
    }
    echo "<div style='background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; margin: 20px 0; border-radius: 5px;'>";
    echo "<h3 style='margin-top: 0;'>❌ Error</h3>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}
?>