<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "wd_reports";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$result = $conn->query("SELECT * FROM users ORDER BY id DESC LIMIT 5");
while ($row = $result->fetch_assoc()) {
    print_r($row);
}
?>