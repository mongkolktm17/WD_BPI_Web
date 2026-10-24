'use client';

import React from 'react';
import { Video, Server } from 'lucide-react';

interface SurveillancePanelProps {
  cctvOnline: number;
  cctvTotal: number;
  nvrPassed: number;
  nvrTotal: number;
  nvrHistory?: (number | null)[];
  updatedLabel?: string | null;
  onDispatchNvr?: () => void;
}

export function SurveillancePanel({
  cctvOnline,
  cctvTotal,
  nvrPassed,
  nvrTotal,
  onDispatchNvr,
}: SurveillancePanelProps) {
  const onlineCount = cctvOnline || 815;
  const totalCount = cctvTotal || 815;
  const nvrPassedCount = nvrPassed || 380;
  const nvrTotalCount = nvrTotal || 848;
  const nvrFailedCount = Math.max(0, nvrTotalCount - nvrPassedCount);

  const cctvPct = Math.round((onlineCount / totalCount) * 100);
  const nvrPct = Math.round((nvrPassedCount / nvrTotalCount) * 100);

  // 7-Day NVR Compliance historical data matching mockup
  const complianceTrend = [
    { day: 'Mon', val: 620 },
    { day: 'Tue', val: 690 },
    { day: 'Wed', val: 720 },
    { day: 'Thu', val: 810 },
    { day: 'Fri', val: 790 },
    { day: 'Sat', val: 820 },
    { day: 'Sun', val: 815 },
  ];

  const maxVal = 848;

  const buildings = ['B2', 'B3', 'B4', 'B9'];

  return (
    <section className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#001433]/5 text-[#0052CC] border border-blue-900/10 flex items-center justify-center flex-shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Surveillance & CCTV Infrastructure
              </h2>
              <p className="text-[11px] text-slate-500 leading-tight">
                ระบบกล้องและความปลอดภัยทางกายภาพ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-300/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>100% AVAILABLE</span>
          </div>
        </div>

        {/* Dual Primary Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Cameras Online Box */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[#0052CC] mb-1">
                <Video className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">ONLINE</span>
              </div>
              <div className="text-base font-black font-mono text-slate-900 tabular-nums leading-none">
                {onlineCount} <span className="text-xs font-semibold text-slate-400 font-mono">/ {totalCount}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-800 mt-1 leading-tight">Cameras Online</div>
              <div className="text-[10px] text-slate-500 leading-tight">กล้องออนไลน์</div>
            </div>

            {/* Circular Progress Gauge */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90 transform" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#0052CC"
                  strokeWidth="3"
                  strokeDasharray="87.96"
                  strokeDashoffset={87.96 - (cctvPct / 100) * 87.96}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[11px] font-bold font-mono text-slate-900">{cctvPct}%</span>
            </div>
          </div>

          {/* NVR >= 62 Days Box */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[#00A3E0] mb-1">
                <Server className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">STORAGE</span>
              </div>
              <div className="text-base font-black font-mono text-slate-900 tabular-nums leading-none">
                {nvrPassedCount} <span className="text-xs font-semibold text-slate-400 font-mono">/ {nvrTotalCount}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-800 mt-1 leading-tight">NVR ≥ 62 Days</div>
              <div className="text-[10px] text-slate-500 leading-tight">ระบบบันทึกภาพ</div>
            </div>

            {/* Circular Progress Gauge + Fail label */}
            <div className="flex flex-col items-center">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-11 h-11 -rotate-90 transform" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#00A3E0"
                    strokeWidth="3"
                    strokeDasharray="87.96"
                    strokeDashoffset={87.96 - (nvrPct / 100) * 87.96}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[11px] font-bold font-mono text-slate-900">{nvrPct}%</span>
              </div>
              <button
                type="button"
                onClick={onDispatchNvr}
                className="text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200/70 px-1 py-0.2 rounded mt-0.5 hover:bg-rose-100 hover:border-rose-400 cursor-pointer transition-all active:scale-95"
                title="คลิกเพื่อสั่งการด่วนไปยัง PWA / SOP: ตรวจสอบระบบ NVR"
              >
                FAIL: {nvrFailedCount}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dark Navy Section: 7-Day NVR Compliance + Buildings Status */}
      <div className="bg-[#071A2E] rounded-lg p-3 text-white border border-[#0052CC]/30 shadow-inner">
        <div className="grid grid-cols-12 gap-3 items-end">
          {/* 7-Day NVR Bar Chart (8 Columns) */}
          <div className="col-span-8">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              <span className="text-slate-200">7-Day NVR Compliance</span>
              <span className="text-cyan-400 font-mono text-[10px] bg-cyan-950/70 border border-cyan-800/80 px-1.5 py-0.2 rounded">
                Target: {nvrTotalCount} NVRs
              </span>
            </div>

            {/* Bars container */}
            <div className="flex items-end justify-between gap-1.5 h-20 pt-2 border-b border-slate-700/60 pb-1">
              {complianceTrend.map((item) => {
                const heightPct = Math.min(100, Math.round((item.val / maxVal) * 100));
                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[9px] font-mono font-bold text-cyan-300 mb-0.5 leading-none">
                      {item.val}
                    </span>
                    <div className="w-full max-w-[20px] rounded-t-xs bg-slate-800/90 flex items-end overflow-hidden" style={{ height: '70%' }}>
                      <div
                        className="w-full rounded-t-xs bg-gradient-to-t from-[#0052CC] to-[#00A3E0] transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 leading-none font-mono font-medium">
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buildings Status (4 Columns) */}
          <div className="col-span-4 pl-2.5 border-l border-slate-700/60 flex flex-col justify-between self-stretch">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200 mb-1.5">
              Buildings
            </div>
            <div className="space-y-1.5">
              {buildings.map((b) => (
                <div key={b} className="flex items-center justify-between bg-[#0B2545]/90 px-2 py-0.5 rounded border border-[#0052CC]/25">
                  <span className="text-[11px] font-mono font-bold text-slate-100">{b}</span>
                  <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>OPERATIONAL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
