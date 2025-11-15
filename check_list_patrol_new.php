<?php
require_once 'config.php'; // Connect to the database and start session

// If the user is not logged in, redirect to the login page.
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

// Get user info from session
$employee_id = $_SESSION["employee_id"] ?? '';
$inspector_name = trim(($_SESSION["first_name"] ?? '') . ' ' . ($_SESSION["last_name"] ?? ''));


$message = '';
$error = '';

// --- Create Table If It Doesn't Exist ---
try {
    $table_sql = "CREATE TABLE IF NOT EXISTS `patrol_reports` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `report_date` DATE NOT NULL,
        `report_condition` VARCHAR(255) NOT NULL,
        `shift` VARCHAR(50) NOT NULL,
        `employee_id` VARCHAR(255) NOT NULL,
        `inspector_name` VARCHAR(255) NOT NULL,
        `patrol_time` VARCHAR(50) NOT NULL,
        `building` VARCHAR(255) NOT NULL,
        `fence_lighting` VARCHAR(50) NOT NULL,
        `fence_objects` VARCHAR(50) NOT NULL,
        `no_gathering` VARCHAR(50) NOT NULL,
        `no_flyers` VARCHAR(50) NOT NULL,
        `fence_normal` VARCHAR(50) NOT NULL,
        `no_suspicious_parking` VARCHAR(50) NOT NULL,
        `no_suspicious_boxes` VARCHAR(50) NOT NULL,
        `no_unauthorized_persons_area` VARCHAR(50) NOT NULL,
        `door_system_normal` VARCHAR(50) NOT NULL,
        `electrical_system_normal` VARCHAR(50) NOT NULL,
        `no_room_abnormalities` VARCHAR(50) NOT NULL,
        `no_unauthorized_persons_room` VARCHAR(50) NOT NULL,
        `no_chemical_obstruction` VARCHAR(50) NOT NULL,
        `no_container_leaks` VARCHAR(50) NOT NULL,
        `no_unauthorized_persons_chemical` VARCHAR(50) NOT NULL,
        `chemical_door_normal` VARCHAR(50) NOT NULL,
        `no_unauthorized_persons_electrical` VARCHAR(50) NOT NULL,
        `electrical_door_normal` VARCHAR(50) NOT NULL,
        `no_electrical_abnormalities` VARCHAR(50) NOT NULL,
        `equipment_normal` VARCHAR(50) NOT NULL,
        `no_fire_door_obstruction` VARCHAR(50) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    if (!$conn->query($table_sql)) {
        throw new Exception("Error creating table: " . $conn->error);
    }

} catch (Exception $e) {
    $error = "Database setup error: " . $e->getMessage();
}


