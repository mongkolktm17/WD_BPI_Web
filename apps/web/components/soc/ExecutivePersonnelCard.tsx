'use client';

import React from 'react';
import { Shield, Sun, Moon, Users, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ExecutivePersonnelCardProps {
  dayShift: number;
  dayContract: number;
  nightShift: number;
  nightContract: number;
  totalActive: number;
  totalContract: number;
  updatedLabel: string | null;
}

/**
 * Pillar 1: Security Personnel & Shifts
 * Single Source of Truth for Security Guards deployment.
 * Eliminates duplicate KPI cards and duplicate QuickOverview widgets.
 */
export function ExecutivePersonnelCard({
  dayShift,
  dayContract,
  nightShift,
  nightContract,
  totalActive,
  totalContract,
  updatedLabel,
}: ExecutivePersonnelCardProps) {
  const totalPct = totalContract > 0 ? Math.round((totalActive / totalContract) * 100) : 0;
  const dayPct = dayContract > 0 ? Math.round((dayShift / dayContract) * 100) : 0;
  const nightPct = nightContract > 0 ? Math.round((nightShift / nightContract) * 100) : 0;

  const isFullStaff = totalContract > 0 ? totalActive >= totalContract : totalActive > 0;
  const deficit = totalContract > totalActive ? totalContract - totalActive : 0;

  return (
    <section className="soc-glass rounded-[20px] p-3.5 md:p-4 h-full flex flex-col justify-between">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs md:text-sm font-extrabold text-slate-800 leading-tight">
                Security Personnel & Shifts
              </h2>
              <p className="text-[10px] text-slate-400 leading-tight">
                กำลังพลและเวรปฏิบัติการ
              </p>
            </div>
          </div>
          {/* Status Badge */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isFullStaff
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {isFullStaff ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Full Staff · ครบอัตรา</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Deficit: -{deficit} · ขาด {deficit}</span>
              </>
            )}
          </div>
        </div>

        {/* Big Total Active Metric Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 rounded-xl p-2.5 text-white shadow-sm mt-2.5 mb-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/80" />
              <span className="text-[11px] font-bold text-white/90">Total Active Force · กำลังพลรวม</span>
            </div>
            <span className="text-xs font-bold text-cyan-200">{totalPct}% of Contract</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black tabular-nums tracking-tight">
              {totalActive.toLocaleString()}
            </span>
            <span className="text-white/70 text-sm font-bold">
              / {totalContract.toLocaleString()} นาย
            </span>
          </div>
        </div>
      </div>

      {/* Shifts Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        {/* Day Shift */}
        <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-slate-700">Day Shift</span>
            </div>
            <span className="text-[9px] font-medium text-slate-400">07:00–19:00</span>
          </div>
          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-base font-black text-slate-800 tabular-nums">
              {dayShift}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              / {dayContract}
            </span>
            <span className="ml-auto text-[10px] font-bold text-amber-600">{dayPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden mt-1">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-700"
              style={{ width: `${dayPct}%` }}
            />
          </div>
        </div>

        {/* Night Shift */}
        <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] font-bold text-slate-700">Night Shift</span>
            </div>
            <span className="text-[9px] font-medium text-slate-400">19:00–07:00</span>
          </div>
          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-base font-black text-slate-800 tabular-nums">
              {nightShift}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              / {nightContract}
            </span>
            <span className="ml-auto text-[10px] font-bold text-indigo-600">{nightPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-indigo-100 overflow-hidden mt-1">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${nightPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Timestamp */}
      {updatedLabel && (
        <div className="mt-2 text-[9px] text-slate-400 text-right">
          อัปเดตล่าสุด: {updatedLabel}
        </div>
      )}
    </section>
  );
}
