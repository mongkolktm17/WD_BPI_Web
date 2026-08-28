<?php
require_once "config.php";
$q = "ad"; // Default search for Admin
$search_term = "%" . $conn->real_escape_string($q) . "%";

echo "Testing Search for: $q\n";

$sql = "SELECT DISTINCT name FROM (
    SELECT CONCAT(first_name, ' ', last_name) as name FROM users 
    WHERE first_name LIKE '$search_term' OR last_name LIKE '$search_term' OR employee_id LIKE '$search_term'
    UNION
    SELECT full_name as name FROM reports 
    WHERE full_name LIKE '$search_term' OR employee_id LIKE '$search_term'
    UNION
    SELECT inspector_name as name FROM car_parking_reports 
    WHERE inspector_name LIKE '$search_term' 
) as combined_names 
WHERE name IS NOT NULL AND name != ''
ORDER BY name ASC 
LIMIT 15";

$result = $conn->query($sql);
if (!$result) {
    die("Query Error: " . $conn->error . "\nLine 183\n");
}

$names = [];
while ($row = $result->fetch_assoc()) {
    $names[] = $row['name'];
}

echo "Found: " . count($names) . " results\n";
print_r($names);
?>
