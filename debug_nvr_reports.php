<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$limit = 50;

// Choose a time column that exists: prefer `created_at`, fall back to `report_time`.
$time_col = 'created_at';
$check = $conn->query("SHOW COLUMNS FROM cctv_reports LIKE 'created_at'");
if (!$check || $check->num_rows === 0) {
    $time_col = 'report_time';
}

$sql = "SELECT id, building, total_channels, online_channels, offline_channels, online_percentage, submitted_by_id, $time_col AS timecol FROM cctv_reports ORDER BY $time_col DESC LIMIT ?";

$stmt = $conn->prepare($sql);
if ($stmt) {
    $stmt->bind_param('i', $limit);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        // expose the time under a consistent key
        if (isset($row['timecol'])) $row['timecol'] = $row['timecol'];
        $rows[] = $row;
    }
    $stmt->close();
    echo json_encode(['count' => count($rows), 'rows' => $rows], JSON_UNESCAPED_UNICODE);
} else {
    // Fallback: try a simple query if prepare fails (older PHP/MySQL setups)
    $result = $conn->query("SELECT id, building, total_channels, online_channels, offline_channels, online_percentage, submitted_by_id, $time_col AS timecol FROM cctv_reports ORDER BY $time_col DESC LIMIT $limit");
    $rows = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode(['count' => count($rows), 'rows' => $rows], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Query failed', 'sql_error' => $conn->error], JSON_UNESCAPED_UNICODE);
    }
}

$conn->close();
?>