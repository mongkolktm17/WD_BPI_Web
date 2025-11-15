<?php
// config.php now handles session starting and database connection.
require_once "config.php";

// If the user is already logged in, redirect based on their role.
if (isset($_SESSION["loggedin"]) && $_SESSION["loggedin"] === true) {
    if (isset($_SESSION["role_id"])) {
        if ($_SESSION["role_id"] == 1) { // Assuming role_id 1 is Security Officer
            header("location: report_page.php");
        } else { // All other roles
            header("location: dashboard.php");
        }
    } else {
        // Fallback if role_id is not set in session, redirect to dashboard
        header("location: dashboard.php");
    }
    exit;
}

// Define variables and initialize with empty values
$username = $password = "";
$username_err = $password_err = $login_err = "";

// --- Form Processing ---
// Only process the form if it was submitted via POST.
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // --- 1. Input Validation ---
    if (empty(trim($_POST["username"]))) {
        $username_err = "กรุณากรอกชื่อผู้ใช้";
    } else {
        $username = trim($_POST["username"]);
    }

    if (empty(trim($_POST["password"]))) {
        $password_err = "กรุณากรอกรหัสผ่าน";
    } else {
        $password = trim($_POST["password"]);
    }

    // --- 2. Database Verification ---
    // Proceed only if there are no validation errors.
    if (empty($username_err) && empty($password_err)) {
        
        // Prepare a select statement to get user details including name and employee ID.
        $sql = "SELECT id, username, password, user_type, role_id, first_name, last_name, employee_id FROM users WHERE username = ?";
        
        if ($stmt = $conn->prepare($sql)) {
            $stmt->bind_param("s", $username);

            if ($stmt->execute()) {
                $result = $stmt->get_result();

                if ($result->num_rows == 1) {
                    $row = $result->fetch_assoc();
                    
                    // --- 3. Password Verification ---
                    if (password_verify($password, $row['password'])) {
                        
                        // --- 4. Session Creation ---
                        // Store all necessary user data in the session.
                        $_SESSION["loggedin"] = true;
                        $_SESSION["id"] = $row['id'];
                        $_SESSION["username"] = $row['username'];
                        $_SESSION["user_type"] = $row['user_type'];
                        $_SESSION["role_id"] = $row['role_id'];
                        $_SESSION["employee_id"] = $row['employee_id'];
                        $_SESSION["first_name"] = $row['first_name'];
                        $_SESSION["last_name"] = $row['last_name'];

                        // --- 5. Permission Loading ---
                        $permissions = [];
                        if ($row['user_type'] == 'admin') {
                            $permissions[] = 'all';
                        } else {
                            // Fetch permissions for the user's role.
                            $sql_permissions = "SELECT rp.page_name FROM role_permissions rp WHERE rp.role_id = ?";
                            if ($stmt_permissions = $conn->prepare($sql_permissions)) {
                                $stmt_permissions->bind_param("i", $row['role_id']);
                                $stmt_permissions->execute();
                                $result_permissions = $stmt_permissions->get_result();
                                while ($row_permission = $result_permissions->fetch_assoc()) {
                                    $permissions[] = $row_permission['page_name'];
                                }
                                $stmt_permissions->close();
                            }
                        }
                        $_SESSION['permissions'] = $permissions;

                        // --- 6. Role-Based Redirect ---
                        // If user is a Security Officer (assuming role_id 1)
                        if ($row['role_id'] == 1) { // Assuming role_id 1 is Security Officer
                            header("location: report_page.php");
                        } else { // All other roles
                            header("location: dashboard.php");
                        }
                        exit; // Crucial to exit after a header redirect.

                    } else {
                        $login_err = "รหัสผ่านไม่ถูกต้อง";
                    }
                } else {
                    $login_err = "ไม่พบชื่อผู้ใช้นี้ในระบบ";
                }
            } else {
                $login_err = "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้งในภายหลัง";
            }
            $stmt->close();
        }
    }
    // Combine all errors into one for display
    if (!empty($username_err)) {
        $login_err = $username_err;
    } elseif (!empty($password_err)) {
        $login_err = $password_err;
    }
}

