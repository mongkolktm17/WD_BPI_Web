<?php
require_once "config.php";

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "<h2>เริ่มกระบวนการอัพเดตข้อมูลลานจอดรถ B.9</h2>";

// คำสั่ง SQL สำหรับอัพเดตชื่อลานจอดรถในฐานข้อมูล
$sql = "UPDATE `parking_lot_counts` 
        SET `lot_name` = 'ลานรถยนต์ B.9 (112 Slot)' 
        WHERE `lot_name` = 'ลานรถยนต์ B.9 (44 Slot)'";

if ($conn->query($sql) === TRUE) {
    echo "<div style='color: green; padding: 10px; border: 1px solid green; border-radius: 5px; margin: 10px 0;'>";
    echo "✅ อัพเดตฐานข้อมูลเรียบร้อยแล้ว<br>";
    echo "จำนวนแถวที่ได้รับการปรับปรุง: " . $conn->affected_rows;
    echo "</div>";
} else {
    echo "<div style='color: red; padding: 10px; border: 1px solid red; border-radius: 5px; margin: 10px 0;'>";
    echo "❌ เกิดข้อผิดพลาดในการอัพเดต: " . $conn->error;
    echo "</div>";
}

$conn->close();

echo "<p>คุณสามารถลบไฟล์นี้ออกจากเซิร์ฟเวอร์ได้หลังจากดำเนินการเสร็จสิ้น</p>";
echo "<a href='car_parking.php'>กลับไปยังหน้าแบบฟอร์ม</a>";
?>