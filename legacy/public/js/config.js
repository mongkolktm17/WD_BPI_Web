/**
 * Dashboard Configuration
 * 
 * This file contains all configuration settings for the dashboard.
 * 
 * @file config.js
 * @version 1.0
 * @date 2025-12-25
 */

/**
 * Default configuration object
 * Contains all text labels and settings for the dashboard
 */
const defaultConfig = {
    dashboard_title: "Security System Dashboard",
    company_name: "BPI Western Digital Storage Technologies (Thailand) Ltd.",
    security_section_title: "Security Personnel Status",
    nvr_section_title: "NVR Recording Status",
    camera_section_title: "Camera Online Status",
    parking_section_title: "Parking Lot Report",
    detector_section_title: "Hand Held Metal Detector Status",
    walkthrough_section_title: "Walkthrough Metal Detector Status",
    // User information will be set from PHP
    user_name: "",
    user_role: ""
};

/**
 * SOURCE LOCATION IN dashboard.php:
 * Lines: 1304-1315
 * 
 * TODO: Copy the configuration object from dashboard.php
 * The user_name and user_role values are set from PHP variables
 * You'll need to keep those PHP tags in dashboard.php
 */