// --- Handle Form Submission ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && empty($error)) {
    try {
        // Prepare an insert statement
        $sql = "INSERT INTO patrol_reports (
            report_date, report_condition, shift, employee_id, inspector_name, patrol_time, building,
            fence_lighting, fence_objects, no_gathering, no_flyers, fence_normal, no_suspicious_parking, no_suspicious_boxes,
            no_unauthorized_persons_area, door_system_normal, electrical_system_normal, no_room_abnormalities, no_unauthorized_persons_room,
            no_chemical_obstruction, no_container_leaks, no_unauthorized_persons_chemical, chemical_door_normal,
            no_unauthorized_persons_electrical, electrical_door_normal, no_electrical_abnormalities,
            equipment_normal, no_fire_door_obstruction
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        if ($stmt = $conn->prepare($sql)) {
            // Bind variables to the prepared statement as parameters
            $stmt->bind_param("ssssssssssssssssssssssssssss",
                $_POST['date'], $_POST['condition'], $_POST['shift'], $_POST['employee_id'], $_POST['inspector_name'], $_POST['patrol_time'], $_POST['building'],
                $_POST['fence_lighting'], $_POST['fence_objects'], $_POST['no_gathering'], $_POST['no_flyers'], $_POST['fence_normal'], $_POST['no_suspicious_parking'], $_POST['no_suspicious_boxes'],
                $_POST['no_unauthorized_persons_area'], $_POST['door_system_normal'], $_POST['electrical_system_normal'], $_POST['no_room_abnormalities'], $_POST['no_unauthorized_persons_room'],
                $_POST['no_chemical_obstruction'], $_POST['no_container_leaks'], $_POST['no_unauthorized_persons_chemical'], $_POST['chemical_door_normal'],
                $_POST['no_unauthorized_persons_electrical'], $_POST['electrical_door_normal'], $_POST['no_electrical_abnormalities'],
                $_POST['equipment_normal'], $_POST['no_fire_door_obstruction']
            );

            // Attempt to execute the prepared statement
            if ($stmt->execute()) {
                $message = "รายงานการออกเดินตรวจของคุณได้รับการบันทึกเรียบร้อยแล้ว";
            } else {
                throw new Exception("Error executing statement: " . $stmt->error);
            }

            // Close statement
            $stmt->close();
        } else {
            throw new Exception("Error preparing statement: " . $conn->error);
        }
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}
?>
<!doctype html>
<html lang="th" class="h-full">
 <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>รายงานการออกเดินตรวจ รปภ.</title>
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap');
        
        body {
            box-sizing: border-box;
        }
        .custom-font {
            font-family: 'Inter', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
        }
        
        .toggle-btn {
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(8px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            letter-spacing: -0.025em;
        }
        
        .toggle-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.5s;
        }
        
        .toggle-btn:hover::before {
            left: 100%;
        }
        
        .toggle-btn:active {
            transform: scale(0.98);
        }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .input-modern {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(14, 165, 233, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .input-modern:focus {
            background: rgba(255, 255, 255, 0.95);
            border-color: rgba(14, 165, 233, 0.4);
            box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
        }
        
        .section-title {
            background: linear-gradient(135deg, #0ea5e9, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 600;
            letter-spacing: -0.025em;
        }
        
        .submit-btn-modern {
            background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%);
            box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.4), 0 8px 10px -6px rgba(14, 165, 233, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
            letter-spacing: -0.025em;
        }
        
        .submit-btn-modern:hover {
            background: linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%);
            box-shadow: 0 20px 40px -5px rgba(14, 165, 233, 0.5), 0 12px 15px -6px rgba(14, 165, 233, 0.2);
            transform: translateY(-2px);
        }
        
        .submit-btn-modern:active {
            transform: translateY(0px) scale(0.98);
        }
    </style>
  <style>@view-transition { navigation: auto; }</style>
 </head>
 <body class="h-full custom-font" style="background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);">
  <main class="min-h-full py-4 px-4">
   <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="glass-card rounded-3xl shadow-xl p-8 mb-8 relative">
     <a href="report_page.php" class="absolute top-4 right-4 bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded-xl hover:bg-blue-300 transition-colors shadow-md">กลับ หน้ารายงาน</a>
     <div class="text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full mb-4">
       <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
       </svg>
      </div>
      <h1 id="form-title" class="text-3xl font-bold section-title mb-3">รายงานการออกเดินตรวจ รปภ.</h1>
      <p class="text-gray-600 text-lg font-medium">กรุณากรอกข้อมูลการตรวจสอบพื้นที่ให้ครบถ้วน</p>
     </div>
    </div>

    <?php if (!empty($message)): ?>
        <div id="success-message" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div class="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
           <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
           </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">บันทึกสำเร็จ!</h3>
          <p class="text-gray-600 mb-6"><?php echo htmlspecialchars($message); ?></p><button onclick="closeSuccessMessage()" class="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"> ตกลง </button>
         </div>
        </div>
    <?php endif; ?>

    <?php if (!empty($error)): ?>
        <div class="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-xl shadow-lg z-50">
            <?php echo htmlspecialchars($error); ?>
        </div>
    <?php endif; ?>


    <!-- Form -->
    <form id="patrol-form" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post" class="space-y-6">
     <!-- ข้อมูลทั่วไป -->
     <div class="glass-card rounded-3xl shadow-xl p-8 border border-sky-100">
      <h2 class="text-2xl font-bold section-title mb-6 flex items-center">
       <div class="w-2 h-6 bg-gradient-to-b from-sky-400 to-blue-500 rounded-full mr-3"></div> ข้อมูลทั่วไป</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
       <div><label for="date" class="block text-sm font-medium text-gray-700 mb-2">วันที่</label> <input type="date" id="date" name="date" required class="w-full px-5 py-4 input-modern rounded-2xl font-medium text-gray-700">
       </div>
       <div><label class="block text-sm font-medium text-gray-700 mb-2">ตรวจสอบพื้นที่ในภาวะ</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'condition', 'ภาวะปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> <span class="text-lg">✓</span> ภาวะปกติ </button> <button type="button" onclick="toggleButton(this, 'condition', 'ภาวะฉุกเฉิน')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> <span class="text-lg">⚠</span> ภาวะฉุกเฉิน </button>
        </div><input type="hidden" id="condition" name="condition" required>
       </div>
       <div><label class="block text-sm font-medium text-gray-700 mb-2">กะ</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'shift', 'เช้า')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium"> 🌅 เช้า </button> <button type="button" onclick="toggleButton(this, 'shift', 'บ่าย')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-orange-300 hover:bg-orange-50 font-medium"> ☀️ บ่าย </button> <button type="button" onclick="toggleButton(this, 'shift', 'ดึก')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-purple-300 hover:bg-purple-50 font-medium"> 🌙 ดึก </button>
        </div><input type="hidden" id="shift" name="shift" required>
       </div>
       <div><label for="employee_id" class="block text-sm font-medium text-gray-700 mb-2">รหัสพนักงาน PCS 8 หลัก</label> <input type="text" id="employee_id" name="employee_id" required maxlength="8" class="w-full px-5 py-4 input-modern rounded-2xl font-medium text-gray-700" value="<?php echo htmlspecialchars($employee_id); ?>" readonly>
       </div>
       <div><label for="inspector_name" class="block text-sm font-medium text-gray-700 mb-2">ชื่อนามสกุล ผู้ตรวจ</label> <input type="text" id="inspector_name" name="inspector_name" required class="w-full px-5 py-4 input-modern rounded-2xl font-medium text-gray-700" value="<?php echo htmlspecialchars($inspector_name); ?>" readonly>
       </div>
       <div><label for="patrol_time" class="block text-sm font-medium text-gray-700 mb-2">เวลาทำการเดินตรวจพื้นที่</label> <select id="patrol_time" name="patrol_time" required class="w-full px-5 py-4 input-modern rounded-2xl font-medium text-gray-700"> <option value="">เลือกช่วงเวลา</option> <option value="00.00-01.00">00.00-01.00</option> <option value="01.00-02.00">01.00-02.00</option> <option value="02.00-03.00">02.00-03.00</option> <option value="03.00-04.00">03.00-04.00</option> <option value="04.00-05.00">04.00-05.00</option> <option value="05.00-06.00">05.00-06.00</option> <option value="06.00-07.00">06.00-07.00</option> <option value="07.00-08.00">07.00-08.00</option> <option value="08.00-09.00">08.00-09.00</option> <option value="09.00-10.00">09.00-10.00</option> <option value="10.00-11.00">10.00-11.00</option> <option value="11.00-12.00">11.00-12.00</option> <option value="12.00-13.00">12.00-13.00</option> <option value="13.00-14.00">13.00-14.00</option> <option value="14.00-15.00">14.00-15.00</option> <option value="15.00-16.00">15.00-16.00</option> <option value="16.00-17.00">16.00-17.00</option> <option value="17.00-18.00">17.00-18.00</option> <option value="18.00-19.00">18.00-19.00</option> <option value="19.00-20.00">19.00-20.00</option> <option value="20.00-21.00">20.00-21.00</option> <option value="21.00-22.00">21.00-22.00</option> <option value="22.00-23.00">22.00-23.00</option> <option value="23.00-24.00">23.00-24.00</option> </select>
       </div>
       <div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-2">อาคาร (เลือกได้หลายอาคาร)</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3"><button type="button" onclick="toggleBuilding(this, 'อาคาร 1')" class="building-btn px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium transition-all duration-200"> อาคาร 1 </button> <button type="button" onclick="toggleBuilding(this, 'อาคาร 2')" class="building-btn px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium transition-all duration-200"> อาคาร 2 </button> <button type="button" onclick="toggleBuilding(this, 'อาคาร 3')" class="building-btn px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium transition-all duration-200"> อาคาร 3 </button> <button type="button" onclick="toggleBuilding(this, 'อาคาร 4')" class="building-btn px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium transition-all duration-200"> อาคาร 4 </button> <button type="button" onclick="toggleBuilding(this, 'อาคาร 6')" class="building-btn px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium transition-all duration-200"> อาคาร 6 </button> <button type="button" onclick="toggleBuilding(this, 'อาคาร 8')" class="building-btn px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-sky-300 hover:bg-sky-50 font-medium transition-all duration-200"> อาคาร 8 </button>
        </div><input type="hidden" id="building" name="building" required>
        <div id="selected-buildings" class="mt-3 text-sm text-gray-600"></div>
       </div>
      </div>
     </div><!-- การตรวจสอบแนวรั้ว -->
     <div class="glass-card rounded-3xl shadow-xl p-8 border border-sky-100">
      <h2 class="text-2xl font-bold section-title mb-6 flex items-center">
       <div class="w-2 h-6 bg-gradient-to-b from-sky-400 to-blue-500 rounded-full mr-3"></div> 1. การตรวจสอบแนวรั้ว</h2>
      <div class="space-y-6"><!-- 1.1 ไฟฟ้า แสงสว่าง -->
       <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">1.1 ไฟฟ้า แสงสว่างตามแนวรั้วเพียงพอหรือไม่</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'fence_lighting', 'เพียงพอ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> <span class="text-lg">✓</span> เพียงพอ </button> <button type="button" onclick="toggleButton(this, 'fence_lighting', 'ไม่เพียงพอ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> <span class="text-lg">✗</span> ไม่เพียงพอ </button>
        </div><input type="hidden" id="fence_lighting" name="fence_lighting" required>
       </div><!-- 1.2 สิ่งของวางพาด -->
       <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">1.2 ไม่มีสิ่งของวางพาดบนแนวรั้ว</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'fence_objects', 'ไม่มี')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> <span class="text-lg">✓</span> ไม่มี </button> <button type="button" onclick="toggleButton(this, 'fence_objects', 'มี')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> <span class="text-lg">✗</span> มี </button>
        </div><input type="hidden" id="fence_objects" name="fence_objects" required>
       </div><!-- 1.3 บุคคลจับกลุ่ม -->
       <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">1.3 ไม่มีบุคคลมาจับกลุ่มชุมนุม</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_gathering', 'ไม่มี')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> <span class="text-lg">✓</span> ไม่มี </button> <button type="button" onclick="toggleButton(this, 'no_gathering', 'มี')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ มี </button>
        </div><input type="hidden" id="no_gathering" name="no_gathering" required>
       </div><!-- 1.4 ข่าวสาร ใบปลิว -->
       <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">1.4 ไม่มีข่าวสาร,ใบปลิว,ป้ายประท้วง</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_flyers', 'ไม่มี')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> <span class="text-lg">✓</span> ไม่มี </button> <button type="button" onclick="toggleButton(this, 'no_flyers', 'มี')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ มี </button>
        </div><input type="hidden" id="no_flyers" name="no_flyers" required>
       </div><!-- 1.5 สิ่งผิดปกติแนวรั้ว -->
       <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">1.5 ไม่พบสิ่งผิดปกติแนวรั้วด้านใน/ด้านนอก</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'fence_normal', 'ไม่พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบ </button> <button type="button" onclick="toggleButton(this, 'fence_normal', 'พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบ </button>
        </div><input type="hidden" id="fence_normal" name="fence_normal" required>
       </div><!-- 1.6 รถจอดผิดปกติ -->
       <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">1.6 ไม่พบรถมีการจอดผิดปกติเช่นจอดเวลานานๆ</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_suspicious_parking', 'ไม่พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบ </button> <button type="button" onclick="toggleButton(this, 'no_suspicious_parking', 'พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบ </button>
        </div><input type="hidden" id="no_suspicious_parking" name="no_suspicious_parking" required>
       </div><!-- 1.7 กล่องต้องสงสัย -->
       <div><label class="block text-sm font-medium text-gray-700 mb-3">1.7 มีกล่องต้องสงสัยวาง (ให้เปิดตรวจ)</label>
        <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_suspicious_boxes', 'ไม่พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบ </button> <button type="button" onclick="toggleButton(this, 'no_suspicious_boxes', 'พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบ </button>
        </div><input type="hidden" id="no_suspicious_boxes" name="no_suspicious_boxes" required>
       </div>
      </div>
     </div><!-- การตรวจสอบพื้นที่ภายใน -->
     <div class="glass-card rounded-3xl shadow-xl p-8 border border-sky-100">
      <h2 class="text-2xl font-bold section-title mb-6 flex items-center">
       <div class="w-2 h-6 bg-gradient-to-b from-sky-400 to-blue-500 rounded-full mr-3"></div> 2. การตรวจสอบพื้นที่ภายใน</h2>
      <div class="space-y-6"><!-- 2.1 พื้นที่ทั่วไป -->
       <div class="border-l-4 border-sky-300 pl-4">
        <h3 class="font-medium text-gray-800 mb-4">2.1 พื้นที่ทั่วไป</h3>
        <div class="space-y-4">
         <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">2.1.1 ไม่พบบุคคลที่ไม่เกี่ยวข้องอยู่ภายในพื้นที่</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_unauthorized_persons_area', 'ไม่พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบ </button> <button type="button" onclick="toggleButton(this, 'no_unauthorized_persons_area', 'พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบ </button>
          </div><input type="hidden" id="no_unauthorized_persons_area" name="no_unauthorized_persons_area" required>
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-3">2.1.2 ระบบประตูสามารถใช้งานได้ปกติหรือไม่</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'door_system_normal', 'ปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ปกติ </button> <button type="button" onclick="toggleButton(this, 'door_system_normal', 'ผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ ผิดปกติ </button>
          </div><input type="hidden" id="door_system_normal" name="door_system_normal" required>
         </div>
        </div>
       </div><!-- 2.2 ห้องควบคุม -->
       <div class="border-l-4 border-sky-300 pl-4">
        <h3 class="font-medium text-gray-800 mb-4">2.2 ห้องควบคุม</h3>
        <div class="space-y-4">
         <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">2.2.1 ระบบไฟฟ้าใช้งานได้ปกติหรือไม่</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'electrical_system_normal', 'ปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ปกติ </button> <button type="button" onclick="toggleButton(this, 'electrical_system_normal', 'ผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ ผิดปกติ </button>
          </div><input type="hidden" id="electrical_system_normal" name="electrical_system_normal" required>
         </div>
         <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">2.2.2 ไม่พบมีสิ่งผิดปกติอยู่ภายในและภายนอกของห้อง</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_room_abnormalities', 'ไม่พบสิ่งผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบสิ่งผิดปกติ </button> <button type="button" onclick="toggleButton(this, 'no_room_abnormalities', 'พบสิ่งผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบสิ่งผิดปกติ </button>
          </div><input type="hidden" id="no_room_abnormalities" name="no_room_abnormalities" required>
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-3">2.2.3 ไม่พบบุคคลที่ไม่เกี่ยวข้องอยู่ภายในพื้นที่</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_unauthorized_persons_room', 'ไม่พบบุคคลอยุ่ในพื้นที่')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบบุคคลอยุ่ในพื้นที่ </button> <button type="button" onclick="toggleButton(this, 'no_unauthorized_persons_room', 'พบบุคคลอยุ่ในพื้นที่')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบบุคคลอยุ่ในพื้นที่ </button>
          </div><input type="hidden" id="no_unauthorized_persons_room" name="no_unauthorized_persons_room" required>
         </div>
        </div>
       </div><!-- 2.3 ห้องเก็บสารเคมี -->
       <div class="border-l-4 border-sky-300 pl-4">
        <h3 class="font-medium text-gray-800 mb-4">2.3 ห้องเก็บสารเคมี</h3>
        <div class="space-y-4">
         <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">2.3.1 ไม่มีสิ่งของกีดขวางทางเข้าห้องเก็บสารเคมี</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_chemical_obstruction', 'ไม่พบสิ่งของกีดขวางทาง')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบสิ่งของกีดขวางทาง </button> <button type="button" onclick="toggleButton(this, 'no_chemical_obstruction', 'พบสิ่งของกีดขวางทาง')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบสิ่งของกีดขวางทาง </button>
          </div><input type="hidden" id="no_chemical_obstruction" name="no_chemical_obstruction" required>
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-3">2.3.2 ภาชนะบรรจุต้องไม่รั่วซึม แตกหรือฉีดขาด</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_container_leaks', 'ไม่พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบ </button> <button type="button" onclick="toggleButton(this, 'no_container_leaks', 'พบ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบ </button>
          </div><input type="hidden" id="no_container_leaks" name="no_container_leaks" required>
         </div>
        </div>
       </div><!-- 2.4 ห้องเก็บสารเคมี (ต่อ) -->
       <div class="border-l-4 border-sky-300 pl-4">
        <h3 class="font-medium text-gray-800 mb-4">2.4 ห้องเก็บสารเคมี (ต่อ)</h3>
        <div class="space-y-4">
         <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">2.4.1 ไม่พบบุคคลที่ไม่เกี่ยวข้องอยู่ภายในพื้นที่</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_unauthorized_persons_chemical', 'ไม่พบบุคคลไม่เกี่ยวข้อง')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบบุคคลไม่เกี่ยวข้อง </button> <button type="button" onclick="toggleButton(this, 'no_unauthorized_persons_chemical', 'พบบุคคลไม่เกี่ยวข้อง')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบบุคคลไม่เกี่ยวข้อง </button>
          </div><input type="hidden" id="no_unauthorized_persons_chemical" name="no_unauthorized_persons_chemical" required>
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-3">2.4.2 ระบบประตูสามารถใช้งานได้ปกติหรือไม่</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'chemical_door_normal', 'ปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ปกติ </button> <button type="button" onclick="toggleButton(this, 'chemical_door_normal', 'ผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ ผิดปกติ </button>
          </div><input type="hidden" id="chemical_door_normal" name="chemical_door_normal" required>
         </div>
        </div>
       </div><!-- 2.5 สถานีจ่ายไฟฟ้า -->
       <div class="border-l-4 border-sky-300 pl-4">
        <h3 class="font-medium text-gray-800 mb-4">2.5 สถานีจ่ายไฟฟ้า</h3>
        <div class="space-y-4">
         <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">2.5.1 ไม่พบบุคคลที่ไม่เกี่ยวข้องอยู่ภายในพื้นที่</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_unauthorized_persons_electrical', 'ไม่พบบุคคลที่ไม่เกี่ยวข้อง')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบบุคคลที่ไม่เกี่ยวข้อง </button> <button type="button" onclick="toggleButton(this, 'no_unauthorized_persons_electrical', 'พบบุคคลที่ไม่เกี่ยวข้อง')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบบุคคลที่ไม่เกี่ยวข้อง </button>
          </div><input type="hidden" id="no_unauthorized_persons_electrical" name="no_unauthorized_persons_electrical" required>
         </div>
         <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">2.5.2 ระบบประตูสามารถใช้งานได้ปกติหรือไม่</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'electrical_door_normal', 'ปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ปกติ </button> <button type="button" onclick="toggleButton(this, 'electrical_door_normal', 'ผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ ผิดปกติ </button>
          </div><input type="hidden" id="electrical_door_normal" name="electrical_door_normal" required>
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-3">2.5.3 ไม่พบความผิดปกติภายในสถานีจ่ายไฟฟ้า</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_electrical_abnormalities', 'ไม่พบความผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบความผิดปกติ </button> <button type="button" onclick="toggleButton(this, 'no_electrical_abnormalities', 'พบความผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบความผิดปกติ </button>
          </div><input type="hidden" id="no_electrical_abnormalities" name="no_electrical_abnormalities" required>
         </div>
        </div>
       </div><!-- 2.6 อุปกรณ์และประตูหนีไฟ -->
       <div class="border-l-4 border-sky-300 pl-4">
        <h3 class="font-medium text-gray-800 mb-4">2.6 อุปกรณ์และประตูหนีไฟ</h3>
        <div class="space-y-4">
         <div class="border-b border-gray-100 pb-4"><label class="block text-sm font-medium text-gray-700 mb-3">2.6.1 อุปกรณ์ใช้งานได้ตามปกติ</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'equipment_normal', 'ปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ปกติ </button> <button type="button" onclick="toggleButton(this, 'equipment_normal', 'ผิดปกติ')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ ผิดปกติ </button>
          </div><input type="hidden" id="equipment_normal" name="equipment_normal" required>
         </div>
         <div><label class="block text-sm font-medium text-gray-700 mb-3">2.6.2 ไม่มีสิ่งของวางขวางประตูหนีไฟ</label>
          <div class="flex gap-3"><button type="button" onclick="toggleButton(this, 'no_fire_door_obstruction', 'ไม่พบมีสิ่งขีดขวาง')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-green-300 hover:bg-green-50 font-medium"> ✓ ไม่พบมีสิ่งขีดขวาง </button> <button type="button" onclick="toggleButton(this, 'no_fire_door_obstruction', 'พบมีสิ่งขีดขวาง')" class="toggle-btn flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-600 hover:border-red-300 hover:bg-red-50 font-medium"> ✗ พบมีสิ่งขีดขวาง </button>
          </div><input type="hidden" id="no_fire_door_obstruction" name="no_fire_door_obstruction" required>
         </div>
        </div>
       </div>
      </div>
     </div><!-- Submit Button -->
     <div class="text-center"><button type="submit" id="submit-btn" class="submit-btn-modern text-white py-5 px-12 rounded-3xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"> <span id="submit-text">บันทึกรายงาน</span>
       <div id="loading-spinner" class="hidden inline-block ml-2">
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewbox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle> <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
       </div></button>
     </div>
    </form>
   </div>
  </main>
  <script>
        // Toggle button functionality
        function toggleButton(clickedButton, fieldName, value) {
            const buttons = clickedButton.parentElement.querySelectorAll('.toggle-btn');
            buttons.forEach(btn => {
                btn.classList.remove('border-green-500', 'bg-green-100', 'text-green-700', 'border-red-500', 'bg-red-100', 'text-red-700', 'border-sky-500', 'bg-sky-100', 'text-sky-700', 'border-orange-500', 'bg-orange-100', 'text-orange-700', 'border-purple-500', 'bg-purple-100', 'text-purple-700');
                btn.classList.add('border-gray-200', 'text-gray-600');
            });

            let activeClasses = [];
            if (['ภาวะปกติ', 'เพียงพอ', 'ไม่มี', 'ไม่พบ', 'ปกติ', 'ไม่พบสิ่งผิดปกติ', 'ไม่พบบุคคลอยุ่ในพื้นที่', 'ไม่พบสิ่งของกีดขวางทาง', 'ไม่พบบุคคลไม่เกี่ยวข้อง', 'ไม่พบความผิดปกติ', 'ไม่พบมีสิ่งขีดขวาง'].includes(value)) {
                activeClasses = ['border-green-500', 'bg-green-100', 'text-green-700'];
            } else if (['ภาวะฉุกเฉิน', 'ไม่เพียงพอ', 'มี', 'พบ', 'ผิดปกติ', 'พบสิ่งผิดปกติ', 'พบบุคคลอยุ่ในพื้นที่', 'พบสิ่งของกีดขวางทาง', 'พบบุคคลไม่เกี่ยวข้อง', 'พบความผิดปกติ', 'พบมีสิ่งขีดขวาง'].includes(value)) {
                activeClasses = ['border-red-500', 'bg-red-100', 'text-red-700'];
            } else if (value === 'เช้า') {
                activeClasses = ['border-sky-500', 'bg-sky-100', 'text-sky-700'];
            } else if (value === 'บ่าย') {
                activeClasses = ['border-orange-500', 'bg-orange-100', 'text-orange-700'];
            } else if (value === 'ดึก') {
                activeClasses = ['border-purple-500', 'bg-purple-100', 'text-purple-700'];
            }

            clickedButton.classList.remove('border-gray-200', 'text-gray-600');
            clickedButton.classList.add(...activeClasses);
            document.getElementById(fieldName).value = value;
        }

        // Building selection functionality
        let selectedBuildings = [];

        function toggleBuilding(clickedButton, buildingName) {
            const index = selectedBuildings.indexOf(buildingName);
            
            if (index > -1) {
                selectedBuildings.splice(index, 1);
                clickedButton.classList.remove('border-sky-500', 'bg-sky-100', 'text-sky-700');
                clickedButton.classList.add('border-gray-200', 'text-gray-600');
            } else {
                selectedBuildings.push(buildingName);
                clickedButton.classList.remove('border-gray-200', 'text-gray-600');
                clickedButton.classList.add('border-sky-500', 'bg-sky-100', 'text-sky-700');
            }
            
            document.getElementById('building').value = selectedBuildings.join('; ');
            updateSelectedBuildingsDisplay();
        }

        function updateSelectedBuildingsDisplay() {
            const display = document.getElementById('selected-buildings');
            if (selectedBuildings.length > 0) {
                display.textContent = `เลือกแล้ว: ${selectedBuildings.join(', ')}`;
                display.classList.remove('text-gray-600');
                display.classList.add('text-sky-600', 'font-medium');
            } else {
                display.textContent = '';
            }
        }

        function closeSuccessMessage() {
            const successMessage = document.getElementById('success-message');
            if(successMessage) {
                successMessage.style.display = 'none';
                window.location.href = window.location.pathname; // Refresh page
            }
        }

        // Set current date as default on page load
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            updateSelectedBuildingsDisplay();
        });
    </script>
 </body>
</html>
