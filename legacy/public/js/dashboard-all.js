/**
 * Dashboard JavaScript - Consolidated & Cleaned
 */

// Configuration object
const defaultConfig = {
    dashboard_title: "Security System Dashboard",
    company_name: "BPI Western Digital Storage Technologies (Thailand) Ltd.",
    security_section_title: "Security Personnel Status",
    nvr_section_title: "NVR Recording Status",
    camera_section_title: "Camera Online Status",
    parking_section_title: "Parking Lot Report",
    detector_section_title: "Hand Held Metal Detector Status",
    walkthrough_section_title: "Walkthrough Metal Detector Status",
    user_name: "User",
    user_role: "Role"
};

let serverTimeOffset = 0;
let timeSynced = false;

// Helper: Format Relative Time
function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';

    // Ensure the date string is parsed as Bangkok time (+07:00)
    let ds = dateString;
    if (ds.includes(' ') && !ds.includes('T')) ds = ds.replace(' ', 'T');
    if (!ds.includes('+') && !ds.includes('Z')) ds += '+07:00';

    const date = new Date(ds);
    if (isNaN(date.getTime())) return 'Invalid Date';

    // Use synchronized server time for comparison
    const now = new Date(Date.now() + serverTimeOffset);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return date.toLocaleString('en-US');
}

// Helper: Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-white'
    };

    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full ${colors[type]}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.classList.remove('translate-x-full');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ---------------------------------------------------------
// Time & Shift Status
// ---------------------------------------------------------

function updateShiftStatus(now) {
    const currentHour = now.getHours();
    const currentShiftStatusElement = document.getElementById('current-shift-status');
    const shiftChangeTimeElement = document.getElementById('shift-change-time');

    if (!currentShiftStatusElement || !shiftChangeTimeElement) return;

    if (currentHour >= 6 && currentHour < 18) {
        currentShiftStatusElement.textContent = 'Day Shift Active';
        currentShiftStatusElement.className = 'text-sm font-medium text-green-600';
        shiftChangeTimeElement.textContent = 'Next change: 18:00';
    } else {
        currentShiftStatusElement.textContent = 'Night Shift Active';
        currentShiftStatusElement.className = 'text-sm font-medium text-indigo-600';
        shiftChangeTimeElement.textContent = 'Next change: 06:00';
    }
}

let lastSyncTime = 0;

async function updateTime() {
    try {
        const now = Date.now();
        // Only fetch from server every 5 minutes to reduce load, or on first run
        if (!timeSynced || (now - lastSyncTime > 300000)) {
            lastSyncTime = now;
            const response = await fetch('get_server_time.php');
            const data = await response.json();

            if (data.status === 'success') {
                const serverTimestamp = data.timestamp * 1000;
                serverTimeOffset = serverTimestamp - Date.now();
                timeSynced = true;
            }
        }

        const currentDate = new Date(Date.now() + serverTimeOffset);
        const timeString = currentDate.toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true
        }) + (timeSynced ? '' : ' (Client Time)');

        const currentTimeEl = document.getElementById('current-time');
        const lastUpdatedEl = document.getElementById('last-updated');

        if (currentTimeEl) currentTimeEl.textContent = timeString;
        if (lastUpdatedEl) lastUpdatedEl.textContent = timeString;

        updateShiftStatus(currentDate);
        updateSectionTimestamps(timeString);

    } catch (error) {
        if (!timeSynced) {
            console.warn('Error fetching server time, falling back to client time:', error);
            const fallbackDate = new Date();
            const timeString = fallbackDate.toLocaleString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true
            }) + ' (Client Time)';

            const currentTimeEl = document.getElementById('current-time');
            const lastUpdatedEl = document.getElementById('last-updated');

            if (currentTimeEl) currentTimeEl.textContent = timeString;
            if (lastUpdatedEl) lastUpdatedEl.textContent = timeString;

            updateShiftStatus(fallbackDate);
            updateSectionTimestamps(timeString);
        }
    }
}

function updateSectionTimestamps(timeString) {
    // Only update generic timestamps if needed, specific sections handle their own 'last_update' usually
    // But we'll keep this as a fallback if specific ones fail
}

// ---------------------------------------------------------
// Data Fetching Functions
// ---------------------------------------------------------

