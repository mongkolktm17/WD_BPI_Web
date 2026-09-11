'use client';

import React from 'react';
import { Cctv, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { last7Days, to7Points } from './soc-utils';

interface SurveillancePanelProps {
  cctvOnline: number;
  cctvTotal: number;
  nvrPassed: number;
  nvrTotal: number;
  nvrHistory: (number | null)[];
  updatedLabel: string | null;
}

/**
 * Pillar 2: Surveillance & CCTV Infrastructure
 * Streamlined executive view: Camera Online & NVR Retention, 7-Day Trend,
 * with redundant donut chart removed to maximize single-screen density.
 */
export function SurveillancePanel({
  cctvOnline,
  cctvTotal,
  nvrPassed,
  nvrTotal,
  nvrHistory,
  updatedLabel,
}: SurveillancePanelProps) {
  const cctvPct = cctvTotal > 0 ? Math.round((cctvOnline / cctvTotal) * 100) : 0;
  const cctvOff = Math.max(0, cctvTotal - cctvOnline);
  const nvrPct = nvrTotal > 0 ? Math.round((nvrPassed / nvrTotal) * 100) : 0;
  const nvrFailed = Math.max(0, nvrTotal - nvrPassed);

  const days = last7Days();
  const points = to7Points(nvrHistory, nvrPassed);
  const timeline = days.map((d, i) => ({ ...d, passed: points[i] ?? 0 }));

  const buildings = [
    { name: 'B2', status: 'normal', label: 'Factory B2' },
    { name: 'B3', status: 'normal', label: 'Office B3' },
    { name: 'B4', status: 'normal', label: 'Warehouse B4' },
    { name: 'B9', status: 'normal', label: 'Utility B9' },
  ];

  return (
    <section className="soc-glass rounded-[20px] p-3.5 md:p-4 h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Cctv className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs md:text-sm font-extrabold text-slate-800 leading-tight">
                Surveillance & CCTV Infrastructure
              </h2>
              <p className="text-[10px] text-slate-400 leading-tight">
                ระบบกล้องและความปลอดภัยทางกายภาพ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{cctvPct}% Available</span>
          </div>
        </div>

        {/* Dual Primary Metric Cards */}
        <div className="grid grid-cols-2 gap-2 mt-2.5 mb-2.5">
          {/* Cameras Online */}
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cctv className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-700">Cameras Online</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-600">{cctvPct}%</span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {cctvOnline.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                / {cctvTotal.toLocaleString()}
              </span>
              {cctvOff > 0 ? (
                <span className="ml-auto text-[9px] font-semibold text-rose-500">
                  Off: {cctvOff}
                </span>
              ) : (
                <span className="ml-auto text-[9px] font-semibold text-emerald-600">
                  All Online
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${cctvPct}%` }}
              />
            </div>
          </div>

          {/* NVR Recording Compliance */}
          <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-700">NVR &ge; 62 Days</span>
              </div>
              <span className="text-[10px] font-extrabold text-indigo-600">{nvrPct}%</span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {nvrPassed.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                / {nvrTotal.toLocaleString()}
              </span>
              {nvrFailed > 0 ? (
                <span className="ml-auto text-[9px] font-semibold text-rose-500">
                  Fail: {nvrFailed}
                </span>
              ) : (
                <span className="ml-auto text-[9px] font-semibold text-indigo-600">
                  100% Pass
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-indigo-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${nvrPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Compact Navy Visual Section */}
      <div className="soc-navy rounded-xl p-2.5 text-white mt-auto">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
          {/* 7-Day Sparkline */}
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300 mb-1">
              <span>7-Day NVR Compliance Trend</span>
              <span className="text-[9px] text-teal-300">Target: {nvrTotal} NVRs</span>
            </div>
            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 2, right: 2, bottom: 0, left: -22 }}>
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 8 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} axisLine={false} tickLine={false} width={22} domain={[0, Math.max(nvrTotal, 1)]} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10, color: '#e2e8f0', padding: '4px 8px' }}
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as { day: string; date: string } | undefined;
                      return p ? `${p.day} ${p.date}` : '';
                    }}
                  />
                  {nvrTotal > 0 && <ReferenceLine y={nvrTotal} stroke="#f43f5e" strokeDasharray="3 3" />}
                  <Bar dataKey="passed" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    {timeline.map((t, i) => (
                      <Cell
                        key={i}
                        fill={t.passed >= nvrTotal && nvrTotal > 0 ? '#34d399' : t.passed > 0 ? '#2dd4bf' : '#334155'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Building Quick Status Badges */}
          <div className="sm:col-span-2 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-2.5 pt-1.5 sm:pt-0">
            <div className="text-[10px] font-semibold text-slate-300 mb-1.5">Buildings Status</div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {buildings.map((b) => (
                <div key={b.name} className="bg-white/10 rounded-lg px-2 py-1 flex items-center justify-between">
                  <span className="font-bold text-slate-200">{b.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Operational" />
                </div>
              ))}
            </div>
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
