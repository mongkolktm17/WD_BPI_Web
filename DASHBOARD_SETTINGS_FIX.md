# แก้ไข System Settings ใน dashboard.php

## ปัญหาที่พบ:
1. **User Profile**: ไม่มีฟิลด์เปลี่ยนรหัสผ่าน และข้อมูลเป็น hardcoded
2. **Staff Management**: แสดงข้อมูล placeholder แทนข้อมูลจริงจาก database

## วิธีแก้ไข:

### 1. แก้ไข User Profile Tab (บรรทัด 1049-1094)

**เพิ่มฟิลด์เปลี่ยนรหัสผ่าน** หลังบรรทัด 1089 (ก่อน closing div):

```html
<!-- Add Password Change Section -->
<div class="col-span-2 mt-6 pt-6 border-t border-gray-200">
    <h5 class="text-md font-semibold text-gray-800 mb-4">Change Password</h5>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <input type="password" id="current-password" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input type="password" id="new-password" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input type="password" id="confirm-password" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
    </div>
    <div class="mt-4">
        <button id="change-password-btn" 
            class="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md transition-colors">
            Change Password
        </button>
    </div>
</div>
```

**แก้ไข JavaScript** (บรรทัด 1686-1697) เปลี่ยนจาก:

```javascript
// Profile save functionality
document.getElementById('save-profile').addEventListener('click', () => {
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const department = document.getElementById('profile-department').value;
    const phone = document.getElementById('profile-phone').value;

    // Update header display
    document.getElementById('user-name').textContent = name;

    showNotification('Profile updated successfully!', 'success');
});
```

เป็น:

```javascript
// Load user profile data
async function loadUserProfile() {
    try {
        const response = await fetch('update_profile.php');
        const result = await response.json();
        
        if (result.status === 'success') {
            const data = result.data;
            const fullName = `${data.first_name} ${data.last_name}`;
            document.getElementById('profile-name').value = fullName;
            document.getElementById('profile-email').value = data.email || '';
            document.getElementById('profile-phone').value = data.phone || '';
            document.getElementById('profile-department').value = data.department || 'security';
            document.getElementById('profile-employee-id').value = data.employee_id || '';
            
            // Update last login if available
            if (data.last_login) {
                const lastLoginDate = new Date(data.last_login);
                const formattedLogin = lastLoginDate.toLocaleString('th-TH');
                document.querySelector('[readonly][value*="Today"]').value = formattedLogin;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Profile save functionality
document.getElementById('save-profile').addEventListener('click', async () => {
    const fullName = document.getElementById('profile-name').value;
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');
    const email = document.getElementById('profile-email').value;
    const department = document.getElementById('profile-department').value;
    const phone = document.getElementById('profile-phone').value;

    const formData = new FormData();
    formData.append('action', 'update_profile');
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    formData.append('email', email);
    formData.append('department', department);
    formData.append('phone', phone);

    try {
        const response = await fetch('update_profile.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            // Update header display
            document.getElementById('user-name').textContent = fullName;
            showNotification('Profile updated successfully!', 'success');
        } else {
            showNotification(result.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        showNotification('Error updating profile', 'error');
    }
});

// Change password functionality
document.getElementById('change-password-btn').addEventListener('click', async () => {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill in all password fields', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'change_password');
    formData.append('current_password', currentPassword);
    formData.append('new_password', newPassword);
    formData.append('confirm_password', confirmPassword);

    try {
        const response = await fetch('update_profile.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            showNotification('Password changed successfully!', 'success');
            // Clear password fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } else {
            showNotification(result.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        showNotification('Error changing password', 'error');
    }
});

// Load profile when modal opens
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    loadUserProfile();
});
```

### 2. แก้ไข Staff Management Tab (บรรทัด 1122-1165)

**แทนที่ tbody ที่มี hardcoded data** ด้วย:

```html
<tbody id="staff-list" class="divide-y divide-gray-200">
    <!-- Staff data will be loaded dynamically -->
    <tr>
        <td colspan="6" class="px-4 py-8 text-center text-gray-500">
            <div class="animate-spin inline-block w-6 h-6 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-2"></div>
            <p>Loading staff data...</p>
        </td>
    </tr>
</tbody>
```

**เพิ่ม JavaScript สำหรับโหลดข้อมูล staff** (หลังบรรทัด 1697):

```javascript
// Load staff list
async function loadStaffList() {
    try {
        const response = await fetch('get_staff_list.php');
        const result = await response.json();
        
        if (result.status === 'success') {
            const staffList = document.getElementById('staff-list');
            staffList.innerHTML = '';
            
            if (result.data.length === 0) {
                staffList.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                            No staff members found
                        </td>
                    </tr>
                `;
                return;
            }
            
            result.data.forEach(staff => {
                const statusClass = staff.status === 'active' ? 
                    'bg-green-100 text-green-800' : 
                    'bg-yellow-100 text-yellow-800';
                const statusText = staff.status === 'active' ? 'Active' : 'On Leave';
                
                const row = document.createElement('tr');
                row.className = 'bg-white';
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-gray-900">${staff.name}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${staff.employee_id}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${staff.role}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${staff.shift}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <a href="edit_officer.php?officer_id=${staff.id}" 
                            class="text-blue-600 hover:text-blue-800 mr-3">Edit</a>
                        <button class="text-red-600 hover:text-red-800 delete-staff-btn" 
                            data-id="${staff.id}">Delete</button>
                    </td>
                `;
                staffList.appendChild(row);
            });
            
            // Add delete event listeners
            document.querySelectorAll('.delete-staff-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const staffId = btn.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this staff member?')) {
                        // Implement delete functionality here
                        showNotification('Delete functionality to be implemented', 'info');
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error loading staff list:', error);
        const staffList = document.getElementById('staff-list');
        staffList.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-red-500">
                    Error loading staff data
                </td>
            </tr>
        `;
    }
}

// Load staff list when switching to staff tab
document.querySelector('[data-tab="staff"]').addEventListener('click', () => {
    loadStaffList();
});
```

## ไฟล์ที่สร้างแล้ว:
1. ✅ `update_profile.php` - API สำหรับจัดการ profile และเปลี่ยนรหัสผ่าน
2. ✅ `get_staff_list.php` - API สำหรับดึงรายชื่อพนักงาน

## การทดสอบ:
1. เปิด dashboard.php
2. คลิกปุ่ม Settings (⚙️)
3. ตรวจสอบว่า:
   - User Profile แสดงข้อมูลจริงจาก database
   - มีฟิลด์เปลี่ยนรหัสผ่าน
   - Staff Management แสดงข้อมูลพนักงานจริง (97 คน)
