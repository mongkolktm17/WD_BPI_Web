/**
 * Utility Functions
 * 
 * This file contains helper functions used throughout the dashboard.
 * 
 * @file utils.js
 * @version 1.0
 * @date 2025-12-25
 */

/**
 * Format a date string as relative time (e.g., "2 hours ago")
 * @param {string} dateString - ISO date string or MySQL datetime
 * @returns {string} Formatted relative time
 */
function formatRelativeTime(dateString) {
    // TODO: Copy from dashboard.php lines ~1355-1380
    // This function converts dates to "X minutes/hours/days ago" format

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour < 24) return `${diffHour} hours ago`;
    return `${diffDay} days ago`;
}

/**
 * Update the shift status display based on current time
 * @param {Date} now - Current date/time
 */
function updateShiftStatus(now) {
    // TODO: Copy from dashboard.php lines ~1317-1334
    // This function updates the shift status (Day/Night) based on time

    const currentHour = now.getHours();
    const currentShiftStatusElement = document.getElementById('current-shift-status');
    const shiftChangeTimeElement = document.getElementById('shift-change-time');

    if (!currentShiftStatusElement || !shiftChangeTimeElement) return;

    if (currentHour >= 6 && currentHour < 18) {
        // Day Shift (06:00 - 18:00)
        currentShiftStatusElement.textContent = 'Day Shift Active';
        currentShiftStatusElement.className = 'text-sm font-medium text-green-600';
        shiftChangeTimeElement.textContent = 'Next change: 18:00';
    } else {
        // Night Shift (18:00 - 06:00)
        currentShiftStatusElement.textContent = 'Night Shift Active';
        currentShiftStatusElement.className = 'text-sm font-medium text-indigo-600';
        shiftChangeTimeElement.textContent = 'Next change: 06:00';
    }
}

/**
 * Update the time display and shift status
 * Called every second to keep the clock updated
 */
function updateTime() {
    // TODO: Copy from dashboard.php lines ~1337-1353
    // This function updates the clock display

    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const currentTimeEl = document.getElementById('current-time');
    const lastUpdatedEl = document.getElementById('last-updated');

    if (currentTimeEl) currentTimeEl.textContent = timeString;
    if (lastUpdatedEl) lastUpdatedEl.textContent = timeString;

    // Update shift status based on current time
    updateShiftStatus(now);
}

/**
 * SOURCE LOCATIONS IN dashboard.php:
 * 
 * formatRelativeTime: Lines ~1355-1380
 * updateShiftStatus: Lines 1317-1334
 * updateTime: Lines 1337-1353
 * 
 * INSTRUCTIONS:
 * 1. Copy the complete formatRelativeTime function
 * 2. Copy the complete updateShiftStatus function
 * 3. Copy the complete updateTime function
 * 4. Make sure all functions are standalone (no dependencies on other code)
 */
