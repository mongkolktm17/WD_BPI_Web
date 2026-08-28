/**
 * Staff Management
 * 
 * This file handles all staff-related functionality including:
 * - Loading staff list
 * - Adding new staff
 * - Editing staff
 * - Deleting staff
 * - Filtering and searching
 * 
 * @file staff-management.js
 * @version 1.0
 * @date 2025-12-25
 * @requires utils.js (for formatRelativeTime if needed)
 */

/**
 * Load and display staff data
 * Fetches staff list from server and populates the table
 */
async function loadStaffData() {
    // TODO: Copy from dashboard.php lines ~1602-1750
    // This is a LARGE function that handles:
    // - Fetching staff data from get_staff_list.php
    // - Generating table HTML
    // - Adding edit/delete buttons
    // - Handling pagination (if any)
    // - Error handling

    try {
        const response = await fetch('get_staff_list.php');
        if (!response.ok) throw new Error('Failed to fetch staff data');
        const data = await response.json();

        const staffTableBody = document.getElementById('staff-table-body');
        if (!staffTableBody) return;

        // Clear existing content
        staffTableBody.innerHTML = '';

        if (!data.staff || data.staff.length === 0) {
            staffTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                        No staff members found
                    </td>
                </tr>
            `;
            return;
        }

        // TODO: Copy the complete staff list generation logic
        // This includes:
        // - Loop through staff array
        // - Generate table rows
        // - Add edit/delete buttons
        // - Add event listeners for buttons

        data.staff.forEach((staff, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${index + 1}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${staff.name || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${staff.employee_id || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${staff.role || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${staff.shift || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editStaff(${staff.id})">Edit</button>
                    <button class="text-red-600 hover:text-red-900" onclick="deleteStaff(${staff.id})">Delete</button>
                </td>
            `;
            staffTableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading staff data:', error);
        const staffTableBody = document.getElementById('staff-table-body');
        if (staffTableBody) {
            staffTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-red-500">
                        Error loading staff data. Please try again.
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Edit staff member
 * Opens edit modal or navigates to edit page
 * @param {number} staffId - ID of staff member to edit
 */
function editStaff(staffId) {
    // TODO: Copy from dashboard.php lines ~1752-1800
    // This function handles:
    // - Opening edit modal or redirect to edit page
    // - Populating form with staff data
    // - Handling form submission

    console.log('Edit staff:', staffId);

    // TODO: Implement edit functionality
    // Options:
    // 1. Open modal with edit form
    // 2. Redirect to edit_officer.php?id=staffId
    // 3. Inline editing in table
}

/**
 * Delete staff member
 * Confirms and deletes a staff member
 * @param {number} staffId - ID of staff member to delete
 */
async function deleteStaff(staffId) {
    // TODO: Copy from dashboard.php lines ~1802-1850
    // This function handles:
    // - Confirmation dialog
    // - API call to delete staff
    // - Reload staff data after deletion
    // - Error handling

    if (!confirm('Are you sure you want to delete this staff member?')) {
        return;
    }

    try {
        const response = await fetch(`delete_staff.php?id=${staffId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete staff');

        const result = await response.json();

        if (result.success) {
            alert('Staff member deleted successfully');
            loadStaffData(); // Reload the list
        } else {
            alert('Error: ' + (result.message || 'Failed to delete staff'));
        }
    } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Error deleting staff member. Please try again.');
    }
}

/**
 * Add new staff member
 * Handles form submission for adding new staff
 * @param {FormData} formData - Form data containing staff information
 */
async function addNewStaff(formData) {
    // TODO: Copy from dashboard.php lines ~1852-1900
    // This function handles:
    // - Form validation
    // - API call to add staff
    // - Success/error handling
    // - Reload staff data
    // - Close modal

    try {
        const response = await fetch('add_staff.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to add staff');

        const result = await response.json();

        if (result.success) {
            alert('Staff member added successfully');
            loadStaffData(); // Reload the list
            // Close modal and reset form
            const modal = document.getElementById('add-staff-modal');
            const form = document.getElementById('add-staff-form');
            if (modal) modal.classList.add('hidden');
            if (form) form.reset();
        } else {
            alert('Error: ' + (result.message || 'Failed to add staff'));
        }
    } catch (error) {
        console.error('Error adding staff:', error);
        alert('Error adding staff member. Please try again.');
    }
}

/**
 * Filter staff list
 * Filters the staff table based on search query
 * @param {string} query - Search query
 */
function filterStaff(query) {
    // TODO: Implement client-side filtering (optional)
    // This function can filter the visible table rows
    // based on name, employee ID, role, or shift

    const rows = document.querySelectorAll('#staff-table-body tr');
    const searchLower = query.toLowerCase();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchLower)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * SOURCE LOCATIONS IN dashboard.php:
 * 
 * loadStaffData: Lines ~1602-1750 (LARGEST - ~150 lines)
 * editStaff: Lines ~1752-1800
 * deleteStaff: Lines ~1802-1850
 * addNewStaff: Lines ~1852-1900
 * filterStaff: Optional - implement if needed
 * 
 * INSTRUCTIONS:
 * 1. Copy the complete loadStaffData function - it's the most important
 * 2. Copy edit and delete functions
 * 3. Implement add staff function (may be in modal-handlers.js)
 * 4. Test all CRUD operations
 * 
 * DEPENDENCIES:
 * - Requires get_staff_list.php API endpoint
 * - Requires delete_staff.php API endpoint
 * - Requires add_staff.php API endpoint
 * - DOM elements must exist in dashboard.php
 */
