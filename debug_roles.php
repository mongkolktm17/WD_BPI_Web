<?php
/**
 * debug_roles.php
 *
 * This is a debugging script to display all roles currently in the database.
 */

require_once "config.php";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Debug Roles</title>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 50%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
    </style>
</head>
<body>

    <h1>Roles in Database</h1>

    <?php
    $result = $conn->query("SELECT * FROM roles ORDER BY id");

    if ($result && $result->num_rows > 0) {
        echo "<table>";
        echo "<tr><th>ID</th><th>Role Name</th></tr>";
        while ($row = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['id']) . "</td>";
            echo "<td>" . htmlspecialchars($row['role_name']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>No roles found in the database.</p>";
    }

    $conn->close();
    ?>

</body>
</html>