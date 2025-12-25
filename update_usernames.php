<?php
/**
 * update_usernames.php
 * 
 * Updates all usernames by appending 2 characters from English last name
 * to ensure uniqueness and prevent duplicates
 */

require_once 'config.php';

// Get action parameter
$action = isset($_GET['action']) ? $_GET['action'] : 'preview';

echo '<!DOCTYPE html>';
echo '<html lang="th">';
echo '<head>';
echo '<meta charset="UTF-8">';
echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
echo '<title>Update Usernames</title>';
echo '<link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">';
echo '<script src="https://cdn.tailwindcss.com"></script>';
echo '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">';
echo '<style>body { font-family: "Sarabun", sans-serif; }</style>';
echo '</head>';
echo '<body class="bg-gray-100 p-8">';

echo '<div class="max-w-6xl mx-auto">';
echo '<div class="bg-white rounded-lg shadow-lg p-8">';
echo '<h1 class="text-3xl font-bold text-gray-800 mb-6">อัพเดต Username ทั้งหมด</h1>';

// Function to generate new username
function generateNewUsername($current_username, $eng_last_name)
{
    // Get first 2 characters from English last name (lowercase)
    $suffix = strtolower(substr($eng_last_name, 0, 2));
    return $current_username . $suffix;
}

// --- Preview Mode ---
if ($action == 'preview') {
    echo '<div class="mb-6 bg-blue-50 border border-blue-300 rounded-lg p-4">';
    echo '<h2 class="font-bold text-blue-800 mb-2">📋 โหมดตรวจสอบ (Preview)</h2>';
    echo '<p class="text-blue-700">กำลังแสดงการเปลี่ยนแปลงที่จะเกิดขึ้น ยังไม่ได้บันทึกลงฐานข้อมูล (ยกเว้น Admin)</p>';
    echo '</div>';

    // Query all users with eng_last_name (exclude admin)
    $sql = "SELECT id, username, first_name, last_name, eng_last_name, employee_id, user_type, role_id 
            FROM users 
            WHERE user_type = 'officer'
            ORDER BY username, employee_id";
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        $updates = [];
        $duplicates_before = [];
        $duplicates_after = [];
        $all_usernames_before = [];
        $all_usernames_after = [];

        // Collect all data
        while ($row = $result->fetch_assoc()) {
            $old_username = $row['username'];
            $eng_last_name = $row['eng_last_name'] ?? '';

            // Generate new username
            if (!empty($eng_last_name)) {
                $new_username = generateNewUsername($old_username, $eng_last_name);
            } else {
                $new_username = $old_username . 'xx'; // Fallback if no eng_last_name
            }

            $updates[] = [
                'id' => $row['id'],
                'old_username' => $old_username,
                'new_username' => $new_username,
                'full_name' => $row['first_name'] . ' ' . $row['last_name'],
                'employee_id' => $row['employee_id'],
                'eng_last_name' => $eng_last_name,
                'user_type' => $row['user_type'],
                'role_id' => $row['role_id']
            ];

            // Track duplicates
            if (isset($all_usernames_before[$old_username])) {
                $duplicates_before[$old_username][] = $row['employee_id'];
            } else {
                $all_usernames_before[$old_username] = $row['employee_id'];
            }

            if (isset($all_usernames_after[$new_username])) {
                $duplicates_after[$new_username][] = $row['employee_id'];
            } else {
                $all_usernames_after[$new_username] = $row['employee_id'];
            }
        }

        // Display duplicate summary
        echo '<div class="mb-6 grid grid-cols-2 gap-4">';

        echo '<div class="bg-red-50 border border-red-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-red-800 mb-2">❌ Username ซ้ำกันก่อนอัพเดต: ' . count($duplicates_before) . ' กลุ่ม</h3>';
        if (count($duplicates_before) > 0) {
            echo '<ul class="text-sm text-red-700 space-y-1">';
            foreach ($duplicates_before as $username => $ids) {
                echo '<li><strong>' . htmlspecialchars($username) . '</strong>: ' . count($ids) + 1 . ' คน</li>';
            }
            echo '</ul>';
        } else {
            echo '<p class="text-sm text-red-700">ไม่มี</p>';
        }
        echo '</div>';

        echo '<div class="bg-green-50 border border-green-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-green-800 mb-2">✅ Username ซ้ำกันหลังอัพเดต: ' . count($duplicates_after) . ' กลุ่ม</h3>';
        if (count($duplicates_after) > 0) {
            echo '<ul class="text-sm text-orange-700 space-y-1">';
            foreach ($duplicates_after as $username => $ids) {
                echo '<li><strong>' . htmlspecialchars($username) . '</strong>: ' . count($ids) + 1 . ' คน (⚠️ ยังซ้ำ!)</li>';
            }
            echo '</ul>';
        } else {
            echo '<p class="text-sm text-green-700">ไม่มี - ทุก username ไม่ซ้ำกัน!</p>';
        }
        echo '</div>';

        echo '</div>';

        // Display table
        echo '<div class="overflow-x-auto mb-6">';
        echo '<table class="min-w-full bg-white border border-gray-300 text-sm">';
        echo '<thead class="bg-gray-200">';
        echo '<tr>';
        echo '<th class="px-3 py-2 border">ID</th>';
        echo '<th class="px-3 py-2 border">รหัสพนักงาน</th>';
        echo '<th class="px-3 py-2 border">ชื่อ-นามสกุล</th>';
        echo '<th class="px-3 py-2 border">Username เดิม</th>';
        echo '<th class="px-3 py-2 border">→</th>';
        echo '<th class="px-3 py-2 border">Username ใหม่</th>';
        echo '<th class="px-3 py-2 border">นามสกุลอังกฤษ</th>';
        echo '</tr>';
        echo '</thead>';
        echo '<tbody>';

        foreach ($updates as $update) {
            $is_duplicate_before = isset($duplicates_before[$update['old_username']]);
            $is_duplicate_after = isset($duplicates_after[$update['new_username']]);
            $row_class = $is_duplicate_before ? 'bg-red-50' : '';

            echo '<tr class="' . $row_class . '">';
            echo '<td class="px-3 py-2 border text-center">' . $update['id'] . '</td>';
            echo '<td class="px-3 py-2 border text-center">' . htmlspecialchars($update['employee_id']) . '</td>';
            echo '<td class="px-3 py-2 border">' . htmlspecialchars($update['full_name']) . '</td>';
            echo '<td class="px-3 py-2 border font-mono">';
            if ($is_duplicate_before)
                echo '<span class="text-red-600">❌ ';
            echo htmlspecialchars($update['old_username']);
            if ($is_duplicate_before)
                echo '</span>';
            echo '</td>';
            echo '<td class="px-3 py-2 border text-center">→</td>';
            echo '<td class="px-3 py-2 border font-mono font-bold">';
            if ($is_duplicate_after)
                echo '<span class="text-orange-600">⚠️ ';
            else
                echo '<span class="text-green-600">✅ ';
            echo htmlspecialchars($update['new_username']);
            echo '</span></td>';
            echo '<td class="px-3 py-2 border text-gray-600">' . htmlspecialchars($update['eng_last_name']) . '</td>';
            echo '</tr>';
        }

        echo '</tbody>';
        echo '</table>';
        echo '</div>';

        // Action buttons
        echo '<div class="flex gap-4">';
        echo '<a href="update_usernames.php?action=execute" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold">✅ ยืนยันและอัพเดตฐานข้อมูล</a>';
        echo '<a href="dashboard.php" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700">ยกเลิก</a>';
        echo '</div>';

    } else {
        echo '<p class="text-gray-600">ไม่พบข้อมูลผู้ใช้</p>';
    }
}

