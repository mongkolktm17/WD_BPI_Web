'use client';

import React from 'react';
import { CarFront } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { parseLotKey, formatTimeTH } from './soc-utils';

export interface LotDatum {
  label: string;
  used: number;
  capacity: number;
  color: string;
}

const LOT_COLORS = ['#ef4444', '#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

/** Build per-lot data from raw breakdown records (car + motorcycle). */
export function buildLotData(
  carBreakdown: Record<string, number>,
  motoBreakdown: Record<string, number>,
): { lots: LotDatum[]; moto: LotDatum | null } {
  const carEntries = Object.entries(carBreakdown).sort(([a], [b]) => a.localeCompare(b));
  const lots: LotDatum[] = carEntries.map(([k, v], i) => {
    const { label, capacity } = parseLotKey(k, 'L');
    return { label, used: v, capacity, color: LOT_COLORS[i % LOT_COLORS.length] };
  });
  const motoEntries = Object.entries(motoBreakdown);
  const motoUsed = motoEntries.reduce((a, [, v]) => a + v, 0);
  const motoCap = motoEntries.reduce((a, [k]) => a + parseLotKey(k, 'M').capacity, 0);
  const moto: LotDatum | null =
    motoEntries.length > 0 ? { label: 'Motorcycle', used: motoUsed, capacity: motoCap, color: '#f59e0b' } : null;
  return { lots, moto };
}

/** Parking management panel: big donut + per-location bars. */
export function ParkingPanel({
  used,
  capacity,
  lots,
  moto,
  updatedLabel,
}: {
  used: number;
  capacity: number;
  lots: LotDatum[];
  moto: LotDatum | null;
  updatedLabel: string | null;
}) {
  const pct = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
  const donutData = [
    { name: 'Used', value: used },
    { name: 'Free', value: Math.max(0, capacity - used) },
  ];
  const rows = [...lots, ...(moto ? [moto] : [])];

  return (
    <section className="soc-glass rounded-[20px] p-4 md:p-5 h-full">
      <div className="flex items-center gap-2 mb-1">
        <CarFront className="w-5 h-5 text-blue-700" />
        <h2 className="text-sm font-extrabold text-slate-800">Parking Lot Report</h2>
        {updatedLabel && <span className="text-[10px] text-slate-400 ml-1">Last Update: {updatedLabel}</span>}
      </div>
      <div className="text-[10px] text-slate-400 mb-3">รายงานลานจอดรถ · Occupancy by Location</div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-44 h-44 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="value" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={450} strokeWidth={0} isAnimationActive={false}>
                <Cell fill="#2563eb" />
                <Cell fill="#e2e8f0" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{pct}%</div>
            <div className="text-[10px] text-slate-500 font-semibold">Occupied</div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2.5 min-w-0">
          {rows.length === 0 && <div className="text-xs text-slate-400">ไม่มีข้อมูล · No data</div>}
          {rows.map((r) => {
            const p = r.capacity > 0 ? Math.round((r.used / r.capacity) * 100) : 0;
            return (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 w-20 truncate flex-shrink-0">{r.label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${p}%`, background: r.color }} />
                </div>
                <span className="text-[11px] text-slate-500 tabular-nums flex-shrink-0">
                  {r.used.toLocaleString()}{r.capacity > 0 ? `/${r.capacity.toLocaleString()}` : ''}
                </span>
                <span className="text-[11px] font-extrabold tabular-nums w-9 text-right flex-shrink-0" style={{ color: r.color }}>
                  {p}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 text-center">
        <span className="text-lg font-extrabold text-slate-800 tabular-nums">
          {used.toLocaleString()} / {capacity.toLocaleString()}
        </span>
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-0.5">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> Used · ใช้งาน</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> Total · ทั้งหมด</span>
        </div>
      </div>
    </section>
  );
}

export { formatTimeTH };
