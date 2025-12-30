/**
 * Dashboard Main
 * 
 * This is the main initialization file for the dashboard.
 * It coordinates all other modules and sets up the initial state.
 * 
 * @file dashboard.js
 * @version 1.0
 * @date 2025-12-25
 * @requires config.js
 * @requires utils.js
 * @requires api-fetchers.js
 * @requires modal-handlers.js
 * @requires staff-management.js
 */

/**
 * Initialize the dashboard
 * This function is called when the DOM is fully loaded
 */
function initializeDashboard() {
    console.log('Initializing WD Security Dashboard...');

    // Initialize time display
    updateTime();
    setInterval(updateTime, 1000); // Update every second

    // Initialize modals
    initializeSettingsModal();
    initializeAddStaffModal();
    initializeProfileUpdate();

    // Initial data fetch
    console.log('Fetching initial data...');
    fetchSecurityStatus();
    fetchCameraStatus();
    fetchParkingStatus();
    fetchHandheldStatus();
    fetchWalkthroughStatus();

    // Set up periodic updates (every 60 seconds)
    console.log('Setting up periodic updates...');
    setInterval(fetchSecurityStatus, 60000);
    setInterval(fetchCameraStatus, 60000);
    setInterval(fetchParkingStatus, 60000);
    setInterval(fetchHandheldStatus, 60000);
    setInterval(fetchWalkthroughStatus, 60000);

    console.log('Dashboard initialized successfully!');
}

/**
 * DOM Content Loaded Event
 * Wait for DOM to be ready before initializing
 */
document.addEventListener('DOMContentLoaded', initializeDashboard);

/**
 * SOURCE LOCATIONS IN dashboard.php:
 * 
 * Main initialization: Lines ~2338-2351
 * 
 * INSTRUCTIONS:
 * 1. This file is mostly complete
 * 2. Copy the interval setup from dashboard.php
 * 3. Make sure all function calls match the function names in other files
 * 4. Test that everything initializes correctly
 * 
 * LOAD ORDER (IMPORTANT!):
 * This file must be loaded LAST, after all dependencies:
 * 1. config.js
 * 2. utils.js
 * 3. api-fetchers.js
 * 4. modal-handlers.js
 * 5. staff-management.js
 * 6. dashboard.js (this file)
 * 7. sdk-loader.js (optional, can be last)
 */
