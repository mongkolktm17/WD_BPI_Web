'use client';

import React from 'react';
import { ShieldCheck, Server } from 'lucide-react';

/** Executive summary banner: health score bar + dark operational widget. */
export function HealthBanner({ score, operational }: { score: number | null; operational: boolean }) {
  return (
    <>
      <div className="soc-glass rounded-[20px] px-4 md:px-6 py-4 lg:col-span-2 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold text-slate-800">System Health Score</div>
          <div className="text-[10px] text-slate-400 mb-2">
            {score === null
              ? 'ยังไม่มีข้อมูลรายงาน · No report data yet'
              : 'คะแนนสุขภาพระบบโดยรวม · Overall System Performance'}
          </div>
          <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-1000"
              style={{ width: `${score ?? 0}%` }}
            />
          </div>
        </div>
        <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tabular-nums flex-shrink-0">
          {score === null ? '—' : `${score}%`}
        </div>
      </div>

      <div className="soc-navy rounded-[20px] px-5 py-4 flex items-center gap-4 overflow-hidden relative">
        <div className="absolute inset-0 soc-navy-glow" />
        <span className="relative flex w-3.5 h-3.5 flex-shrink-0">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${
              operational ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
              operational ? 'bg-emerald-400 soc-glow-green' : 'bg-amber-400'
            }`}
          />
        </span>
        <div className="relative min-w-0">
          <div className={`text-sm font-extrabold ${operational ? 'text-emerald-300' : 'text-amber-300'}`}>
            {score === null ? 'No Data' : operational ? 'Operational' : 'Attention Needed'}
          </div>
          <div className="text-[10px] text-slate-300/80">
            {score === null
              ? 'รอข้อมูลรายงานแรก · Waiting for first reports'
              : operational
                ? 'All systems running normally · ระบบทั้งหมดทำงานปกติ'
                : 'บางระบบต้องการการตรวจสอบ'}
          </div>
        </div>
        <svg viewBox="0 0 120 32" className="relative ml-auto w-28 h-8 flex-shrink-0" aria-hidden>
          <polyline
            points="0,20 12,20 18,10 24,26 30,16 42,16 48,6 54,24 60,18 72,18 78,12 84,22 90,16 102,16 108,20 120,20"
            fill="none"
            stroke={operational ? '#34d399' : '#fbbf24'}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="soc-pulse-line"
          />
        </svg>
        <Server className="relative w-8 h-8 text-sky-400/40 flex-shrink-0 hidden sm:block" />
      </div>
    </>
  );
}
