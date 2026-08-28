<?php
/**
 * view_users_csv.php
 * 
 * View all users in CSV format on screen (for copy-paste)
 */

require_once "check_permissions.php";

// Query all users with role information
$sql = "SELECT u.id, u.employee_id, u.first_name, u.last_name, u.eng_first_name, u.eng_last_name, 
               u.username, u.phone_number, u.user_type, u.role_id, r.role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.employee_id";

$result = $conn->query($sql);

$csv_data = [];
$csv_data[] = [
    'ลำดับ',
    'รหัสพนักงาน',
    'ชื่อภาษาไทย',
    'นามสกุลภาษาไทย',
    'ชื่อภาษาอังกฤษ',
    'นามสกุลภาษาอังกฤษ',
    'username',
    'password',
    'เบอร์โทร',
    'ประเภทผู้ใช้',
    'Role ID',
    'Role Name'
];

if ($result->num_rows > 0) {
    $row_num = 1;
    while ($row = $result->fetch_assoc()) {
        $password_placeholder = $row['employee_id'];

        $csv_data[] = [
            $row_num,
            $row['employee_id'],
            $row['first_name'],
            $row['last_name'],
            $row['eng_first_name'],
            $row['eng_last_name'],
            $row['username'],
            $password_placeholder,
            $row['phone_number'],
            $row['user_type'],
            $row['role_id'],
            $row['role_name']
        ];
        $row_num++;
    }
}

$total_users = $result->num_rows;
$conn->close();
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>รายการผู้ใช้ทั้งหมด (CSV)</title>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-100">

    <div class="container mx-auto p-4 sm:p-6 lg:p-8">
        <header class="mb-8">
            <div class="flex justify-between items-center">
                <h1 class="text-3xl font-bold text-gray-800">รายการผู้ใช้ทั้งหมด (CSV Format)</h1>
                <div class="space-x-2">
                    <a href="export_users_csv.php"
                        class="text-sm bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">📥
                        ดาวน์โหลด CSV</a>
                    <a href="dashboard.php"
                        class="text-sm bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">กลับ
                        Dashboard</a>
                </div>
            </div>
        </header>

        <!-- Statistics -->
        <div class="bg-white rounded-xl shadow p-6 mb-6">
            <h3 class="text-gray-600 text-sm font-medium">จำนวนผู้ใช้ทั้งหมด</h3>
            <p class="text-3xl font-bold text-blue-600 mt-2"><?php echo $total_users; ?> รายการ</p>
        </div>

        <!-- CSV Data Display -->
        <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">ข้อมูล CSV</h2>
                <button onclick="copyToClipboard()"
                    class="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                    📋 คัดลอกทั้งหมด
                </button>
            </div>

            <div class="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <textarea id="csvData" readonly
                    class="w-full h-96 font-mono text-xs bg-white border border-gray-300 rounded p-3"
                    style="resize: vertical;"><?php
                    // Output CSV data as text
                    foreach ($csv_data as $row) {
                        echo implode(',', array_map(function ($field) {
                            // Escape quotes and wrap in quotes if contains comma, quote, or newline
                            if (strpos($field, ',') !== false || strpos($field, '"') !== false || strpos($field, "\n") !== false) {
                                return '"' . str_replace('"', '""', $field) . '"';
                            }
                            return $field;
                        }, $row)) . "\n";
                    }
                    ?></textarea>
            </div>

            <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 class="font-bold text-blue-800 mb-2">💡 คำแนะนำ:</h3>
                <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>คลิก "📋 คัดลอกทั้งหมด" เพื่อคัดลอกข้อมูลไปใช้งาน</li>
                    <li>คลิก "📥 ดาวน์โหลด CSV" เพื่อดาวน์โหลดไฟล์ CSV</li>
                    <li>Password ที่แสดงคือรหัสพนักงาน (เป็น placeholder เท่านั้น)</li>
                    <li>สามารถนำข้อมูลนี้ไปแก้ไขและ import กลับได้</li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        function copyToClipboard() {
            const csvData = document.getElementById('csvData');
            csvData.select();
            document.execCommand('copy');

            // Show feedback
            alert('คัดลอกข้อมูล CSV เรียบร้อยแล้ว!');
        }
    </script>

</body>

</html>