/**
 * API Fetchers
 * 
 * This file contains all functions that fetch data from the server APIs.
 * Each function updates the corresponding section of the dashboard.
 * 
 * @file api-fetchers.js
 * @version 1.0
 * @date 2025-12-25
 * @requires utils.js (for formatRelativeTime)
 */

/**
 * Fetch and update Security Personnel Status
 * Updates the morning and evening shift counts
 */
async function fetchSecurityStatus() {
    // TODO: Copy from dashboard.php lines ~1383-1425
    // This function fetches security guard counts and updates the UI

    try {
        const response = await fetch('get_security_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Update morning shift
        const morningCountEl = document.getElementById('morning-shift-count');
        const morningContractEl = document.getElementById('morning-shift-contract');
        if (morningCountEl && data.morning_shift !== undefined) {
            morningCountEl.textContent = data.morning_shift;
        }
        if (morningContractEl && data.morning_shift_contract !== undefined) {
            morningContractEl.textContent = data.morning_shift_contract;
        }

        // Update evening shift
        const eveningCountEl = document.getElementById('evening-shift-count');
        const eveningContractEl = document.getElementById('evening-shift-contract');
        if (eveningCountEl && data.evening_shift !== undefined) {
            eveningCountEl.textContent = data.evening_shift;
        }
        if (eveningContractEl && data.evening_shift_contract !== undefined) {
            eveningContractEl.textContent = data.evening_shift_contract;
        }

        // Update last update time
        if (data.last_update) {
            const lastUpdateEl = document.getElementById('security-last-update');
            if (lastUpdateEl) {
                let ds = data.last_update;
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                lastUpdateEl.textContent = formatRelativeTime(ds);
            }
        }
    } catch (error) {
        console.error('Error fetching security status:', error);
    }
}

/**
 * Fetch and update Parking Status
 * Updates the parking lot report counts
 */
async function fetchParkingStatus() {
    // TODO: Copy from dashboard.php lines ~2072-2120
    // This function fetches parking lot data and updates the UI

    try {
        const response = await fetch('get_parking_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Update total vehicles
        const totalEl = document.getElementById('parking-total');
        if (totalEl && data.total_vehicles !== undefined) {
            totalEl.textContent = data.total_vehicles;
        }

        // Update last update time
        if (data.last_update) {
            const lastUpdateEl = document.getElementById('parking-last-update');
            if (lastUpdateEl) {
                let ds = data.last_update;
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                lastUpdateEl.textContent = formatRelativeTime(ds);
            }
        }
    } catch (error) {
        console.error('Error fetching parking status:', error);
    }
}

/**
 * Fetch and update Hand Held Metal Detector Status
 * Updates the detector counts and percentages
 */
async function fetchHandheldStatus() {
    // TODO: Copy from dashboard.php lines ~2122-2170
    // This function fetches handheld detector data and updates the UI

    try {
        const response = await fetch('get_handheld_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Update online/total counts
        const onlineTotalEl = document.getElementById('handheld-online-total');
        const percentageEl = document.getElementById('handheld-percentage');

        if (onlineTotalEl && data.online_count !== undefined && data.total_count !== undefined) {
            onlineTotalEl.textContent = `${data.online_count}/${data.total_count}`;
        }

        const total = Number(data.total_count) || 0;
        const pct = total > 0 ? Math.round((data.online_count / total) * 100) : 0;
        if (percentageEl) percentageEl.textContent = `${pct}%`;

        // Update last update time
        if (data.last_update) {
            const lastUpdateEl = document.getElementById('handheld-last-update');
            if (lastUpdateEl) {
                let ds = data.last_update;
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                lastUpdateEl.textContent = formatRelativeTime(ds);
            }
        }
    } catch (error) {
        console.error('Error fetching handheld status:', error);
    }
}

/**
 * Fetch and update Walkthrough Metal Detector Status
 * Updates the detector counts and percentages
 */
async function fetchWalkthroughStatus() {
    // TODO: Copy from dashboard.php lines ~2172-2216
    // This function fetches walkthrough detector data and updates the UI

    try {
        const response = await fetch('get_walkthrough_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Update online/total counts
        const onlineTotalEl = document.getElementById('walkthrough-online-total');
        const percentageEl = document.getElementById('walkthrough-percentage');

        if (onlineTotalEl && data.online_count !== undefined && data.total_count !== undefined) {
            onlineTotalEl.textContent = `${data.online_count}/${data.total_count}`;
        }

        const total = Number(data.total_count) || 0;
        const pct = total > 0 ? Math.round((data.online_count / total) * 100) : 0;
        if (percentageEl) percentageEl.textContent = `${pct}%`;

        // Update last update time
        if (data.last_update) {
            const lastUpdateEl = document.getElementById('walkthrough-last-update');
            if (lastUpdateEl) {
                let ds = data.last_update;
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                lastUpdateEl.textContent = formatRelativeTime(ds);
            }
        }
    } catch (error) {
        console.error('Error fetching walkthrough status:', error);
    }
}

/**
 * Fetch and update Camera Online Status
 * Dynamically generates HTML for all buildings and NVRs
 */
async function fetchCameraStatus() {
    // TODO: Copy from dashboard.php lines ~2218-2336
    // This is the LARGEST function - handles camera status for all buildings
    // It dynamically generates HTML for each building's NVR status

    try {
        const response = await fetch('get_camera_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        let globalTotal = 0;
        let globalOnline = 0;
        let htmlContent = '';

        // Define building visual styles
        const buildingStyles = {
            'B2': { gradient: 'from-emerald-300 to-teal-400', border: 'border-emerald-200', icon: '🏭' },
            'B3': { gradient: 'from-violet-300 to-purple-400', border: 'border-violet-200', icon: '🏢' },
            'B4': { gradient: 'from-cyan-300 to-sky-400', border: 'border-sky-200', icon: '🏗️' },
            'B9': { gradient: 'from-amber-300 to-orange-400', border: 'border-amber-200', icon: '🧬' }
        };

        // TODO: Copy the complete building/NVR processing logic
        // This includes:
        // - Loop through buildings
        // - Process each NVR
        // - Generate HTML for each card
        // - Calculate percentages
        // - Update global totals

        // Inject HTML into container
        const container = document.getElementById('camera-status-container');
        if (container) {
            container.innerHTML = htmlContent;
        }

        // Update summary stats
        const summaryTotalEl = document.getElementById('camera-summary-online-total');
        const summaryPercentageEl = document.getElementById('camera-summary-percentage');
        const summaryOnlineEl = document.getElementById('camera-summary-online');
        const summaryOfflineEl = document.getElementById('camera-summary-offline');

        const percentage = globalTotal > 0 ? Math.round((globalOnline / globalTotal) * 100) : 0;
        const offline = globalTotal - globalOnline;

        if (summaryTotalEl) summaryTotalEl.textContent = `${globalOnline}/${globalTotal}`;
        if (summaryPercentageEl) summaryPercentageEl.textContent = percentage;
        if (summaryOnlineEl) summaryOnlineEl.textContent = globalOnline;
        if (summaryOfflineEl) summaryOfflineEl.textContent = offline;

        // Update last update time
        if (data.last_update) {
            const lastUpdateEl = document.getElementById('camera-last-update');
            if (lastUpdateEl) {
                let ds = data.last_update;
                if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ds)) ds = ds.replace(' ', 'T');
                lastUpdateEl.textContent = formatRelativeTime(ds);
            }
        }
    } catch (error) {
        console.error('Error fetching camera status:', error);
    }
}

/**
 * SOURCE LOCATIONS IN dashboard.php:
 * 
 * fetchSecurityStatus: Lines ~1383-1425
 * fetchParkingStatus: Lines ~2072-2120
 * fetchHandheldStatus: Lines ~2122-2170
 * fetchWalkthroughStatus: Lines ~2172-2216
 * fetchCameraStatus: Lines ~2218-2336 (LARGEST - ~120 lines)
 * 
 * INSTRUCTIONS:
 * 1. Copy each function completely from dashboard.php
 * 2. Make sure to include all error handling
 * 3. The fetchCameraStatus function is the largest and most complex
 * 4. Test each function individually after copying
 * 
 * DEPENDENCIES:
 * - Requires formatRelativeTime() from utils.js
 * - All functions are async and use fetch API
 */
