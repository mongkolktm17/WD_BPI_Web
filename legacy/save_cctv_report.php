<?php
require_once 'config.php';

header('Content-Type: application/json');

// Authentication gate. This endpoint writes to cctv_angle_reports and was
// previously reachable unauthenticated, so anyone could inject CCTV reports.
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

// Get the posted data
$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'No data received.']);
    exit;
}

// Sanitize and prepare data
$building = $conn->real_escape_string($data->building);
$nvr = (int)$data->nvr;
$total_cameras = (int)$data->total_cameras;
$correct_cameras = (int)$data->correct_cameras;
$incorrect_cameras = (int)$data->incorrect_cameras;
$checked_by = $conn->real_escape_string($data->checked_by);
$report_date = date("Y-m-d H:i:s");

// SQL to insert data
$sql = "INSERT INTO cctv_angle_reports (report_date, building, nvr, total_cameras, correct_cameras, incorrect_cameras, checked_by) VALUES (?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    echo json_encode(['success' => false, 'message' => 'Failed to prepare statement: ' . $conn->error]);
    exit;
}

$stmt->bind_param("ssiiiss", $report_date, $building, $nvr, $total_cameras, $correct_cameras, $incorrect_cameras, $checked_by);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Report saved successfully.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to execute statement: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
