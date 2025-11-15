# WD Security Dashboard

## Project Overview

The WD Security Dashboard is a web-based application designed to provide a centralized monitoring interface for various security aspects within a facility. It offers real-time insights into NVR recording status, security personnel deployment, parking lot occupancy, and the operational status of metal detectors.

## Features

*   **Daily NVR Report:** Track and report the recording days for each NVR, with visual indicators (green/red) based on a 62-day retention target.
*   **NVR Status Summary:** Overview of NVRs meeting the 62-day recording criteria, displayed with progress bars per building (B.2, B.3, B.4, B.8).
*   **Security Personnel Status:** Monitor day and night shift security staff counts and overall active personnel.
*   **Parking Lot Report:** View real-time occupancy for car and motorcycle parking areas, including total available slots and occupied spaces.
*   **Metal Detector Status:** Check the operational status of Hand Held and Walkthrough Metal Detectors, including battery, LED, detection range, and audio alerts.
*   **User Authentication:** Secure login and role-based access (admin/user).
*   **Report History:** View and manage past NVR reports.

## Technologies Used

*   **Backend:** PHP
*   **Database:** MySQL
*   **Frontend:** HTML, CSS (Tailwind CSS), JavaScript
*   **Web Server:** Apache (typically with XAMPP)

## Installation and Setup

To set up the WD Security Dashboard locally, follow these steps:

1.  **Prerequisites:**
    *   Install XAMPP (or a similar Apache/MySQL/PHP stack) on your system.
    *   Ensure MySQL and Apache services are running.

2.  **Clone the Repository:**
    *   Place the project files into your XAMPP `htdocs` directory (e.g., `c:\xampp\htdocs\wd`).

3.  **Database Setup:**
    *   Open phpMyAdmin (usually accessible via `http://localhost/phpmyadmin`).
    *   Create a new database (e.g., `wd_security_db`).
    *   Import your database schema and initial data. (You will need to provide your `wd_security_db.sql` file if available, or create tables manually based on the application's needs, e.g., `users`, `cctv_devices`, `cctv_reports`, `cctv_report_details`).

4.  **Configuration:**
    *   Edit `config.php` in the project root to match your database credentials:
        ```php
        <?php
        define('DB_SERVER', 'localhost');
        define('DB_USERNAME', 'your_db_username'); // e.g., root
        define('DB_PASSWORD', 'your_db_password'); // e.g., empty for XAMPP root
        define('DB_NAME', 'wd_security_db');

        $conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

        if ($conn->connect_error) {
            die("Connection failed: " . $conn->connect_error);
        }

        session_start();
        ?>
        ```
    *   Update `your_db_username` and `your_db_password` accordingly.

5.  **Access the Dashboard:**
    *   Open your web browser and navigate to `http://localhost/wd/dashboard.php` (or the appropriate URL if you placed it in a different subdirectory).
    *   Log in using your credentials (default admin credentials might be `admin`/`password` if provided in your database setup).

## Usage

*   **Dashboard:** Provides an overview of all security statuses.
*   **Daily NVR Report (`nvr_recording_days.php`):** Submit daily reports on NVR recording durations.
*   **Report Page (`report_page.php`):** Access various detailed reports.
*   **Manage Officers/Roles (`manage_officers.php`, `manage_roles.php`):** Admin functionalities for user and role management.

## Contributing

If you wish to contribute to this project, please fork the repository and submit a pull request with your proposed changes.

## License

[Specify your project's license here, e.g., MIT License]