// 1. Security Status
async function fetchSecurityStatus() {
    try {
        const response = await fetch('get_security_status.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        const formatDisplay = (actual, contract) => {
            const actualNum = Number(actual) || 0;
            const contractNum = contract !== null ? Number(contract) : null;
            if (contractNum === null) return `<span class="text-green-500">${actualNum}</span>`;
            const colorClass = actualNum < contractNum ? 'text-orange-500' : 'text-green-500';
            return `<span class="${colorClass}">${actualNum}</span><span class="text-blue-400 text-2xl"> / ${contractNum}</span>`;
        };

        const dayShiftCountElement = document.getElementById('day-shift-count');
        if (dayShiftCountElement) dayShiftCountElement.innerHTML = formatDisplay(data.morning_shift, data.morning_shift_contract);

        const nightShiftCountElement = document.getElementById('night-shift-count');
        if (nightShiftCountElement) nightShiftCountElement.innerHTML = formatDisplay(data.evening_shift, data.evening_shift_contract);

        const currentShiftCountElement = document.getElementById('current-shift-count');
        if (currentShiftCountElement) { // Not present in dashboard.php?
            // pass
        }

        // Total Active Update (Manual calculation)
        const totalActiveEl = document.getElementById('total-shift-count');
        if (totalActiveEl) {
            const mActual = Number(data.morning_shift) || 0;
            const eActual = Number(data.evening_shift) || 0;
            const totalActual = mActual + eActual;

            let totalContract = null;
            if (data.morning_shift_contract !== null || data.evening_shift_contract !== null) {
                totalContract = (Number(data.morning_shift_contract) || 0) + (Number(data.evening_shift_contract) || 0);
            }

            if (totalContract === null) {
                totalActiveEl.innerHTML = `<span class="text-green-500">${totalActual}</span>`;
            } else {
                const color = totalActual < totalContract ? 'text-orange-500' : 'text-green-500';
                totalActiveEl.innerHTML = `<span class="${color}">${totalActual}</span><span class="text-blue-400 text-2xl"> / ${totalContract}</span>`;
            }
        }

        const securityLastUpdateElement = document.getElementById('security-last-update');
        if (data.last_update && securityLastUpdateElement) {
            securityLastUpdateElement.textContent = formatRelativeTime(data.last_update);
        }

    } catch (error) {
        console.error('Error fetching security status:', error);
    }
}

// 2. Parking Status
function formatNumber(n) {
    return n.toLocaleString();
}

function lotBarColor(pct) {
    if (pct >= 75) return 'bg-red-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-green-500';
}

