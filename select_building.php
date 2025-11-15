<?php
require_once "check_permissions.php";

$building_options = [
    '2' => 'Building 2',
    '3' => 'Building 3',
    '4' => 'Building 4',
    '8' => 'Building 8',
];
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เลือกอาคาร</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="theme.css">
</head>
<body class="custom-font" style="background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="glass-card rounded-3xl shadow-xl p-8 mb-8">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold section-title mb-2">เลือกอาคาร</h1>
                    <p class="text-gray-600 text-lg">กรุณาเลือกอาคารที่ต้องการสร้างรายงาน</p>
                </div>
                <a href="report_page.php" class="bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded-xl hover:bg-blue-300 transition-colors shadow-md">กลับ หน้ารายงาน</a>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <?php foreach ($building_options as $building_id => $building_name): ?>
                <a href="report_building.php?building=<?php echo $building_id; ?>" class="glass-card rounded-2xl p-6 text-center text-slate-700 hover:text-blue-600 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div class="text-blue-500 mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mb-3 mx-auto"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M9 21v-2.25a2.25 2.25 0 00-2.25-2.25H5.25v-2.25H3v4.5h1.5v-2.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75V21m-3-18h-2.25a2.25 2.25 0 00-2.25 2.25v2.25H3V1.5h2.25A2.25 2.25 0 017.5 3.75v2.25H9V3.75A2.25 2.25 0 006.75 1.5z" /></svg>
                    </div>
                    <span class="font-semibold mt-2 block"><?php echo htmlspecialchars($building_name); ?></span>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</body>
</html>
