<?php
require_once "check_permissions.php";
require_once "config.php";

$sql = "SELECT * FROM reports";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    echo "<table border='1'>";
    echo "<tr>";
    while ($fieldinfo = $result->fetch_field()) {
        echo "<th>" . $fieldinfo->name . "</th>";
    }
    echo "</tr>";
    while($row = $result->fetch_assoc()) {
        echo "<tr>";
        foreach($row as $cell) {
            echo "<td>" . htmlspecialchars($cell) . "</td>";
        }
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "0 results";
}

$conn->close();
?>