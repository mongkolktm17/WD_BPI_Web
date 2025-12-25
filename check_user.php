&lt;?php
require_once 'config.php';

// Query to get all users with 'sukanya' in username
$sql = "SELECT id, username, user_type, role_id, first_name, last_name, employee_id FROM users WHERE username LIKE
'%sukanya%'";
$result = $conn-&gt;query($sql);

echo "&lt;h2&gt;Users with 'sukanya' in username:&lt;/h2&gt;";
echo "&lt;pre&gt;";

if ($result-&gt;num_rows &gt; 0) {
while($row = $result-&gt;fetch_assoc()) {
echo "ID: " . $row['id'] . "\n";
echo "Username: " . $row['username'] . "\n";
echo "User Type: " . $row['user_type'] . "\n";
echo "Role ID: " . $row['role_id'] . "\n";
echo "First Name: " . $row['first_name'] . "\n";
echo "Last Name: " . $row['last_name'] . "\n";
echo "Employee ID: " . $row['employee_id'] . "\n";
echo "-------------------\n";
}
} else {
echo "No users found with 'sukanya' in username.\n";
}

// Also check roles table
echo "\n&lt;h2&gt;All Roles:&lt;/h2&gt;";
$sql_roles = "SELECT * FROM roles";
$result_roles = $conn-&gt;query($sql_roles);

if ($result_roles-&gt;num_rows &gt; 0) {
while($row = $result_roles-&gt;fetch_assoc()) {
echo "Role ID: " . $row['id'] . " - " . $row['role_name'] . "\n";
}
}

echo "&lt;/pre&gt;";
$conn-&gt;close();
?&gt;