async function fetchParkingStatus() {
    try {
        const response = await fetch('get_parking_status.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Car summary
        const carTotalEl = document.getElementById('car-parking-total');
        if (carTotalEl) carTotalEl.textContent = `${formatNumber(data.total_car_occupied)} / ${formatNumber(data.total_car_slots)}`;

        const carPct = data.total_car_slots > 0 ? Math.round((data.total_car_occupied / data.total_car_slots) * 100) : 0;
        const carPctEl = document.getElementById('car-parking-percentage');
        if (carPctEl) carPctEl.textContent = `${carPct}%`;

        const carBarEl = document.getElementById('car-parking-bar');
        if (carBarEl) {
            carBarEl.style.width = `${Math.min(100, carPct)}%`;
            carBarEl.className = `h-2 rounded-full transition-all duration-500 ${lotBarColor(carPct)}`;
        }

        // Motorcycle summary
        const motoTotalEl = document.getElementById('motorcycle-parking-total');
        if (motoTotalEl) motoTotalEl.textContent = `${formatNumber(data.total_motorcycle_occupied)} / ${formatNumber(data.total_motorcycle_slots)}`;

        const motoPct = data.total_motorcycle_slots > 0 ? Math.round((data.total_motorcycle_occupied / data.total_motorcycle_slots) * 100) : 0;
        const motoPctEl = document.getElementById('motorcycle-parking-percentage');
        if (motoPctEl) motoPctEl.textContent = `${motoPct}%`;

        const motoBarEl = document.getElementById('motorcycle-parking-bar');
        if (motoBarEl) {
            motoBarEl.style.width = `${Math.min(100, motoPct)}%`;
            motoBarEl.className = `h-2 rounded-full transition-all duration-500 ${lotBarColor(motoPct)}`;
        }

        // Car lots
        if (data.car_lots_data) {
            data.car_lots_data.forEach(lot => {
                const lotNameId = lot.name.replace(/[^a-zA-Z0-9]/g, '-');
                const statusElement = document.getElementById(`car-lot-${lotNameId}-status`);
                const barElement = document.getElementById(`car-lot-${lotNameId}-bar`);
                const cappedPct = Math.min(100, lot.percentage);
                if (statusElement) statusElement.textContent = `${lot.occupied}/${lot.capacity}`;
                if (barElement) {
                    barElement.style.width = `${cappedPct}%`;
                    barElement.className = `h-1 rounded-full transition-all duration-500 ${lotBarColor(cappedPct)}`;
                }
            });
        }

        // Motorcycle lots
        if (data.motorcycle_lots_data) {
            data.motorcycle_lots_data.forEach(lot => {
                const lotNameId = lot.name.replace(/[^a-zA-Z0-9]/g, '-');
                const statusElement = document.getElementById(`motorcycle-lot-${lotNameId}-status`);
                const barElement = document.getElementById(`motorcycle-lot-${lotNameId}-bar`);
                const cappedPct = Math.min(100, lot.percentage);
                if (statusElement) statusElement.textContent = `${lot.occupied}/${lot.capacity}`;
                if (barElement) {
                    barElement.style.width = `${cappedPct}%`;
                    barElement.className = `h-1 rounded-full transition-all duration-500 ${lotBarColor(cappedPct)}`;
                }
            });
        }

        const parkingLastUpdateElement = document.getElementById('parking-last-update');
        if (parkingLastUpdateElement && data.last_update) {
            parkingLastUpdateElement.textContent = formatRelativeTime(data.last_update);
        }

    } catch (err) {
        console.error('Error fetching parking status:', err);
    }
}

// 3. NVR Recording Status
async function fetchNVRRecordingStatus() {
    try {
        const response = await fetch('get_nvr_recording_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        const totalPassed = data.total_passed;
        const totalNVRs = data.total_nvrs;
        const percentage = totalNVRs > 0 ? Math.round((totalPassed / totalNVRs) * 100) : 0;
        const totalFailed = totalNVRs - totalPassed;

        const summaryCountEl = document.getElementById('nvr-summary-count');
        const summaryPercentageEl = document.getElementById('nvr-summary-percentage');
        const passedCountEl = document.getElementById('nvr-passed-count');
        const failedCountEl = document.getElementById('nvr-failed-count');

        if (summaryCountEl) summaryCountEl.textContent = `${totalPassed}/${totalNVRs}`;
        if (summaryPercentageEl) summaryPercentageEl.textContent = percentage;
        if (passedCountEl) passedCountEl.textContent = totalPassed;
        if (failedCountEl) failedCountEl.textContent = totalFailed;

        if (data.last_update) {
            const lastUpdateEl = document.getElementById('nvr-last-update');
            if (lastUpdateEl) lastUpdateEl.textContent = formatRelativeTime(data.last_update);
        }

    } catch (error) {
        console.error('Error fetching NVR recording status:', error);
    }
}

// 4. Handheld Status
async function fetchHandheldStatus() {
    try {
        const response = await fetch('get_handheld_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Update total reports
        const totalReportsEl = document.getElementById('hh-total-reports');
        if (totalReportsEl) totalReportsEl.textContent = data.total_reports || 0;

        // Update pass/fail counts per item and card styling
        const items = ['battery', 'led', 'detection', 'alarm'];
        let totalPass = 0, totalFail = 0;

        items.forEach(item => {
            const s = data.summary ? data.summary[item] : null;
            const pass = s ? s.pass : 0;
            const fail = s ? s.fail : 0;
            totalPass += pass;
            totalFail += fail;

            const passEl = document.getElementById(`hh-${item}-pass`);
            const failEl = document.getElementById(`hh-${item}-fail`);
            if (passEl) passEl.textContent = pass;
            if (failEl) failEl.textContent = fail;

            // Update card styling based on fail count
            const cardEl = document.getElementById(`hh-${item}-card`);
            if (cardEl) {
                if (fail > 0) {
                    cardEl.className = 'p-2 rounded-xl border border-red-200 bg-red-50';
                } else {
                    cardEl.className = 'p-2 rounded-xl border border-green-200 bg-green-50';
                }
            }
        });

        // Update totals
        const totalPassEl = document.getElementById('hh-total-pass');
        const totalFailEl = document.getElementById('hh-total-fail');
        if (totalPassEl) totalPassEl.textContent = totalPass;
        if (totalFailEl) totalFailEl.textContent = totalFail;

        if (data.last_update) {
            const lastUpdateEl = document.getElementById('detector-last-update');
            if (lastUpdateEl) lastUpdateEl.textContent = formatRelativeTime(data.last_update);
        }

    } catch (error) {
        console.error('Error fetching handheld status:', error);
    }
}

// 5. Walkthrough Status
async function fetchWalkthroughStatus() {
    try {
        const response = await fetch('get_walkthrough_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Update total reports
        const totalReportsEl = document.getElementById('wt-total-reports');
        if (totalReportsEl) totalReportsEl.textContent = data.total_reports || 0;

        // Render zone cards with pass/fail/other counts
        const container = document.getElementById('walkthrough-zones-container');
        if (container && data.summary) {
            container.innerHTML = '';
            let grandTotalPass = 0, grandTotalFail = 0, grandTotalOther = 0;

            for (let i = 1; i <= 6; i++) {
                const zoneKey = `zone${i}`;
                const s = data.summary[zoneKey] || { pass: 0, fail: 0, other: 0 };
                grandTotalPass += s.pass;
                grandTotalFail += s.fail;
                grandTotalOther += s.other;

                // Determine card color based on current status from latest report
                let borderColor = 'border-green-200';
                let bgColor = 'bg-green-50';
                const currentZone = data.zones ? data.zones[i] : null;
                if (currentZone) {
                    if (currentZone.type === 'offline') {
                        borderColor = 'border-red-200';
                        bgColor = 'bg-red-50';
                    } else if (currentZone.type === 'maintenance') {
                        borderColor = 'border-yellow-200';
                        bgColor = 'bg-yellow-50';
                    }
                }

                const html = `
                    <div class="text-center p-2 ${bgColor} rounded-xl border ${borderColor}">
                        <h4 class="text-xs font-bold text-blue-900 mb-1">Zone ${i}</h4>
                        <div class="flex items-center justify-center gap-2">
                            <div class="text-center">
                                <div class="text-sm font-black text-green-600">${s.pass}</div>
                                <div class="text-[9px] text-green-700 font-semibold">Pass</div>
                            </div>
                            <div class="text-slate-300 text-sm font-light">/</div>
                            <div class="text-center">
                                <div class="text-sm font-black text-red-500">${s.fail}</div>
                                <div class="text-[9px] text-red-600 font-semibold">Fail</div>
                            </div>
                            ${s.other > 0 ? `
                            <div class="text-slate-300 text-sm font-light">/</div>
                            <div class="text-center">
                                <div class="text-sm font-black text-yellow-500">${s.other}</div>
                                <div class="text-[9px] text-yellow-600 font-semibold">Other</div>
                            </div>` : ''}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            }

            // Update summary totals
            const wtTotalPass = document.getElementById('wt-total-pass');
            const wtTotalFail = document.getElementById('wt-total-fail');
            const wtTotalOther = document.getElementById('wt-total-other');
            if (wtTotalPass) wtTotalPass.textContent = grandTotalPass;
            if (wtTotalFail) wtTotalFail.textContent = grandTotalFail;
            if (wtTotalOther) wtTotalOther.textContent = grandTotalOther;
        }

        if (data.last_update) {
            const lastUpdateEl = document.getElementById('walkthrough-last-update');
            if (lastUpdateEl) lastUpdateEl.textContent = formatRelativeTime(data.last_update);
        }

    } catch (error) {
        console.error('Error fetching walkthrough status:', error);
    }
}

// 6. Camera Status (Enhanced)
async function fetchCameraStatus() {
    try {
        const response = await fetch('get_camera_status.php');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        let globalTotal = 0;
        let globalOnline = 0;
        let htmlContent = '';

        const buildingStyles = {
            'B2': { gradient: 'from-emerald-300 to-teal-400', border: 'border-emerald-200', icon: '🏭' },
            'B3': { gradient: 'from-violet-300 to-purple-400', border: 'border-violet-200', icon: '🏢' },
            'B4': { gradient: 'from-cyan-300 to-sky-400', border: 'border-sky-200', icon: '🏗️' },
            'B9': { gradient: 'from-amber-300 to-orange-400', border: 'border-amber-200', icon: '🧬' }
        };

        if (data.buildings) {
            for (const [building, nvrs] of Object.entries(data.buildings)) {
                const style = buildingStyles[building] || { gradient: 'from-gray-300 to-gray-400', border: 'border-gray-200', icon: '🏢' };
                let buildingTotal = 0;
                let buildingOnline = 0;
                let nvrHtml = '';

                // Sort NVRs by name
                nvrs.sort((a, b) => a.nvr_name.localeCompare(b.nvr_name));

                nvrs.forEach(nvr => {
                    const total = Number(nvr.total_channels) || 0;
                    const online = Number(nvr.online_channels) || 0;
                    const percentage = Number(nvr.percentage);

                    globalTotal += total;
                    globalOnline += online;
                    buildingTotal += total;
                    buildingOnline += online;

                    let progressColor, bgGradient, borderColor, textColor;
                    if (percentage >= 100) {
                        progressColor = 'bg-green-500'; bgGradient = 'from-green-50 to-green-100'; borderColor = 'border-green-300'; textColor = 'text-green-700';
                    } else if (percentage >= 80) {
                        progressColor = 'bg-blue-500'; bgGradient = 'from-blue-50 to-blue-100'; borderColor = 'border-blue-300'; textColor = 'text-blue-700';
                    } else if (percentage >= 50) {
                        progressColor = 'bg-yellow-500'; bgGradient = 'from-yellow-50 to-yellow-100'; borderColor = 'border-yellow-300'; textColor = 'text-yellow-700';
                    } else {
                        progressColor = 'bg-red-500'; bgGradient = 'from-red-50 to-red-100'; borderColor = 'border-red-300'; textColor = 'text-red-700';
                    }

                    const sanitizedName = nvr.nvr_name.replace(/[^a-zA-Z0-9]/g, '-');

                    nvrHtml += `
                                <div id="nvr-${sanitizedName}-container" class="bg-gradient-to-r ${bgGradient} ${borderColor} border-2 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="font-semibold text-slate-800 text-sm">${nvr.nvr_name}</span>
                                        <span id="nvr-${sanitizedName}-text" class="font-bold ${textColor} text-base">${online}/${total}</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <div id="nvr-${sanitizedName}-bar" class="${progressColor} h-2.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
                                    </div>
                                    <div class="text-xs text-gray-600 mt-1 text-right"><span id="nvr-${sanitizedName}-percent">${percentage}</span>% Online</div>
                                </div>
                            `;
                });

                const buildingPercentage = buildingTotal > 0 ? Math.round((buildingOnline / buildingTotal) * 100) : 0;

                htmlContent += `
                            <div class="bg-white/80 backdrop-blur-sm border-2 ${style.border} rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <div class="bg-gradient-to-r ${style.gradient} text-white rounded-xl px-4 py-3 mb-4 shadow-md">
                                    <p class="text-xl font-bold flex items-center justify-center gap-2">
                                        <span>${style.icon}</span>
                                        <span>Building ${building}</span>
                                    </p>
                                    <p class="text-sm text-center mt-1 opacity-90">
                                        Overall: ${buildingOnline}/${buildingTotal} cameras (${buildingPercentage}%)
                                    </p>
                                </div>
                                <div class="space-y-3 max-h-96 overflow-y-auto">
                                    ${nvrHtml || '<div class="text-center py-8 text-gray-500"><p>No NVR data available</p></div>'}
                                </div>
                            </div>
                        `;
            }
        }

        const container = document.getElementById('camera-status-container');
        if (container) container.innerHTML = htmlContent;

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

        if (data.last_update) {
            const lastUpdateEl = document.getElementById('camera-last-update');
            if (lastUpdateEl) lastUpdateEl.textContent = formatRelativeTime(data.last_update);
        }

    } catch (error) {
        console.error('Error fetching camera status:', error);
    }
}

// ---------------------------------------------------------
// User & Staff Management
// ---------------------------------------------------------

async function loadUserProfile() {
    try {
        const response = await fetch('update_profile.php');
        const result = await response.json();

        if (result.status === 'success') {
            const data = result.data;
            const fullName = `${data.first_name} ${data.last_name}`;

            const nameEl = document.getElementById('profile-name');
            const emailEl = document.getElementById('profile-email');
            const phoneEl = document.getElementById('profile-phone');
            const deptEl = document.getElementById('profile-department');
            const empIdEl = document.getElementById('profile-employee-id');

            if (nameEl) nameEl.value = fullName;
            if (emailEl) emailEl.value = data.email || '';
            if (phoneEl) phoneEl.value = data.phone || '';
            if (deptEl) deptEl.value = data.department || 'security';
            if (empIdEl) empIdEl.value = data.employee_id || '';

            if (data.last_login) {
                const lastLoginDate = new Date(data.last_login);
                const formattedLogin = lastLoginDate.toLocaleString('en-US');
                // Target the 'Last Login' input
                // It is a read-only input that initially says "Today, 08:30 AM"
                // Best way is to find the input in the profile section
                // We'll trust the selector from previous code or find it by readonly attribute
                const lastLoginInputs = document.querySelectorAll('#profile-tab input[readonly]');
                lastLoginInputs.forEach(input => {
                    // Heuristic to find the right input
                    if (input.value.includes('Today') || input.value.includes('AM') || input.value.includes('PM')) {
                        input.value = formattedLogin;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadStaffList() {
    const staffList = document.getElementById('staff-list');
    staffList.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500"><div class="animate-spin inline-block w-6 h-6 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-2"></div><p>Loading staff data...</p></td></tr>';

    try {
        const response = await fetch('get_staff_list.php');
        const result = await response.json();

        staffList.innerHTML = ''; // Clear loading

        if (result.status === 'success') {
            if (!result.data || result.data.length === 0) {
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
                const statusClass = (staff.status === 'active' || !staff.status) ?
                    'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800';
                const statusText = (staff.status === 'active' || !staff.status) ? 'Active' : 'On Leave';

                const row = document.createElement('tr');
                row.className = 'bg-white hover:bg-gray-50 transition-colors';
                row.innerHTML = `
                            <td class="px-4 py-3 text-sm text-gray-900 font-medium">${staff.name}</td>
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

            // Re-attach listeners for dynamically added buttons
            document.querySelectorAll('.delete-staff-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this staff member?')) {
                        showNotification('Delete functionality coming soon', 'info');
                    }
                });
            });

        } else {
            // Check specifically for permissions error
            if (result.message && (result.message.includes('denied') || result.message.includes('permission'))) {
                staffList.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-4 py-8 text-center text-red-500">
                             <p class="font-bold">Access Denied</p>
                             <p class="text-sm">You do not have permission to view this list.</p>
                        </td>
                    </tr>`;
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        }
    } catch (error) {
        console.error('Error loading staff list:', error);
        staffList.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-4 py-8 text-center text-red-500">
                            Error loading staff data: ${error.message}
                        </td>
                    </tr>
                `;
    }
}

// ---------------------------------------------------------
// Event Listeners & Initialization
// ---------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Modals
    const settingsModal = document.getElementById('settings-modal');
    const addStaffModal = document.getElementById('add-staff-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const addStaffBtn = document.getElementById('add-staff-btn'); // Add button in staff tab

    // Open Settings
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            loadUserProfile();
        });
    }

    // Close Settings
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }

    // Close on click outside
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.add('hidden');
        });
    }

    // Open Add Staff
    // Wait, the button exists in the Staff Tab HTML: <a href="add_officer.php" ...> or similar?
    // In dashboard.php line 1139: <a href="add_officer.php" class="...">
    // It is an anchor tag, not a button with ID 'add-staff-btn'.
    // However, there is a `add-staff-modal` in HTML. And `dashboard-all.js` referenced `add-staff-btn`.
    // Let's attach listener if the element exists, otherwise assume the anchor tag handles it (page navigation).
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', (e) => {
            e.preventDefault(); // If it's a link, stop nav
            addStaffModal.classList.remove('hidden');
        });
    }

    // Close Add Staff
    document.querySelectorAll('.close-add-staff').forEach(btn => {
        btn.addEventListener('click', () => {
            addStaffModal.classList.add('hidden');
            const form = document.getElementById('add-staff-form');
            if (form) form.reset();
        });
    });

    if (addStaffModal) {
        addStaffModal.addEventListener('click', (e) => {
            if (e.target === addStaffModal) {
                addStaffModal.classList.add('hidden');
                const form = document.getElementById('add-staff-form');
                if (form) form.reset();
            }
        });
    }

    // 2. Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Update Buttons
            tabBtns.forEach(b => {
                b.classList.remove('active', 'bg-white', 'text-blue-600', 'shadow-sm');
                b.classList.add('text-gray-500', 'hover:text-gray-700');
            });
            btn.classList.add('active', 'bg-white', 'text-blue-600', 'shadow-sm');
            btn.classList.remove('text-gray-500', 'hover:text-gray-700');

            // Update Content
            tabContents.forEach(content => content.classList.add('hidden'));
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) targetContent.classList.remove('hidden');

            // Load data if needed
            if (targetTab === 'staff') {
                loadStaffList();
            }
        });
    });

    // 3. User Profile Actions
    const saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const fullName = document.getElementById('profile-name').value;
            // Simple split
            const nameParts = fullName.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

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
                    method: 'POST', body: formData
                });
                const result = await response.json();
                if (result.status === 'success') {
                    document.getElementById('user-name').textContent = fullName;
                    showNotification('Profile updated successfully!', 'success');
                } else {
                    showNotification(result.message || 'Failed to update', 'error');
                }
            } catch (error) {
                showNotification('Error updating profile', 'error');
            }
        });
    }

    const changePwBtn = document.getElementById('change-password-btn');
    if (changePwBtn) {
        changePwBtn.addEventListener('click', async () => {
            const current = document.getElementById('current-password').value;
            const newPw = document.getElementById('new-password').value;
            const confirmPw = document.getElementById('confirm-password').value;

            if (!current || !newPw || !confirmPw) {
                showNotification('Please fill all fields', 'warning');
                return;
            }
            if (newPw !== confirmPw) {
                showNotification('New passwords do not match', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('action', 'change_password');
            formData.append('current_password', current);
            formData.append('new_password', newPw);
            formData.append('confirm_password', confirmPw);

            try {
                const response = await fetch('update_profile.php', {
                    method: 'POST', body: formData
                });
                const result = await response.json();
                if (result.status === 'success') {
                    showNotification('Password changed!', 'success');
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                } else {
                    showNotification(result.message || 'Failed', 'error');
                }
            } catch (error) {
                showNotification('Error changing password', 'error');
            }
        });
    }

    // 4. Initial Fetch calls
    updateTime(); // Run immediately
    fetchSecurityStatus();
    fetchParkingStatus();
    fetchNVRRecordingStatus();
    fetchHandheldStatus();
    fetchWalkthroughStatus();
    fetchCameraStatus();

    // 5. Intervals
    setInterval(updateTime, 1000);
    setInterval(fetchSecurityStatus, 60000);
    setInterval(fetchParkingStatus, 60000); // 1 min
    setInterval(fetchNVRRecordingStatus, 60000);
    setInterval(fetchHandheldStatus, 60000);
    setInterval(fetchWalkthroughStatus, 60000);
    setInterval(fetchCameraStatus, 30000); // 30 sec for cameras

});

// Element SDK Hooks (Preserved)
if (window.elementSdk) {
    window.elementSdk.init({
        defaultConfig,
        onConfigChange: (config) => {
            // Basic updates based on config
            const map = {
                'dashboard-title': config.dashboard_title,
                'company-name': config.company_name,
                'security-section-title': config.security_section_title,
                'nvr-section-title': config.nvr_section_title,
                'camera-section-title': config.camera_section_title,
                'parking-section-title': config.parking_section_title,
                'detector-section-title': config.detector_section_title,
                'walkthrough-section-title': config.walkthrough_section_title,
                'user-name': config.user_name,
                'user-role': config.user_role
            };
            for (const [id, val] of Object.entries(map)) {
                const el = document.getElementById(id);
                if (el && val) el.textContent = val;
            }
        },
        mapToCapabilities: () => ({ recolorables: [], borderables: [] }),
        mapToEditPanelValues: (config) => {
            const map = new Map();
            for (const [k, v] of Object.entries(config)) map.set(k, v);
            return map;
        }
    });
}
