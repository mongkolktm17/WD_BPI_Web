<?php
require_once "config.php";

// Allow CORS if needed (though usually same-domain)
header('Content-Type: application/json; charset=utf-8');

$q = isset($_GET['q']) ? $_GET['q'] : '';

if (strlen($q) < 2) {
    echo json_encode([]);
    exit;
}

$search_term = "%" . $conn->real_escape_string($q) . "%";

// Query to get distinct names from users table and main reports table
$sql = "SELECT DISTINCT name FROM (
    SELECT CONCAT(first_name, ' ', last_name) COLLATE utf8mb4_unicode_ci as name FROM users 
    WHERE first_name LIKE '$search_term' OR last_name LIKE '$search_term' OR employee_id LIKE '$search_term'
    UNION
    SELECT full_name COLLATE utf8mb4_unicode_ci as name FROM reports 
    WHERE full_name LIKE '$search_term' OR employee_id LIKE '$search_term'
    UNION
    SELECT inspector_name COLLATE utf8mb4_unicode_ci as name FROM car_parking_reports 
    WHERE inspector_name LIKE '$search_term'
) as combined_names 
WHERE name IS NOT NULL AND name != ''
ORDER BY name ASC 
LIMIT 15";

$result = $conn->query($sql);
$names = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $names[] = $row['name'];
    }
}

echo json_encode($names);
$conn->close();
?>
