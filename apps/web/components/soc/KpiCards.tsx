'use client';

import React from 'react';
import { Sun, Moon, Users, CarFront } from 'lucide-react';

/** Gradient KPI card: icon, bilingual label, big fraction value, progress bar. */
export function KpiCard({
  icon,
  labelEn,
  labelTh,
  sub,
  value,
  total,
  gradient,
  barFrom,
  barTo,
}: {
  icon: 'sun' | 'moon' | 'users' | 'car';
  labelEn: string;
  labelTh: string;
  sub: string;
  value: number;
  total: number;
  gradient: string;
  barFrom: string;
  barTo: string;
}) {
  const Icon = icon === 'sun' ? Sun : icon === 'moon' ? Moon : icon === 'car' ? CarFront : Users;
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${gradient} p-4 md:p-5 text-white shadow-lg`}>
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10" />
      <div className="relative flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white/80">
            {labelEn} <span className="text-white/60 font-normal hidden xl:inline">· {sub}</span>
          </div>
          <div className="text-[10px] text-white/60">{labelTh}</div>
          <div className="text-2xl md:text-[28px] font-extrabold leading-tight tabular-nums">
            {value.toLocaleString()} <span className="text-white/60 text-lg font-bold">/ {total.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="relative mt-3 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-black/20 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barFrom}, ${barTo})` }}
          />
        </div>
        <span className="text-[11px] font-bold text-white/90 tabular-nums whitespace-nowrap">{pct}% Active</span>
      </div>
    </div>
  );
}

/** White glass quick-overview card: day / night / total mini stats. */
export function QuickOverview({ day, night, total }: { day: number; night: number; total: number }) {
  const cells = [
    { labelEn: 'Day Shift', labelTh: 'กะกลางวัน', value: day, dot: 'bg-emerald-500' },
    { labelEn: 'Night Shift', labelTh: 'กะกลางคืน', value: night, dot: 'bg-teal-500' },
    { labelEn: 'Total', labelTh: 'รวมทั้งหมด', value: total, dot: 'bg-rose-500' },
  ];
  return (
    <div className="soc-glass rounded-[20px] p-4 md:p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-sm font-extrabold text-slate-800">Quick Overview</div>
          <div className="text-[10px] text-slate-400">ภาพรวมด่วน · Security Personnel</div>
        </div>
        <Users className="w-5 h-5 text-slate-300" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 mt-2">
        {cells.map((c) => (
          <div key={c.labelEn} className="text-center px-1">
            <div className="text-[10px] font-semibold text-slate-500">{c.labelEn}</div>
            <div className="text-[9px] text-slate-400 mb-1">{c.labelTh}</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              <span className="text-xl md:text-2xl font-extrabold text-slate-800 tabular-nums">
                {c.value.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
