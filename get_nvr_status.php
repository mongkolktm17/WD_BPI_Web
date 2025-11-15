<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$response = ['buildings' => [], 'last_update' => null];

// Choose time column: prefer `created_at`, else fall back to `report_time`.
$time_col = 'created_at';
$check = $conn->query("SHOW COLUMNS FROM cctv_reports LIKE 'created_at'");
if (!$check || $check->num_rows === 0) {
    $time_col = 'report_time';
}

// Get latest report per building using chosen time column
$sql = "SELECT t.building, t.total_channels, t.online_channels, t.offline_channels, t.online_percentage, t.$time_col AS timecol
        FROM cctv_reports t
        INNER JOIN (
            SELECT building, MAX($time_col) AS m
            FROM cctv_reports
            GROUP BY building
        ) s ON t.building = s.building AND t.$time_col = s.m
        ORDER BY t.building";

// Prefer aggregation from report details (per-NVR rows) because cctv_reports may contain per-NVR rows
$last = null;
$agg_sql = "SELECT cr.building, cr.id AS report_id, cr.$time_col AS timecol, SUM(d.online_channels) AS online_sum
    FROM cctv_reports cr
    JOIN cctv_report_details d ON cr.id = d.report_id
    INNER JOIN (
        SELECT building, MAX($time_col) AS m
        FROM cctv_reports
        GROUP BY building
    ) s ON cr.building = s.building AND cr.$time_col = s.m
    GROUP BY cr.building, cr.id, cr.$time_col
    ORDER BY cr.building";

$resAgg = $conn->query($agg_sql);
if ($resAgg) {
    while ($r = $resAgg->fetch_assoc()) {
        $b = $r['building'];
        $online = isset($r['online_sum']) ? (int)$r['online_sum'] : 0;
        $created = $r['timecol'] ?? null;

        // Compute total channels from devices table for the building
        $total = 0;
        $stmt = $conn->prepare("SELECT SUM(channels) AS device_total FROM cctv_devices WHERE building = ?");
        if ($stmt) {
            $stmt->bind_param('s', $b);
            $stmt->execute();
            $tmp = $stmt->get_result()->fetch_assoc();
            $total = isset($tmp['device_total']) ? (int)$tmp['device_total'] : 0;
            $stmt->close();
        }

        $offline = max(0, $total - $online);
        $percent = $total > 0 ? round(($online / $total) * 100, 1) : 0;
        // sanitize percent to [0,100]
        if ($percent < 0) $percent = 0;
        if ($percent > 100) $percent = 100;

        if ($created && (!$last || strtotime($created) > strtotime($last))) $last = $created;
        $response['buildings'][$b] = [
            'total' => $total,
            'online' => $online,
            'offline' => $offline,
            'percent' => $percent,
            'last_update' => $created
        ];
    }
}
// If no rows found, try fallback aggregation from cctv_report_details
if (empty($response['buildings'])) {
    $fallback_sql = "SELECT cr.building, cr.id AS report_id, cr.total_channels, cr.created_at, SUM(d.online_channels) AS online_sum
        FROM cctv_reports cr
        JOIN cctv_report_details d ON cr.id = d.report_id
        INNER JOIN (
            SELECT building, MAX(created_at) AS m
            FROM cctv_reports
            GROUP BY building
        ) s ON cr.building = s.building AND cr.created_at = s.m
        GROUP BY cr.building, cr.id, cr.total_channels, cr.created_at
        ORDER BY cr.building";

    $res2 = $conn->query($fallback_sql);
    if ($res2) {
        while ($r = $res2->fetch_assoc()) {
            $b = $r['building'];
            $total = isset($r['total_channels']) ? (int)$r['total_channels'] : 0;
            $online = isset($r['online_sum']) ? (int)$r['online_sum'] : 0;
            // If total is missing, try to compute from cctv_devices table
            if ($total === 0) {
                $stmt = $conn->prepare("SELECT SUM(channels) AS device_total FROM cctv_devices WHERE building = ?");
                if ($stmt) {
                    $stmt->bind_param('s', $b);
                    $stmt->execute();
                    $tmp = $stmt->get_result()->fetch_assoc();
                    $total = isset($tmp['device_total']) ? (int)$tmp['device_total'] : 0;
                    $stmt->close();
                }
            }
            $offline = max(0, $total - $online);
            $percent = $total > 0 ? round(($online / $total) * 100, 1) : 0;
            $created = $r['created_at'] ?? null;
            if ($created && (!$last || strtotime($created) > strtotime($last))) $last = $created;
            $response['buildings'][$b] = [
                'total' => $total,
                'online' => $online,
                'offline' => $offline,
                'percent' => $percent,
                'last_update' => $created
            ];
        }
    }
}

$response['last_update'] = $last;
$conn->close();

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>