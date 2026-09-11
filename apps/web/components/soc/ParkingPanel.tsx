'use client';

import React from 'react';
import { CarFront, Bike } from 'lucide-react';
import { parseLotKey, formatTimeTH } from './soc-utils';

export interface LotDatum {
  label: string;
  used: number;
  capacity: number;
  color: string;
}

const LOT_COLORS = ['#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#6366f1', '#8b5cf6'];

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
    motoEntries.length > 0 ? { label: 'Motorcycle', used: motoUsed, capacity: motoCap, color: '#10b981' } : null;
  return { lots, moto };
}

interface ParkingPanelProps {
  used: number;
  capacity: number;
  lots: LotDatum[];
  moto: LotDatum | null;
  updatedLabel: string | null;
}

/**
 * Pillar 3: Traffic & Parking Management
 * Compact Executive view: Dual Car/Moto meters and mini lot occupancy matrix.
 * Removes redundant giant donut and separate top-level KPI card.
 */
export function ParkingPanel({
  used,
  capacity,
  lots,
  moto,
  updatedLabel,
}: ParkingPanelProps) {
  const totalPct = capacity > 0 ? Math.round((used / capacity) * 100) : 0;

  // Split car vs moto metrics
  const motoUsed = moto?.used ?? 0;
  const motoCap = moto?.capacity ?? 757;
  const motoPct = motoCap > 0 ? Math.round((motoUsed / motoCap) * 100) : 0;

  const carUsed = Math.max(0, used - motoUsed);
  const carCap = Math.max(0, capacity - motoCap);
  const carPct = carCap > 0 ? Math.round((carUsed / carCap) * 100) : 0;

  return (
    <section className="soc-glass rounded-[20px] p-3.5 md:p-4 h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <CarFront className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs md:text-sm font-extrabold text-slate-800 leading-tight">
                Traffic & Parking Management
              </h2>
              <p className="text-[10px] text-slate-400 leading-tight">
                พื้นที่จอดรถและการจราจร
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span>{totalPct}% Total Occupied</span>
          </div>
        </div>

        {/* Dual Primary Category Bars (Car vs Motorcycle) */}
        <div className="grid grid-cols-2 gap-2 mt-2.5 mb-2.5">
          {/* Cars */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CarFront className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-700">Cars · รถยนต์</span>
              </div>
              <span className="text-[10px] font-extrabold text-blue-600">{carPct}%</span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {carUsed.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                / {carCap.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-700"
                style={{ width: `${carPct}%` }}
              />
            </div>
          </div>

          {/* Motorcycles */}
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-700">Moto · มอเตอร์ไซค์</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-600">{motoPct}%</span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {motoUsed.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                / {motoCap.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${motoPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Compact Mini Lots Matrix */}
      <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-2.5 mt-auto">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1.5">
          <span>Parking Lots Occupancy Matrix · รายลาน</span>
          <span className="text-[9px] text-slate-400">{lots.length} ลานรถยนต์</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {lots.slice(0, 8).map((lot) => {
            const p = lot.capacity > 0 ? Math.round((lot.used / lot.capacity) * 100) : 0;
            const isHigh = p >= 85;
            return (
              <div
                key={lot.label}
                className={`rounded-lg p-1.5 text-center border ${
                  isHigh ? 'bg-amber-50/80 border-amber-200' : 'bg-white border-slate-200/60 shadow-2xs'
                }`}
              >
                <div className="text-[10px] font-black text-slate-700 leading-tight truncate">
                  {lot.label}
                </div>
                <div className="text-[9px] font-bold text-slate-500 tabular-nums">
                  {lot.used}/{lot.capacity}
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isHigh ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            );
          })}
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

export { formatTimeTH };
