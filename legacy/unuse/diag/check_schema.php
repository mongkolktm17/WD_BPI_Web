<?php
require_once 'config.php';
$res = $conn->query('DESCRIBE reports');
while ($row = $res->fetch_assoc()) {
    echo json_encode($row) . "\n";
}
$conn->close();