$conn->close();
?>
<!DOCTYPE html>
<html>
<head>
	<title>Login</title>
	<link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
	<style>
        @import url('https://fonts.googleapis.com/css?family=Raleway:400,700');

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;	
            font-family: Raleway, sans-serif;
        }

        body {
            background: linear-gradient(90deg, #5DA7FB, #995DFF);		
        }

        .container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }

        .screen {		
            background: linear-gradient(90deg, #995DFF, #5DA7FB);		
            position: relative;	
            height: 600px;
            width: 360px;	
            box-shadow: 0px 0px 24px #5C5696;
        }

        .screen__content {
            z-index: 1;
            position: relative;	
            height: 100%;
        }

        .screen__background {		
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 0;
            -webkit-clip-path: inset(0 0 0 0);
            clip-path: inset(0 0 0 0);	
        }

        .screen__background__shape {
            transform: rotate(45deg);
            position: absolute;
        }

        .screen__background__shape1 {
            height: 520px;
            width: 520px;
            background: #FFF;	
            top: -50px;
            right: 120px;	
            border-radius: 0 72px 0 0;
        }

        .screen__background__shape2 {
            height: 220px;
            width: 220px;
            background: #995DFF;	
            top: -172px;
            right: 0;	
            border-radius: 32px;
        }

        .screen__background__shape3 {
            height: 540px;
            width: 190px;
            background: linear-gradient(270deg, #5DA7FB, #995DFF);
            top: -24px;
            right: 0;	
            border-radius: 32px;
        }

        .screen__background__shape4 {
            height: 400px;
            width: 200px;
            background: #FF195A;	
            top: 420px;
            right: 50px;	
            border-radius: 60px;
        }

        .login {
            width: 320px;
            padding: 30px;
            padding-top: 40px; /* Adjusted position */
        }

        .login__field {
            padding: 20px 0px;	
            position: relative;	
        }

        .login__icon {
            position: absolute;
            top: 30px;
            color: #995DFF;
        }

        .login__input {
            border: none;
            border-bottom: 2px solid #D1D1D4;
            background: none;
            padding: 10px;
            padding-left: 24px;
            font-weight: 700;
            width: 75%;
            transition: .2s;
        }

        .login__input:active,
        .login__input:focus,
        .login__input:hover {
            outline: none;
            border-bottom-color: #FF195A;
        }

        .login__submit {
            background: #fff;
            font-size: 14px;
            margin-top: 20px;
            padding: 16px 20px;
            border-radius: 26px;
            border: 1px solid #D4D3E8;
            text-transform: uppercase;
            font-weight: 700;
            display: flex;
            align-items: center;
            width: 80%; /* Reduced width */
            color: #995DFF;
            box-shadow: 0px 2px 2px #5C5696;
            cursor: pointer;
            transition: .2s;
        }

        .login__submit:active,
        .login__submit:focus,
        .login__submit:hover {
            border-color: #FF195A;
            outline: none;
        }

        .button__icon {
            font-size: 24px;
            margin-left: auto;
            color: #FF195A;
        }

        .social-login {	
            position: absolute;
            height: 140px;
            width: 160px;
            text-align: center;
            bottom: 0px;
            right: 0px;
            color: #fff;
        }

        .social-icons {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .social-login__icon {
            padding: 20px 10px;
            color: #fff;
            text-decoration: none;	
            text-shadow: 0px 0px 8px #7875B5;
        }

        .social-login__icon:hover {
            transform: scale(1.5);	
        }

        .login__error {
            color: #FF195A;
            background: #fff;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
            font-weight: bold;
        }

	</style>
</head>
<body>
<div class="container">
	<div class="screen">
		<div class="screen__content">
            <form class="login" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
                <div style="margin-bottom: 0; padding-top: 20px; margin-left: 0;">
                    <img src="report_assets/Images/western-digital-new-logo.png.thumb.1280.1280.png" alt="Logo" style="width: 200px;">
                </div>

                <?php 
                    if(!empty($login_err)){
                        echo '<div class="login__error">' . htmlspecialchars($login_err) . '</div>';
                    }
                ?>

				<div class="login__field">
					<i class="login__icon fas fa-user"></i>
					<input type="text" name="username" class="login__input" placeholder="Username" value="<?php echo htmlspecialchars($username); ?>">
				</div>
				<div class="login__field">
					<i class="login__icon fas fa-lock"></i>
					<input type="password" name="password" class="login__input" placeholder="Password">
				</div>
				<button class="button login__submit">
					<span class="button__text">Log In Now</span>
					<i class="button__icon fas fa-chevron-right"></i>
				</button>				
			</form>
			<div class="social-login">
				<h3>log in via</h3>
				<div class="social-icons">
					<a href="#" class="social-login__icon fab fa-instagram"></a>
					<a href="#" class="social-login__icon fab fa-facebook"></a>
					<a href="#" class="social-login__icon fab fa-twitter"></a>
				</div>
			</div>
		</div>
		<div class="screen__background">
			<span class="screen__background__shape screen__background__shape4"></span>
			<span class="screen__background__shape screen__background__shape3"></span>		
			<span class="screen__background__shape screen__background__shape2"></span>
			<span class="screen__background__shape screen__background__shape1"></span>
		</div>		
	</div>
</div>
</body>
</html>