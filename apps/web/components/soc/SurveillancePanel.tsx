'use client';

import React from 'react';
import { Cctv, Server } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
  PieChart, Pie,
} from 'recharts';
import { last7Days, to7Points } from './soc-utils';

/** Video surveillance health: NVR + cameras stats, 7-day timeline, status donut. */
export function SurveillancePanel({
  cctvOnline,
  cctvTotal,
  nvrPassed,
  nvrTotal,
  nvrHistory,
  updatedLabel,
}: {
  cctvOnline: number;
  cctvTotal: number;
  nvrPassed: number;
  nvrTotal: number;
  nvrHistory: (number | null)[];
  updatedLabel: string | null;
}) {
  const cctvPct = cctvTotal > 0 ? Math.round((cctvOnline / cctvTotal) * 100) : 0;
  const cctvOff = Math.max(0, cctvTotal - cctvOnline);
  const nvrPct = nvrTotal > 0 ? Math.round((nvrPassed / nvrTotal) * 100) : 0;

  const days = last7Days();
  const points = to7Points(nvrHistory, nvrPassed);
  const timeline = days.map((d, i) => ({ ...d, passed: points[i] ?? 0 }));

  return (
    <section className="soc-glass rounded-[20px] p-4 md:p-5 h-full">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Cctv className="w-5 h-5 text-blue-700" />
        <h2 className="text-sm font-extrabold text-slate-800">Video Surveillance Health</h2>
        {updatedLabel && <span className="text-[10px] text-slate-400">Last Update: {updatedLabel}</span>}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-400">System Availability<br className="sm:hidden" /> ความพร้อมระบบ</span>
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 soc-glow-green" />
          </span>
          <span className="text-xl font-extrabold text-slate-900 tabular-nums">{cctvPct}%</span>
        </div>
      </div>
      <div className="text-[10px] text-slate-400 mb-3">สุขภาพระบบกล้องวงจรปิด · NVR & Camera Status</div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Cctv className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-bold text-slate-600">Cameras Online · กล้องออนไลน์</span>
          </div>
          <div className="text-xl font-extrabold text-slate-800 tabular-nums">
            {cctvOnline.toLocaleString()} <span className="text-slate-400 text-sm font-bold">/ {cctvTotal.toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">{cctvPct}% Online</div>
          <div className="h-1.5 rounded-full bg-emerald-100 mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${cctvPct}%` }} />
          </div>
        </div>
        <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-600">NVR Recording · บันทึก NVR</span>
          </div>
          <div className="text-xl font-extrabold text-slate-800 tabular-nums">
            {nvrPassed.toLocaleString()} <span className="text-slate-400 text-sm font-bold">/ {nvrTotal.toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-indigo-600 font-semibold">{nvrPct}% Recording</div>
          <div className="h-1.5 rounded-full bg-indigo-100 mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500 transition-all duration-1000" style={{ width: `${nvrPct}%` }} />
          </div>
        </div>
      </div>

      <div className="soc-navy rounded-2xl p-3 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-3">
            <div className="text-[11px] font-bold text-slate-200 mb-2">Camera Timeline (Last 7 Days) · ไทม์ไลน์ 7 วัน</div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 11, color: '#e2e8f0' }}
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as { day: string; date: string } | undefined;
                      return p ? `${p.day} ${p.date}` : '';
                    }}
                  />
                  {nvrTotal > 0 && <ReferenceLine y={nvrTotal} stroke="#f43f5e" strokeDasharray="4 3" />}
                  <Bar dataKey="passed" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {timeline.map((t, i) => (
                      <Cell key={i} fill={t.passed >= nvrTotal && nvrTotal > 0 ? '#34d399' : t.passed > 0 ? '#2dd4bf' : '#334155'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-300">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400" /> Passed · ผ่าน</span>
              <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-rose-400" /> Target · เป้าหมาย {nvrTotal}</span>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col items-center justify-center">
            <div className="text-[11px] font-bold text-slate-200 mb-1">Camera Status · สถานะกล้อง</div>
            <div className="w-28 h-28 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: 'Online', value: cctvOnline }, { name: 'Offline', value: cctvOff }]} dataKey="value" innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={450} strokeWidth={0} isAnimationActive={false}>
                    <Cell fill="#2dd4bf" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-2 space-y-1 text-[11px]">
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1">
                <span className="flex items-center gap-1.5 text-slate-200"><span className="w-2 h-2 rounded-full bg-teal-400" /> Online</span>
                <span className="font-bold text-slate-100 tabular-nums">{cctvOnline.toLocaleString()} <span className="text-teal-300">{cctvPct}%</span></span>
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1">
                <span className="flex items-center gap-1.5 text-slate-200"><span className="w-2 h-2 rounded-full bg-rose-500" /> Offline</span>
                <span className="font-bold text-slate-100 tabular-nums">{cctvOff.toLocaleString()} <span className="text-rose-300">{100 - cctvPct}%</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
