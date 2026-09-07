<?php
// Admin gate. This page destroys and rebuilds cctv_camera_names, so it must
// never be reachable unauthenticated.
require_once "check_permissions.php";

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Import Camera Names</title>";
echo "<style>body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5}";
echo ".success{color:green;padding:10px;background:#e8f5e9;margin:5px 0;border-radius:5px}";
echo ".error{color:red;padding:10px;background:#ffebee;margin:5px 0;border-radius:5px}";
echo ".info{color:blue;padding:10px;background:#e3f2fd;margin:5px 0;border-radius:5px}";
echo "h1{color:#333}</style></head><body>";
echo "<h1>🎥 Import Camera Names from CSV Files</h1>";

// Destructive from here on: require an explicit confirmation rather than
// truncating on page load.
if (($_GET['confirm'] ?? '') !== 'yes') {
    $count = 0;
    if ($res = $conn->query("SELECT COUNT(*) AS n FROM cctv_camera_names")) {
        $count = (int) $res->fetch_assoc()['n'];
    }
    echo "<div class='error'><strong>Warning:</strong> this will delete all "
       . $count . " existing camera name rows and re-import them from CSV.</div>";
    echo "<p><a class='info' href='?confirm=yes'>Yes, re-import camera names</a></p>";
    echo "</body></html>";
    exit;
}

// Clear existing camera names
$conn->query("TRUNCATE TABLE cctv_camera_names");
echo "<div class='info'>✓ Cleared existing camera names</div>";

$buildings = ['B2', 'B3', 'B4', 'B9'];
$total_imported = 0;
$errors = [];

foreach ($buildings as $building) {
    $csv_dir = __DIR__ . "/report_assets/CCTV/$building/";

    if (!is_dir($csv_dir)) {
        echo "<div class='error'>✗ Directory not found: $csv_dir</div>";
        continue;
    }

    $csv_files = glob($csv_dir . "*.csv");

    foreach ($csv_files as $csv_file) {
        $filename = basename($csv_file);
        echo "<div class='info'>📄 Processing: $filename</div>";

        // Extract NVR name from filename (e.g., B2_NVR1.csv -> NVR-1)
        if (preg_match('/([A-Z]\d+)_NVR(\d+)\.csv/', $filename, $matches)) {
            $file_building = $matches[1];
            $nvr_number = $matches[2];
            $nvr_name = "NVR-" . $nvr_number;

            $file_handle = fopen($csv_file, 'r');
            if (!$file_handle) {
                $errors[] = "Cannot open file: $filename";
                continue;
            }

            $row_count = 0;
            $imported_count = 0;

            while (($data = fgetcsv($file_handle)) !== FALSE) {
                $row_count++;

                // Skip header rows and empty rows
                if ($row_count <= 4 || empty($data[0]) || empty($data[1]) || empty($data[2])) {
                    continue;
                }

                $nvr_col = trim($data[0]);
                $channel_col = trim($data[1]);
                $name_col = trim($data[2]);

                // Validate data
                if (!is_numeric($channel_col) || empty($name_col)) {
                    continue;
                }

                $channel_number = intval($channel_col);
                $camera_name = $conn->real_escape_string($name_col);

                // Insert into database
                $sql = "INSERT INTO cctv_camera_names (building, nvr_name, channel_number, camera_name) 
                        VALUES ('$building', '$nvr_name', $channel_number, '$camera_name')";

                if ($conn->query($sql)) {
                    $imported_count++;
                    $total_imported++;
                } else {
                    $errors[] = "Error inserting $building $nvr_name CH$channel_number: " . $conn->error;
                }
            }

            fclose($file_handle);
            echo "<div class='success'>✓ Imported $imported_count camera names from $nvr_name</div>";
        } else {
            $errors[] = "Invalid filename format: $filename";
        }
    }
}

echo "<hr>";
echo "<h2>📊 Import Summary</h2>";
echo "<div class='success'><strong>Total cameras imported: $total_imported</strong></div>";

if (!empty($errors)) {
    echo "<h3 style='color:red'>⚠️ Errors:</h3>";
    foreach ($errors as $error) {
        echo "<div class='error'>$error</div>";
    }
}

// Show sample of imported data
echo "<hr><h2>📋 Sample of Imported Data (First 20 records)</h2>";
$result = $conn->query("SELECT * FROM cctv_camera_names ORDER BY building, nvr_name, channel_number LIMIT 20");

if ($result && $result->num_rows > 0) {
    echo "<table border='1' cellpadding='8' style='border-collapse:collapse;background:white'>";
    echo "<tr style='background:#2196F3;color:white'><th>Building</th><th>NVR</th><th>Channel</th><th>Camera Name</th></tr>";

    while ($row = $result->fetch_assoc()) {
        echo "<tr>";
        echo "<td>{$row['building']}</td>";
        echo "<td>{$row['nvr_name']}</td>";
        echo "<td>{$row['channel_number']}</td>";
        echo "<td>{$row['camera_name']}</td>";
        echo "</tr>";
    }

    echo "</table>";
}

// Show count by building
echo "<hr><h2>📈 Camera Count by Building</h2>";
$count_result = $conn->query("
    SELECT building, nvr_name, COUNT(*) as camera_count 
    FROM cctv_camera_names 
    GROUP BY building, nvr_name 
    ORDER BY building, nvr_name
");

if ($count_result && $count_result->num_rows > 0) {
    echo "<table border='1' cellpadding='8' style='border-collapse:collapse;background:white'>";
    echo "<tr style='background:#4CAF50;color:white'><th>Building</th><th>NVR</th><th>Camera Count</th></tr>";

    while ($row = $count_result->fetch_assoc()) {
        echo "<tr>";
        echo "<td>{$row['building']}</td>";
        echo "<td>{$row['nvr_name']}</td>";
        echo "<td style='text-align:center'>{$row['camera_count']}</td>";
        echo "</tr>";
    }

    echo "</table>";
}

$conn->close();

echo "<hr>";
echo "<div class='success'><strong>✅ Import completed!</strong></div>";
echo "<p><a href='cctv_report.php' style='display:inline-block;padding:10px 20px;background:#2196F3;color:white;text-decoration:none;border-radius:5px'>Go to CCTV Report</a></p>";
echo "</body></html>";
?>