<?php
require_once "config.php";

// Debug query to check data
$debug_query = "SELECT * FROM users WHERE user_type = 'officer'";
$debug_result = $conn->query($debug_query);
echo "<pre>Debug: Found " . $debug_result->num_rows . " officers in database</pre>";

while ($row = $debug_result->fetch_assoc()) {
    echo "<pre>Debug: Officer data: " . print_r($row, true) . "</pre>";
}

$conn->close();
?>