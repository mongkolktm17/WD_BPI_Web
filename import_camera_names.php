<?php
/**
 * import_camera_names.php
 * 
 * Import all camera names from CSV files into cctv_camera_names table
 * Reads 19 CSV files and imports 847 camera names
 */

require_once 'config.php';

// CSV file structure
$buildings = [
    'B2' => 10,  // 10 NVRs
    'B3' => 2,   // 2 NVRs
    'B4' => 6,   // 6 NVRs
    'B9' => 1    // 1 NVR
];

$importCount = 0;
$errorCount = 0;

echo "Starting camera names import...\n\n";

// Clear existing data
$conn->query("TRUNCATE TABLE cctv_camera_names");
echo "✓ Cleared existing camera names\n\n";

foreach ($buildings as $building => $nvrCount) {
    echo "Processing Building $building ($nvrCount NVRs):\n";

    for ($nvrNum = 1; $nvrNum <= $nvrCount; $nvrNum++) {
        $csvFile = "report_assets/CCTV/$building/{$building}_NVR{$nvrNum}.csv";

        if (!file_exists($csvFile)) {
            echo "  ✗ File not found: $csvFile\n";
            $errorCount++;
            continue;
        }

        // Read CSV file
        $handle = fopen($csvFile, 'r');
        if ($handle === false) {
            echo "  ✗ Cannot open: $csvFile\n";
            $errorCount++;
            continue;
        }

        // Skip first 3 header rows
        for ($i = 0; $i < 3; $i++) {
            fgets($handle);
        }

        $nvrImportCount = 0;

        // Read data rows
        while (($line = fgets($handle)) !== false) {
            // Parse CSV line
            $data = str_getcsv($line);

            // Skip if first two columns are empty
            if (empty($data[0]) || empty($data[1])) {
                continue;
            }

            $nvr = trim($data[0]);
            $channel = (int) trim($data[1]);

            // Get name from column 3, use default if empty
            $name = isset($data[2]) && trim($data[2]) != '' ? trim($data[2]) : "CH" . $channel;

            // Skip if channel is invalid
            if ($nvr == '' || $channel == 0) {
                continue;
            }

            // Insert into database
            $stmt = $conn->prepare("INSERT INTO cctv_camera_names (building, nvr_name, channel_number, camera_name) VALUES (?, ?, ?, ?)");
            $nvrName = "NVR" . $nvrNum;
            $stmt->bind_param("ssis", $building, $nvrName, $channel, $name);

            if ($stmt->execute()) {
                $nvrImportCount++;
                $importCount++;
            } else {
                echo "  ✗ Error inserting: $building $nvrName CH$channel - " . $stmt->error . "\n";
                $errorCount++;
            }

            $stmt->close();
        }

        fclose($handle);
        echo "  ✓ NVR$nvrNum: $nvrImportCount cameras\n";
    }

    echo "\n";
}

echo "==========================================\n";
echo "Import Complete!\n";
echo "Total Imported: $importCount cameras\n";
echo "Errors: $errorCount\n";
echo "==========================================\n\n";

// Verify totals
$result = $conn->query("SELECT building, COUNT(*) as count FROM cctv_camera_names GROUP BY building ORDER BY building");
echo "Verification - Camera names by building:\n";
while ($row = $result->fetch_assoc()) {
    echo "  {$row['building']}: {$row['count']} cameras\n";
}

$total = $conn->query("SELECT COUNT(*) as total FROM cctv_camera_names")->fetch_assoc()['total'];
echo "\nTotal in database: $total cameras\n";

$conn->close();
?>