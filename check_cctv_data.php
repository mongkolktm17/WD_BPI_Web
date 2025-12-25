<?php
require_once 'config.php';

echo "<h2>CCTV Reports Debug</h2>";
echo "<style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #4CAF50; color: white; }</style>";

// 1. Check total reports
$total = $conn->query("SELECT COUNT(*) as count FROM cctv_reports")->fetch_assoc();
echo "<h3>Total Reports: <span style='color: " . ($total['count'] > 0 ? "green" : "red") . ";'>{$total['count']}</span></h3>";

// 2. Reports by building
echo "<h3>Reports by Building:</h3>";
$result = $conn->query("SELECT building, COUNT(*) as count FROM cctv_reports GROUP BY building");
echo "<table><tr><th>Building</th><th>Count</th></tr>";
while ($row = $result->fetch_assoc()) {
    echo "<tr><td>{$row['building']}</td><td>{$row['count']}</td></tr>";
}
echo "</table>";

// 3. Latest 5 reports
echo "<h3>Latest 5 Reports:</h3>";
$result = $conn->query("SELECT cr.*, u.username FROM cctv_reports cr LEFT JOIN users u ON cr.submitted_by_id = u.id ORDER BY cr.report_time DESC LIMIT 5");
echo "<table><tr><th>ID</th><th>Building</th><th>Online/Total</th><th>%</th><th>Time</th><th>User</th></tr>";
while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>{$row['id']}</td>";
    echo "<td><strong>{$row['building']}</strong></td>";
    echo "<td>{$row['online_channels']}/{$row['total_channels']}</td>";
    echo "<td>" . round($row['online_percentage'], 1) . "%</td>";
    echo "<td>{$row['report_time']}</td>";
    echo "<td>{$row['username']}</td>";
    echo "</tr>";
}
echo "</table>";

// 4. Check if query matches what cctv_report.php uses
echo "<h3>History Query Test (Same as cctv_report.php):</h3>";
$result = $conn->query("SELECT cr.*, u.username FROM cctv_reports cr LEFT JOIN users u ON cr.submitted_by_id = u.id ORDER BY cr.report_time DESC LIMIT 10");
echo "<p>Found: <strong>" . $result->num_rows . " rows</strong></p>";

// 5. Check cctv_devices Building Names
echo "<h3>CCTV Devices Building Names:</h3>";
$result = $conn->query("SELECT DISTINCT building FROM cctv_devices");
echo "<ul>";
while ($row = $result->fetch_assoc()) {
    echo "<li>'{$row['building']}'</li>";
}
echo "</ul>";

$conn->close();
?>