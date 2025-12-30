/**
 * Modal Handlers
 * 
 * This file handles all modal-related functionality including:
 * - Settings modal (User Profile, Staff Management, Role Management)
 * - Add Staff modal
 * - Modal open/close events
 * 
 * @file modal-handlers.js
 * @version 1.0
 * @date 2025-12-25
 * @requires staff-management.js (for loadStaffData)
 */

/**
 * Initialize Settings Modal
 * Sets up event listeners for opening/closing the settings modal
 * and switching between tabs
 */
function initializeSettingsModal() {
    // TODO: Copy from dashboard.php lines ~1427-1500
    // This function handles:
    // - Settings button click
    // - Modal close button click
    // - Tab switching (User Profile, Staff Management, Role Management)
    // - Click outside modal to close

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal');

    // Open modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.classList.remove('hidden');
                // Load staff data when opening Staff Management tab
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab && activeTab.dataset.tab === 'staff') {
                    loadStaffData();
                }
            }
        });
    }

    // Close modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });
    }

    // Close on outside click
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });
    }

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active', 'border-blue-500', 'text-blue-600'));
            btn.classList.add('active', 'border-blue-500', 'text-blue-600');

            // Update active tab content
            tabContents.forEach(content => {
                if (content.id === `${targetTab}-tab`) {
                    content.classList.remove('hidden');
                    // Load staff data when switching to staff tab
                    if (targetTab === 'staff') {
                        loadStaffData();
                    }
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });
}

/**
 * Initialize Add Staff Modal
 * Sets up event listeners for the add staff modal
 */
function initializeAddStaffModal() {
    // TODO: Copy from dashboard.php lines ~1502-1550
    // This function handles:
    // - Add Staff button click
    // - Modal close button click
    // - Form submission
    // - Click outside modal to close

    const addStaffBtn = document.getElementById('add-staff-btn');
    const addStaffModal = document.getElementById('add-staff-modal');
    const closeAddStaffBtns = document.querySelectorAll('.close-add-staff');
    const addStaffForm = document.getElementById('add-staff-form');

    // Open modal
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', () => {
            if (addStaffModal) {
                addStaffModal.classList.remove('hidden');
            }
        });
    }

    // Close modal
    closeAddStaffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (addStaffModal) {
                addStaffModal.classList.add('hidden');
                if (addStaffForm) addStaffForm.reset();
            }
        });
    });

    // Close on outside click
    if (addStaffModal) {
        addStaffModal.addEventListener('click', (e) => {
            if (e.target === addStaffModal) {
                addStaffModal.classList.add('hidden');
                if (addStaffForm) addStaffForm.reset();
            }
        });
    }

    // Form submission
    if (addStaffForm) {
        addStaffForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // TODO: Copy form submission logic
            // This includes:
            // - Get form values
            // - Send to server
            // - Handle response
            // - Reload staff data
            // - Close modal

            const name = document.getElementById('new-staff-name').value;
            const employeeId = document.getElementById('new-staff-id').value;
            const role = document.getElementById('new-staff-role').value;
            const shift = document.getElementById('new-staff-shift').value;

            console.log('Add staff:', { name, employeeId, role, shift });

            // TODO: Implement actual API call
            // After successful add, reload staff data and close modal
        });
    }
}

/**
 * Initialize Profile Update Form
 * Sets up event listener for profile update form submission
 */
function initializeProfileUpdate() {
    // TODO: Copy from dashboard.php lines ~1552-1600
    // This function handles:
    // - Profile form submission
    // - Password validation
    // - API call to update profile
    // - Success/error handling

    const profileForm = document.getElementById('profile-form');

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // TODO: Copy profile update logic
            // This includes:
            // - Get form values
            // - Validate passwords match
            // - Send to server
            // - Handle response
            // - Show success/error message

            const formData = new FormData(profileForm);

            console.log('Update profile');

            // TODO: Implement actual API call
        });
    }
}

/**
 * SOURCE LOCATIONS IN dashboard.php:
 * 
 * initializeSettingsModal: Lines ~1427-1500
 * initializeAddStaffModal: Lines ~1502-1550
 * initializeProfileUpdate: Lines ~1552-1600
 * 
 * INSTRUCTIONS:
 * 1. Copy the complete event listener setup for each modal
 * 2. Make sure to include all tab switching logic
 * 3. Include form validation and submission logic
 * 4. Test modal open/close functionality
 * 
 * DEPENDENCIES:
 * - Requires loadStaffData() from staff-management.js
 * - DOM elements must exist in dashboard.php
 */
