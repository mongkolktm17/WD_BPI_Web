'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Chart from 'chart.js/auto';

interface VisualStatsData {
  labels: string[];
  datasets: {
    security_morning: (number | null)[];
    security_evening: (number | null)[];
    security_total: (number | null)[];
    parking_car: (number | null)[];
    parking_moto: (number | null)[];
    cctv_online: (number | null)[];
    hh_pass_rate: (number | null)[];
    wt_pass_rate: (number | null)[];
  };
}

const chartColors = {
  blue: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', gradient: ['rgba(59, 130, 246, 0.25)', 'rgba(59, 130, 246, 0.02)'] },
  indigo: { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', gradient: ['rgba(99, 102, 241, 0.25)', 'rgba(99, 102, 241, 0.02)'] },
  emerald: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', gradient: ['rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.02)'] },
  sky: { border: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)', gradient: ['rgba(14, 165, 233, 0.25)', 'rgba(14, 165, 233, 0.02)'] },
  amber: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', gradient: ['rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0.02)'] },
  violet: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', gradient: ['rgba(139, 92, 246, 0.25)', 'rgba(139, 92, 246, 0.02)'] },
  teal: { border: '#14b8a6' },
};

function createGradient(ctx: CanvasRenderingContext2D, colors: string[]) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
}

