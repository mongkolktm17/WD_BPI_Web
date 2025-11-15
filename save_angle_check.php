<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

require_once 'config.php';

// --- Session and Authentication ---
// Check if the user is logged in, otherwise return an error
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

// Get the input data
$input = json_decode(file_get_contents('php://input'), true);

// The input can be a single object or an array of objects.
// To handle both cases, we wrap a single object in an array.
$records = isset($input[0]) ? $input : [$input];

if (empty($records)) {
    echo json_encode(['success' => false, 'message' => 'No data received.']);
    exit;
}

$conn->begin_transaction();

try {
    $sql = "INSERT INTO cctv_angle_checks (building, nvr_number, camera_number, angle_correct, notes, checked_by, checked_date, unique_id) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?) 
            ON DUPLICATE KEY UPDATE 
            angle_correct = VALUES(angle_correct), 
            notes = VALUES(notes), 
            checked_by = VALUES(checked_by), 
            checked_date = NOW()";

    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    foreach ($records as $record) {
        if (!isset($record['building'], $record['nvr_number'], $record['camera_number'], $record['angle_correct'], $record['checked_by'])) {
            throw new Exception('Missing required fields in a record.');
        }

        $building = $record['building'];
        $nvr = $record['nvr_number'];
        $camera = $record['camera_number'];
        $angle_correct = $record['angle_correct'];
        $notes = $record['notes'] ?? '';
        $checked_by = $record['checked_by'];
        
        // Create a unique ID based on building, NVR, camera, and the current date
        $date_str = date('Y-m-d');
        $unique_id = "{$building}-{$nvr}-{$camera}-{$date_str}";

        $stmt->bind_param('siissss', $building, $nvr, $camera, $angle_correct, $notes, $checked_by, $unique_id);

        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }

    $stmt->close();
    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Data saved successfully.']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>