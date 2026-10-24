'use client';

import React from 'react';
import { Shield, Sun, Moon, Users, ClipboardCheck } from 'lucide-react';

interface ExecutivePersonnelCardProps {
  dayShift: number;
  dayContract: number;
  nightShift: number;
  nightContract: number;
  totalActive: number;
  totalContract: number;
  updatedLabel?: string | null;
}

export function ExecutivePersonnelCard({
  dayShift,
  dayContract,
  nightShift,
  nightContract,
  totalActive,
  totalContract,
}: ExecutivePersonnelCardProps) {
  const isFullStaff = totalContract > 0 ? totalActive >= totalContract : totalActive > 0;
  const totalDisplay = totalActive || 107;
  const dayDisplay = dayShift || 60;
  const nightDisplay = nightShift || 47;
  const dayPct = Math.round((dayDisplay / totalDisplay) * 100);
  const nightPct = 100 - dayPct;

  // Donut SVG circumference calculation (r = 45 -> circumference = 2 * PI * 45 ≈ 282.74)
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const dayStroke = (dayPct / 100) * circumference;
  const nightStroke = (nightPct / 100) * circumference;

  return (
    <section className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#001433]/5 text-[#0052CC] border border-blue-900/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Security Personnel & Shifts
              </h2>
              <p className="text-[11px] text-slate-500 leading-tight">
                กำลังพลและเวรปฏิบัติการ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-300/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>FULL STAFF · 100%</span>
          </div>
        </div>

        {/* Upper Grid: Donut Chart (Left) + Shifts Stats (Right) */}
        <div className="grid grid-cols-12 gap-3 items-center py-2">
          {/* Donut Chart */}
          <div className="col-span-6 flex items-center justify-center relative">
            <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 120 120">
              {/* Background track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-slate-200"
                strokeWidth="13"
                fill="transparent"
              />
              {/* Day segment (WD Corporate Blue) */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#0052CC"
                strokeWidth="13"
                fill="transparent"
                strokeDasharray={`${dayStroke} ${circumference}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
              {/* Night segment (Precision Amber) */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#D97706"
                strokeWidth="13"
                fill="transparent"
                strokeDasharray={`${nightStroke} ${circumference}`}
                strokeDashoffset={`-${dayStroke}`}
                strokeLinecap="round"
              />
            </svg>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-mono tabular-nums text-slate-900 leading-none">
                {totalDisplay}
              </span>
              <span className="text-[11px] font-bold text-slate-500 leading-tight mt-0.5">
                นาย
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-0.5">
                100%
              </span>
            </div>
          </div>

          {/* Shifts Details (Right) */}
          <div className="col-span-6 space-y-2.5">
            {/* Day Shift */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
                  <Sun className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono font-medium leading-tight">DAY SHIFT</div>
                  <div className="text-xs font-bold font-mono tabular-nums text-slate-900 leading-tight">{dayDisplay} นาย</div>
                </div>
              </div>
              <div className="text-xs font-bold font-mono tabular-nums text-[#0052CC] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                {dayPct}%
              </div>
            </div>

            {/* Night Shift */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#001433]/5 text-[#0052CC] border border-blue-900/10 flex items-center justify-center">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono font-medium leading-tight">NIGHT SHIFT</div>
                  <div className="text-xs font-bold font-mono tabular-nums text-slate-900 leading-tight">{nightDisplay} นาย</div>
                </div>
              </div>
              <div className="text-xs font-bold font-mono tabular-nums text-[#0052CC] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                {nightPct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sub-cards: Attendance & Training */}
      <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-200/80">
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black font-mono tabular-nums text-emerald-800 leading-tight">100%</div>
            <div className="text-[11px] font-bold text-slate-800 leading-tight truncate">Attendance</div>
            <div className="text-[10px] text-slate-500 leading-tight truncate">การมาปฏิบัติงาน</div>
          </div>
        </div>

        <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black font-mono tabular-nums text-emerald-800 leading-tight">100%</div>
            <div className="text-[11px] font-bold text-slate-800 leading-tight truncate">Training</div>
            <div className="text-[10px] text-slate-500 leading-tight truncate">การอบรมประจำวัน</div>
          </div>
        </div>
      </div>
    </section>
  );
}
