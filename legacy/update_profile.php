<?php
require_once 'config.php';

// Check if user is logged in
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("Content-Type: application/json");
    echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
    exit;
}

$user_id = $_SESSION["id"];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // State-changing request: require the token issued by the GET branch.
    security_csrf_require();

    $action = $_POST['action'] ?? '';

    if ($action === 'update_profile') {
        // Update profile information
        $first_name = trim($_POST['first_name'] ?? '');
        $last_name = trim($_POST['last_name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $department = trim($_POST['department'] ?? '');

        if (empty($first_name) || empty($last_name)) {
            echo json_encode(['status' => 'error', 'message' => 'First name and last name are required']);
            exit;
        }

        $stmt = $conn->prepare("UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, department = ? WHERE id = ?");
        $stmt->bind_param("sssssi", $first_name, $last_name, $email, $phone, $department, $user_id);

        if ($stmt->execute()) {
            // Update session
            $_SESSION['first_name'] = $first_name;
            $_SESSION['last_name'] = $last_name;

            echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update profile']);
        }
        $stmt->close();

    } elseif ($action === 'change_password') {
        // Change password
        $current_password = $_POST['current_password'] ?? '';
        $new_password = $_POST['new_password'] ?? '';
        $confirm_password = $_POST['confirm_password'] ?? '';

        if (empty($current_password) || empty($new_password) || empty($confirm_password)) {
            echo json_encode(['status' => 'error', 'message' => 'All password fields are required']);
            exit;
        }

        if ($new_password !== $confirm_password) {
            echo json_encode(['status' => 'error', 'message' => 'New passwords do not match']);
            exit;
        }

        if (strlen($new_password) < 6) {
            echo json_encode(['status' => 'error', 'message' => 'Password must be at least 6 characters']);
            exit;
        }

        // Verify current password
        $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            if (password_verify($current_password, $row['password'])) {
                // Update password
                $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
                $stmt2 = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmt2->bind_param("si", $hashed_password, $user_id);

                if ($stmt2->execute()) {
                    echo json_encode(['status' => 'success', 'message' => 'Password changed successfully']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Failed to update password']);
                }
                $stmt2->close();
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Current password is incorrect']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'User not found']);
        }
        $stmt->close();
    }
} else {
    // GET request - return user data
    $stmt = $conn->prepare("SELECT first_name, last_name, employee_id, username FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // Add empty values for fields that don't exist in database
        $row['email'] = '';
        $row['phone'] = '';
        $row['department'] = 'security';
        $row['last_login'] = date('Y-m-d H:i:s'); // Use current time as placeholder
        echo json_encode([
            'status' => 'success',
            'data' => $row,
            'csrf_token' => security_csrf_token(),
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
    }
    $stmt->close();
}

$conn->close();
?>