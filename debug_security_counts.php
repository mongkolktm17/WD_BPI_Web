<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$sql = "SELECT id, record_date, morning_shift, evening_shift, total, submitted_by_id, created_at FROM security_guard_counts ORDER BY created_at DESC LIMIT 50";
$result = $conn->query($sql);
$rows = [];
if ($result) {
    while ($r = $result->fetch_assoc()) {
        $rows[] = $r;
    }
}
$conn->close();

echo json_encode(['count' => count($rows), 'rows' => $rows], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>