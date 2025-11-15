<?php
// We can include the config file to get session info if needed in the future,
// but for a simple access denied page, it's not strictly necessary.
// require_once 'config.php';
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Denied</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="theme.css">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
        }
        .gradient-bg {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        }
    </style>
</head>
<body class="gradient-bg flex items-center justify-center min-h-screen">

    <div class="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden text-center p-8">
        <header class="mb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4 border-4 border-red-200">
                <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                </svg>
            </div>
            <h1 class="text-4xl font-bold text-gray-800">Access Denied</h1>
            <p class="text-gray-600 mt-2 text-lg">คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
        </header>

        <main class="mb-8">
            <p class="text-gray-500">
                ขออภัย คุณไม่ได้รับอนุญาตให้ดูเนื้อหาในหน้านี้
                โปรดติดต่อผู้ดูแลระบบหากคุณเชื่อว่านี่เป็นข้อผิดพลาด
            </p>
        </main>

        <footer class="mt-6">
            <a href="report_page.php" class="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300 inline-block">
                กลับไปที่หน้าหลัก
            </a>
        </footer>
    </div>

</body>
</html>
