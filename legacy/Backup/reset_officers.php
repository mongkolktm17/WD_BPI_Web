<?php
require_once "config.php";

// ลบข้อมูลเดิม
$conn->query("DELETE FROM users WHERE user_type = 'officer'");
echo "ลบข้อมูลเจ้าหน้าที่เดิมทั้งหมด<br>";

// เพิ่มข้อมูลใหม่
$users = [
    [
        'first_name' => 'สมชาย',
        'last_name' => 'ใจดี',
        'employee_id' => '10000001',
        'phone_number' => '0812345678',
        'username' => 'somchai',
        'password' => password_hash('somchai123', PASSWORD_DEFAULT),
        'role_id' => 3,
        'user_type' => 'officer'
    ],
    [
        'first_name' => 'วิชัย',
        'last_name' => 'รักงาน',
        'employee_id' => '10000002',
        'phone_number' => '0823456789',
        'username' => 'wichai',
        'password' => password_hash('wichai123', PASSWORD_DEFAULT),
        'role_id' => 1,
        'user_type' => 'officer'
    ],
    [
        'first_name' => 'สมหญิง',
        'last_name' => 'มั่นคง',
        'employee_id' => '10000003',
        'phone_number' => '0834567890',
        'username' => 'somying',
        'password' => password_hash('somying123', PASSWORD_DEFAULT),
        'role_id' => 1,
        'user_type' => 'officer'
    ]
];

$sql = "INSERT INTO users (first_name, last_name, employee_id, phone_number, username, password, user_type, role_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

if ($stmt = $conn->prepare($sql)) {
    $stmt->bind_param("sssssssi", 
        $first_name, 
        $last_name, 
        $employee_id, 
        $phone_number, 
        $username, 
        $password,
        $user_type,
        $role_id
    );

    foreach ($users as $user) {
        $first_name = $user['first_name'];
        $last_name = $user['last_name'];
        $employee_id = $user['employee_id'];
        $phone_number = $user['phone_number'];
        $username = $user['username'];
        $password = $user['password'];
        $user_type = $user['user_type'];
        $role_id = $user['role_id'];
        
        if ($stmt->execute()) {
            echo "เพิ่มเจ้าหน้าที่ $first_name สำเร็จ<br>";
        } else {
            echo "Error adding $first_name: " . $stmt->error . "<br>";
        }
    }
    $stmt->close();
} else {
    echo "Error preparing statement: " . $conn->error;
}

$conn->close();
?>