// --- Execute Mode ---
else if ($action == 'execute') {
    echo '<div class="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">';
    echo '<h2 class="font-bold text-yellow-800 mb-2">⚙️ กำลังอัพเดตฐานข้อมูล... (ยกเว้น Admin)</h2>';
    echo '</div>';

    $conn->begin_transaction();

    try {
        // Query all users (exclude admin)
        $sql = "SELECT id, username, eng_last_name FROM users WHERE user_type = 'officer'";
        $result = $conn->query($sql);

        $updated_count = 0;
        $error_count = 0;

        if ($result && $result->num_rows > 0) {
            $stmt = $conn->prepare("UPDATE users SET username = ? WHERE id = ?");

            while ($row = $result->fetch_assoc()) {
                $old_username = $row['username'];
                $eng_last_name = $row['eng_last_name'] ?? '';

                // Generate new username
                if (!empty($eng_last_name)) {
                    $new_username = generateNewUsername($old_username, $eng_last_name);
                } else {
                    $new_username = $old_username . 'xx';
                }

                // Update
                $stmt->bind_param("si", $new_username, $row['id']);
                if ($stmt->execute()) {
                    $updated_count++;
                    echo '<p class="text-sm text-green-700">✅ ID ' . $row['id'] . ': ' . htmlspecialchars($old_username) . ' → ' . htmlspecialchars($new_username) . '</p>';
                } else {
                    $error_count++;
                    echo '<p class="text-sm text-red-700">❌ ID ' . $row['id'] . ': Error - ' . htmlspecialchars($stmt->error) . '</p>';
                }
            }

            $stmt->close();
        }

        $conn->commit();

        echo '<div class="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-green-800 mb-2">✅ อัพเดตสำเร็จ!</h3>';
        echo '<p class="text-green-700">อัพเดต ' . $updated_count . ' รายการ</p>';
        if ($error_count > 0) {
            echo '<p class="text-red-700">ผิดพลาด ' . $error_count . ' รายการ</p>';
        }
        echo '</div>';

        echo '<a href="dashboard.php" class="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">กลับ Dashboard</a>';

    } catch (Exception $e) {
        $conn->rollback();
        echo '<div class="bg-red-50 border border-red-300 rounded-lg p-4">';
        echo '<h3 class="font-bold text-red-800 mb-2">❌ เกิดข้อผิดพลาด</h3>';
        echo '<p class="text-red-700">' . htmlspecialchars($e->getMessage()) . '</p>';
        echo '</div>';
    }
}

echo '</div>';
echo '</div>';

echo '</body>';
echo '</html>';

$conn->close();
?>