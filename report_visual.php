<?php
require_once 'config.php';

// Check if the user is logged in
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Statistics Report | WD BPI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="icon" href="report_assets/Images/PCS_logo.png" type="image/png">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="public/css/dashboard.css">
    <style>
        body { font-family: 'Inter', sans-serif; }
        
        .chart-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chart-card:hover {
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06);
            transform: translateY(-2px);
        }

        .range-btn {
            position: relative;
            overflow: hidden;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .range-btn.active {
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
        }
        .range-btn:not(.active):hover {
            background: #eff6ff;
            color: #3b82f6;
        }

        .stat-badge {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.08));
            border: 1px solid rgba(59, 130, 246, 0.15);
        }

        .month-input {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1.5px solid #e2e8f0;
            transition: all 0.2s ease;
        }
        .month-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
            outline: none;
        }

        .icon-wrap {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .loading-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeInUp 0.4s ease-out both;
        }
        .animate-fade-in:nth-child(2) { animation-delay: 0.05s; }
        .animate-fade-in:nth-child(3) { animation-delay: 0.10s; }
        .animate-fade-in:nth-child(4) { animation-delay: 0.15s; }
    </style>
</head>
<body class="gradient-bg min-h-screen">
    <div class="container mx-auto px-3 py-2">
        <!-- Header matching dashboard style -->
        <header class="mb-4">
            <div class="bg-white rounded-xl shadow-md px-4 py-2 flex items-center justify-between border-l-4 border-sky-500">
                <!-- Left: Back + Title -->
                <div class="flex items-center gap-3">
                    <a href="dashboard.php" class="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </a>
                    <img src="report_assets/Images/images_logo.png" alt="WD Logo" class="h-9 w-auto object-contain">
                    <div>
                        <h1 class="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-sky-500 leading-tight">
                            Visual Statistics Report
                        </h1>
                        <p class="text-[11px] text-slate-400 leading-tight">Trend analysis and historical data visualization</p>
                    </div>
                </div>

                <!-- Right: Controls -->
                <div class="flex items-center gap-2">
                    <!-- Month Selector (Hidden by default) -->
                    <div id="month-selector-container" class="hidden flex items-center gap-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เดือน</span>
                        <input type="month" id="month-picker" 
                            class="month-input text-sm font-semibold text-slate-700 py-1 px-3 rounded-lg cursor-pointer"
                            onchange="handleMonthChange()">
                    </div>

                    <!-- Range Selector -->
                    <div class="flex bg-slate-100 p-0.5 rounded-lg">
                        <button onclick="updateRange('week')" id="btn-week" class="range-btn active px-3 py-1.5 rounded-md text-xs font-semibold">Weekly</button>
                        <button onclick="updateRange('month')" id="btn-month" class="range-btn px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500">Monthly</button>
                        <button onclick="updateRange('year')" id="btn-year" class="range-btn px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500">Yearly</button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <!-- Security Personnel Trend -->
            <div class="chart-card rounded-2xl p-5 animate-fade-in">
                <div class="flex items-center gap-3 mb-4">
                    <div class="icon-wrap bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-700 text-sm">Security Personnel Trend</h3>
                        <p class="text-[11px] text-slate-400">จำนวนพนักงานรักษาความปลอดภัยแต่ละกะ</p>
                    </div>
                </div>
                <div class="relative h-[260px]">
                    <canvas id="chart-security"></canvas>
                </div>
            </div>

            <!-- Parking Occupancy -->
            <div class="chart-card rounded-2xl p-5 animate-fade-in">
                <div class="flex items-center gap-3 mb-4">
                    <div class="icon-wrap bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h-3v7h3.11a2.5 2.5 0 014.89 0H19V8a1 1 0 00-1-1h-4z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-700 text-sm">Parking Occupancy</h3>
                        <p class="text-[11px] text-slate-400">จำนวนรถเฉลี่ยในลานจอด</p>
                    </div>
                </div>
                <div class="relative h-[260px]">
                    <canvas id="chart-parking"></canvas>
                </div>
            </div>

            <!-- CCTV Stability -->
            <div class="chart-card rounded-2xl p-5 animate-fade-in">
                <div class="flex items-center gap-3 mb-4">
                    <div class="icon-wrap bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-sky-500/20">
                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zM16 16H4V6h12v10z" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-700 text-sm">CCTV Online Status</h3>
                        <p class="text-[11px] text-slate-400">อัตราส่วนกล้อง Online (%)</p>
                    </div>
                </div>
                <div class="relative h-[260px]">
                    <canvas id="chart-cctv"></canvas>
                </div>
            </div>

            <!-- Metal Detector Pass Rate (Hand Held + Walkthrough combined) -->
            <div class="chart-card rounded-2xl p-5 animate-fade-in">
                <div class="flex items-center gap-3 mb-4">
                    <div class="icon-wrap bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-700 text-sm">Metal Detector Pass Rate</h3>
                        <p class="text-[11px] text-slate-400">อัตราผ่านการตรวจสอบ Hand Held &amp; Walkthrough (%)</p>
                    </div>
                </div>
                <div class="relative h-[260px]">
                    <canvas id="chart-detectors"></canvas>
                </div>
                </div>
            </div>

        </div>

        <footer class="mt-6 text-center text-slate-400 text-[10px]">
            &copy; 2026 Western Digital BPI Security &mdash; PCS Group. All data is real-time aggregated.
        </footer>
    </div>

    <script>
        let charts = {};
        let currentRange = 'week';

        // Theme-consistent chart defaults
        const chartColors = {
            blue:    { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', gradient: ['rgba(59, 130, 246, 0.25)', 'rgba(59, 130, 246, 0.02)'] },
            indigo:  { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', gradient: ['rgba(99, 102, 241, 0.25)', 'rgba(99, 102, 241, 0.02)'] },
            emerald: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', gradient: ['rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.02)'] },
            sky:     { border: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)', gradient: ['rgba(14, 165, 233, 0.25)', 'rgba(14, 165, 233, 0.02)'] },
            amber:   { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', gradient: ['rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0.02)'] },
            violet:  { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', gradient: ['rgba(139, 92, 246, 0.25)', 'rgba(139, 92, 246, 0.02)'] }
        };

        function createGradient(ctx, colors) {
            const gradient = ctx.createLinearGradient(0, 0, 0, 260);
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);
            return gradient;
        }

        function createChart(id, type, labels, datasets, options = {}) {
            const canvas = document.getElementById(id);
            const ctx = canvas.getContext('2d');
            if (charts[id]) charts[id].destroy();

            // Apply gradients to line charts
            datasets.forEach(ds => {
                if (ds._gradient && type === 'line') {
                    ds.backgroundColor = createGradient(ctx, ds._gradient);
                    ds.fill = true;
                    delete ds._gradient;
                }
            });

            charts[id] = new Chart(ctx, {
                type: type,
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: { top: options.isPercentage ? 20 : 10, right: 20, left: 10, bottom: 0 }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 16,
                                font: { size: 11, family: 'Inter', weight: '500' },
                                color: '#64748b'
                            }
                        },
                        tooltip: {
                            backgroundColor: '#ffffff',
                            titleColor: '#1e293b',
                            bodyColor: '#475569',
                            borderColor: '#e2e8f0',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                            titleFont: { size: 12, weight: '600', family: 'Inter' },
                            bodyFont: { size: 11, family: 'Inter' },
                            boxPadding: 4,
                            usePointStyle: true,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    let val = context.parsed.y;
                                    if (val === null || val === undefined) return label + ': ไม่มีข้อมูล';
                                    let suffix = options.isPercentage ? '%' : '';
                                    return label + ': ' + val + suffix;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: options.isPercentage ? 100 : undefined,
                            grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
                            ticks: {
                                font: { size: 10, family: 'Inter' },
                                color: '#94a3b8',
                                padding: 8,
                                callback: function(v) { return options.isPercentage ? v + '%' : v; }
                            },
                            border: { display: false }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 9, family: 'Inter' },
                                color: '#94a3b8',
                                maxRotation: 45,
                                minRotation: 0,
                                padding: 4
                            },
                            border: { display: false }
                        }
                    },
                    elements: {
                        line: { borderWidth: 2.5, spanGaps: true },
                        point: { radius: 3.5, hoverRadius: 6, hitRadius: 12, borderWidth: 2, backgroundColor: '#fff' }
                    },
                    ...options.chartOptions
                }
            });
        }

        function handleMonthChange() {
            if (currentRange === 'month') {
                updateRange('month');
            }
        }

        async function updateRange(range) {
            currentRange = range;
            
            // Button state
            document.querySelectorAll('.range-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.classList.add('text-slate-500');
            });
            const activeBtn = document.getElementById('btn-' + range);
            activeBtn.classList.add('active');
            activeBtn.classList.remove('text-slate-500');

            // Month picker
            const monthContainer = document.getElementById('month-selector-container');
            const monthPicker = document.getElementById('month-picker');
            
            if (range === 'month') {
                monthContainer.classList.remove('hidden');
                monthContainer.classList.add('flex');
                if (!monthPicker.value) {
                    const now = new Date();
                    monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                }
            } else {
                monthContainer.classList.add('hidden');
                monthContainer.classList.remove('flex');
            }

            try {
                let url = `get_stats_data.php?range=${range}`;
                if (range === 'month' && monthPicker.value) {
                    const [year, month] = monthPicker.value.split('-');
                    url += `&month=${parseInt(month)}&year=${parseInt(year)}`;
                }

                const response = await fetch(url);
                const data = await response.json();

                if (data.error) {
                    console.error(data.error);
                    return;
                }

                // 1. Security Chart (Line) with Total
                createChart('chart-security', 'line', data.labels, [
                    {
                        label: 'กะเช้า (Morning)',
                        data: data.datasets.security_morning,
                        borderColor: chartColors.blue.border,
                        _gradient: chartColors.blue.gradient,
                        tension: 0.35,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: chartColors.blue.border
                    },
                    {
                        label: 'กะดึก (Evening)',
                        data: data.datasets.security_evening,
                        borderColor: chartColors.indigo.border,
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.35,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: chartColors.indigo.border
                    },
                    {
                        label: 'รวม (Total)',
                        data: data.datasets.security_total,
                        borderColor: '#14b8a6',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.35,
                        borderWidth: 3,
                        borderDash: [6, 3],
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#14b8a6',
                        pointRadius: 3
                    }
                ]);

                // 2. Parking Chart (Bar with rounded corners)
                createChart('chart-parking', 'bar', data.labels, [
                    {
                        label: 'รถยนต์ (Cars)',
                        data: data.datasets.parking_car,
                        backgroundColor: chartColors.blue.border,
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 20
                    },
                    {
                        label: 'จักรยานยนต์ (Motorcycles)',
                        data: data.datasets.parking_moto,
                        backgroundColor: chartColors.emerald.border,
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 20
                    }
                ]);

                // 3. CCTV Chart (Area)
                createChart('chart-cctv', 'line', data.labels, [
                    {
                        label: 'อัตรา Online',
                        data: data.datasets.cctv_online,
                        borderColor: chartColors.sky.border,
                        _gradient: chartColors.sky.gradient,
                        tension: 0.35,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: chartColors.sky.border
                    }
                ], { isPercentage: true });

                // 4. Metal Detector Chart (Combined HH + WT)
                createChart('chart-detectors', 'line', data.labels, [
                    {
                        label: 'Hand Held',
                        data: data.datasets.hh_pass_rate,
                        borderColor: chartColors.amber.border,
                        _gradient: chartColors.amber.gradient,
                        tension: 0.35,
                        borderDash: [5, 3],
                        pointBackgroundColor: '#fff',
                        pointBorderColor: chartColors.amber.border
                    },
                    {
                        label: 'Walkthrough',
                        data: data.datasets.wt_pass_rate,
                        borderColor: chartColors.violet.border,
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.35,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: chartColors.violet.border,
                        clip: false
                    }
                ], { isPercentage: true });

            } catch (error) {
                console.error('Fetch error:', error);
            }
        }

        // Initial load
        window.onload = () => updateRange('week');
    </script>
</body>
</html>
