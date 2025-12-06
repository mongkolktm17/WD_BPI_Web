<?php
// check_cctv_data.php - เช็คข้อมูล CCTV ใน database
require_once 'config.php';

echo "<h1>ข้อมูล CCTV ในระบบ</h1>";
echo "<style>
table { border-collapse: collapse; width: 100%; margin: 20px 0; }
th, td { border: 1px solid #000; padding: 8px; text-align: left; }
th { background-color: #4CAF50; color: white; }
tr:nth-child(even) { background-color: #f2f2f2; }
.summary { background-color: #e7f3fe; padding: 15px; margin: 20px 0; border-left: 6px solid #2196F3; }
</style>";

// Query ข้อมูล
$result = $conn->query("SELECT building, nvr_name, channels FROM cctv_devices ORDER BY building, nvr_name");

echo "<table>";
echo "<tr><th>อาคาร</th><th>NVR</th><th>จำนวนกล้อง</th></tr>";

$building_summary = [];
$total_nvrs = 0;
$total_cameras = 0;

while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>{$row['building']}</td>";
    echo "<td>{$row['nvr_name']}</td>";
    echo "<td>{$row['channels']}</td>";
    echo "</tr>";

    if (!isset($building_summary[$row['building']])) {
        $building_summary[$row['building']] = ['nvrs' => 0, 'cameras' => 0];
    }
    $building_summary[$row['building']]['nvrs']++;
    $building_summary[$row['building']]['cameras'] += $row['channels'];
    $total_nvrs++;
    $total_cameras += $row['channels'];
}

echo "</table>";

// แสดงสรุป
echo "<div class='summary'>";
echo "<h2>สรุปแต่ละอาคาร</h2>";
ksort($building_summary);
foreach ($building_summary as $building => $data) {
    echo "<p><strong>{$building}</strong>: {$data['nvrs']} NVRs, {$data['cameras']} กล้อง</p>";
}
echo "</div>";

echo "<div class='summary'>";
echo "<h2>สรุปรวม</h2>";
echo "<p><strong>Total</strong>: {$total_nvrs} NVRs, {$total_cameras} กล้อง</p>";
echo "</div>";

$conn->close();
?>