function getChartOptions(isPercentage: boolean) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: isPercentage ? 20 : 10, right: 20, left: 10, bottom: 0 } },
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          font: { size: 11, family: 'Inter', weight: '500' as const },
          color: '#64748b',
        },
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 12, weight: '600' as const, family: 'Inter' },
        bodyFont: { size: 11, family: 'Inter' },
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            if (val === null || val === undefined) return `${label}: ไม่มีข้อมูล`;
            const suffix = isPercentage ? '%' : '';
            return `${label}: ${val}${suffix}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: isPercentage ? 100 : undefined,
        grace: isPercentage ? '5%' : undefined,
        grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
        ticks: {
          font: { size: 10, family: 'Inter' },
          color: '#94a3b8',
          padding: 8,
          callback: (v: number) => isPercentage ? `${v}%` : v,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 9, family: 'Inter' },
          color: '#94a3b8',
          maxRotation: 45,
          minRotation: 0,
          padding: 4,
        },
        border: { display: false },
      },
    },
    elements: {
      line: { borderWidth: 2.5, spanGaps: true },
      point: { radius: 3.5, hoverRadius: 6, hitRadius: 12, borderWidth: 2, backgroundColor: '#fff' },
    },
  };
}

export default function VisualReportPage() {
  const [range, setRange] = useState<'week' | 'month' | 'year'>('week');
  const [monthValue, setMonthValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);

  const securityRef = useRef<HTMLCanvasElement>(null);
  const parkingRef = useRef<HTMLCanvasElement>(null);
  const cctvRef = useRef<HTMLCanvasElement>(null);
  const detectorsRef = useRef<HTMLCanvasElement>(null);

  const chartsRef = useRef<Record<string, Chart>>({});

  const destroyCharts = () => {
    Object.values(chartsRef.current).forEach((c) => c.destroy());
    chartsRef.current = {};
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    destroyCharts();
    try {
      let url = `/api/stats/visual?range=${range}`;
      if (range === 'month' && monthValue) {
        const [year, month] = monthValue.split('-');
        url += `&month=${parseInt(month)}&year=${parseInt(year)}`;
      }
      const res = await apiFetch<{ success: boolean; data: VisualStatsData }>(url);
      const data = res.data || res;

      // 1. Security Chart (Line)
      if (securityRef.current) {
        const ctx = securityRef.current.getContext('2d')!;
        chartsRef.current.security = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [
              {
                label: 'กะเช้า (Morning)',
                data: data.datasets.security_morning,
                borderColor: chartColors.blue.border,
                backgroundColor: createGradient(ctx, chartColors.blue.gradient),
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#fff',
                pointBorderColor: chartColors.blue.border,
              },
              {
                label: 'กะดึก (Evening)',
                data: data.datasets.security_evening,
                borderColor: chartColors.indigo.border,
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.35,
                pointBackgroundColor: '#fff',
                pointBorderColor: chartColors.indigo.border,
              },
              {
                label: 'รวม (Total)',
                data: data.datasets.security_total,
                borderColor: chartColors.teal.border,
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.35,
                borderWidth: 3,
                borderDash: [6, 3],
                pointBackgroundColor: '#fff',
                pointBorderColor: chartColors.teal.border,
                pointRadius: 3,
              },
            ],
          },
          options: getChartOptions(false) as any,
        });
      }

      // 2. Parking Chart (Bar)
      if (parkingRef.current) {
        const ctx = parkingRef.current.getContext('2d')!;
        chartsRef.current.parking = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.labels,
            datasets: [
              {
                label: 'รถยนต์ (Cars)',
                data: data.datasets.parking_car,
                backgroundColor: chartColors.blue.border,
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 20,
              },
              {
                label: 'จักรยานยนต์ (Motorcycles)',
                data: data.datasets.parking_moto,
                backgroundColor: chartColors.emerald.border,
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 20,
              },
            ],
          },
          options: getChartOptions(false) as any,
        });
      }

      // 3. CCTV Chart (Area)
      if (cctvRef.current) {
        const ctx = cctvRef.current.getContext('2d')!;
        chartsRef.current.cctv = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [
              {
                label: 'อัตรา Online',
                data: data.datasets.cctv_online,
                borderColor: chartColors.sky.border,
                backgroundColor: createGradient(ctx, chartColors.sky.gradient),
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#fff',
                pointBorderColor: chartColors.sky.border,
              },
            ],
          },
          options: getChartOptions(true) as any,
        });
      }

      // 4. Metal Detector Chart (Combined)
      if (detectorsRef.current) {
        const ctx = detectorsRef.current.getContext('2d')!;
        chartsRef.current.detectors = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [
              {
                label: 'Hand Held',
                data: data.datasets.hh_pass_rate,
                borderColor: chartColors.amber.border,
                backgroundColor: createGradient(ctx, chartColors.amber.gradient),
                fill: true,
                tension: 0.35,
                borderDash: [5, 3],
                pointBackgroundColor: '#fff',
                pointBorderColor: chartColors.amber.border,
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
              },
            ],
          },
          options: getChartOptions(true) as any,
        });
      }
    } catch (err) {
      console.error('Failed to fetch visual stats:', err);
    } finally {
      setLoading(false);
    }
  }, [range, monthValue]);

  useEffect(() => {
    fetchData();
    return () => destroyCharts();
  }, [fetchData]);

  return (
    <div className="max-w-7xl mx-auto px-3 py-2">
      {/* Header */}
      <header className="mb-4">
        <div className="bg-white rounded-xl shadow-md px-3 md:px-4 py-2 flex items-center justify-between border-l-4 border-sky-500 flex-wrap gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <a href="/" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <img src="/report_assets/Images/images_logo.png" alt="WD Logo" className="h-7 md:h-9 w-auto object-contain" />
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-sky-500 leading-tight truncate">
                Visual Statistics Report
              </h1>
              <p className="text-[10px] md:text-[11px] text-slate-400 leading-tight hidden sm:block">Trend analysis and historical data visualization</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            {range === 'month' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">เลือกเดือน</span>
                <input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                  className="text-xs md:text-sm font-bold text-slate-700 py-1 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            )}
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              {(['week', 'month', 'year'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-semibold transition-all cursor-pointer ${
                    range === r
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/35'
                      : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {r === 'week' ? 'Weekly' : r === 'month' ? 'Monthly' : 'Yearly (2026)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Security Personnel Trend */}
        <div className="bg-white rounded-2xl p-3 md:p-5 shadow-md border border-white/60 transition-all hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-sm">Security Personnel Trend</h3>
              <p className="text-[11px] text-slate-400">จำนวนพนักงานรักษาความปลอดภัยแต่ละกะ</p>
            </div>
          </div>
          <div className="relative h-[260px]">
            <canvas ref={securityRef} />
          </div>
        </div>

        {/* Parking Occupancy */}
        <div className="bg-white rounded-2xl p-3 md:p-5 shadow-md border border-white/60 transition-all hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h-3v7h3.11a2.5 2.5 0 014.89 0H19V8a1 1 0 00-1-1h-4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-sm">Parking Occupancy</h3>
              <p className="text-[11px] text-slate-400">จำนวนรถรวมทุกลานจอด</p>
            </div>
          </div>
          <div className="relative h-[260px]">
            <canvas ref={parkingRef} />
          </div>
        </div>

        {/* CCTV Stability */}
        <div className="bg-white rounded-2xl p-3 md:p-5 shadow-md border border-white/60 transition-all hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-sky-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zM16 16H4V6h12v10z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-sm">CCTV Online Status</h3>
              <p className="text-[11px] text-slate-400">อัตราส่วนกล้อง Online (%)</p>
            </div>
          </div>
          <div className="relative h-[260px]">
            <canvas ref={cctvRef} />
          </div>
        </div>

        {/* Metal Detector Pass Rate */}
        <div className="bg-white rounded-2xl p-3 md:p-5 shadow-md border border-white/60 transition-all hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-sm">Metal Detector Pass Rate</h3>
              <p className="text-[11px] text-slate-400">อัตราผ่านการตรวจสอบ Hand Held &amp; Walkthrough (%)</p>
            </div>
          </div>
          <div className="relative h-[260px]">
            <canvas ref={detectorsRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
