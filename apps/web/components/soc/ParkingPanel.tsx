'use client';

import React from 'react';
import { Car, Bike } from 'lucide-react';

export interface LotDatum {
  label: string;
  used: number;
  capacity: number;
  color: string;
}

export function buildLotData(
  carBreakdown: Record<string, number>,
  motoBreakdown: Record<string, number>,
): { lots: LotDatum[]; moto: LotDatum | null } {
  // Ordered 7 standard BPI parking lots
  const defaultLots: LotDatum[] = [
    { label: 'L1', used: 93, capacity: 97, color: '#D97706' },
    { label: 'L2', used: 14, capacity: 114, color: '#0052CC' },
    { label: 'L3/1', used: 72, capacity: 100, color: '#0052CC' },
    { label: 'L3/2', used: 159, capacity: 264, color: '#0052CC' },
    { label: 'L4', used: 415, capacity: 415, color: '#DC2626' },
    { label: 'L5', used: 48, capacity: 53, color: '#D97706' },
    { label: 'LB9', used: 119, capacity: 129, color: '#D97706' },
  ];

  if (carBreakdown && Object.keys(carBreakdown).length > 0) {
    const mapping: Record<string, { label: string; cap: number }> = {
      'ลานรถยนต์ 1': { label: 'L1', cap: 97 },
      'ลานรถยนต์ 2': { label: 'L2', cap: 114 },
      'ลานรถยนต์ 3/1': { label: 'L3/1', cap: 100 },
      'ลานรถยนต์ 3/2': { label: 'L3/2', cap: 264 },
      'ลานรถยนต์ 4': { label: 'L4', cap: 415 },
      'ลานรถยนต์ 5': { label: 'L5', cap: 53 },
      'ลานรถยนต์ B.9': { label: 'LB9', cap: 129 },
    };

    const parsedLots = defaultLots.map((def) => {
      for (const [k, v] of Object.entries(carBreakdown)) {
        for (const [mapKey, meta] of Object.entries(mapping)) {
          if (k.includes(mapKey) && meta.label === def.label) {
            const pct = Math.round((v / meta.cap) * 100);
            const color = pct >= 100 ? '#DC2626' : pct >= 80 ? '#D97706' : '#0052CC';
            return { label: meta.label, used: v, capacity: meta.cap, color };
          }
        }
      }
      return def;
    });

    return { lots: parsedLots, moto: { label: 'Motorcycle', used: 551, capacity: 757, color: '#00A3E0' } };
  }

  return { lots: defaultLots, moto: { label: 'Motorcycle', used: 551, capacity: 757, color: '#00A3E0' } };
}

interface ParkingPanelProps {
  used: number;
  capacity: number;
  lots: LotDatum[];
  moto: LotDatum | null;
  updatedLabel?: string | null;
  carsToday?: number;
  carCapacity?: number;
  motoToday?: number;
  motoCapacity?: number;
  onDispatchParking?: (lot: LotDatum) => void;
}

export function ParkingPanel({
  used,
  capacity,
  lots,
  carsToday = 8,
  carCapacity = 1075,
  motoToday = 551,
  motoCapacity = 757,
  onDispatchParking,
}: ParkingPanelProps) {
  const totalOccupiedPct = Math.round(((carsToday + motoToday) / (carCapacity + motoCapacity)) * 100) || 31;
  const carPct = Math.round((carsToday / carCapacity) * 100);
  const motoPct = Math.round((motoToday / motoCapacity) * 100);

  // SVG Gauge calculations
  const gaugeRadius = 40;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const carOffset = gaugeCircumference - (carPct / 100) * gaugeCircumference;
  const motoOffset = gaugeCircumference - (motoPct / 100) * gaugeCircumference;

  return (
    <section className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#001433]/5 text-[#0052CC] border border-blue-900/10 flex items-center justify-center flex-shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Traffic & Parking Management
              </h2>
              <p className="text-[11px] text-slate-500 leading-tight">
                พื้นที่จอดรถและการจราจร
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wide bg-blue-50 text-[#0052CC] border border-blue-200/70">
            <span>{totalOccupiedPct}% OCCUPIED</span>
          </div>
        </div>

        {/* Dual Gauges Section (Cars vs Moto) */}
        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Cars Gauge */}
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={gaugeRadius}
                  className="stroke-slate-200"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={gaugeRadius}
                  stroke="#0052CC"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={carOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <Car className="w-4 h-4 text-[#0052CC] mb-0.5" />
                <span className="text-2xl font-black font-mono tabular-nums text-slate-900 leading-none">{carPct}%</span>
                <span className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">
                  {carsToday} / {carCapacity.toLocaleString()}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 mt-1.5">
              Cars · รถยนต์
            </span>
          </div>

          {/* Motorcycle Gauge */}
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={gaugeRadius}
                  className="stroke-slate-200"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={gaugeRadius}
                  stroke="#00A3E0"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={motoOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <Bike className="w-4 h-4 text-[#00A3E0] mb-0.5" />
                <span className="text-2xl font-black font-mono tabular-nums text-slate-900 leading-none">{motoPct}%</span>
                <span className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">
                  {motoToday} / {motoCapacity.toLocaleString()}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 mt-1.5">
              Moto · มอเตอร์ไซค์
            </span>
          </div>
        </div>
      </div>

      {/* Parking Lots Occupancy Matrix */}
      <div className="pt-2.5 border-t border-slate-200/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-mono uppercase tracking-wider font-bold text-slate-800 text-[11px]">
            Parking Lots Occupancy Matrix
          </span>
          <span className="text-[10px] font-mono text-slate-500">{lots.length} LOTS</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {lots.map((lot) => {
            const pct = Math.round((lot.used / lot.capacity) * 100);
            const isFull = pct >= 100;
            const isWarning = pct >= 80 && !isFull;
            const textColor = isFull ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-[#0052CC]';
            const barColor = isFull ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-[#0052CC]';

            return (
              <div
                key={lot.label}
                onClick={() => isFull && onDispatchParking?.(lot)}
                className={`bg-slate-50/80 border border-slate-200/70 rounded p-1.5 flex flex-col items-center transition-all ${
                  isFull ? 'cursor-pointer hover:border-rose-400 hover:bg-rose-50/70 hover:shadow-2xs active:scale-95' : ''
                }`}
                title={isFull ? `คลิกเพื่อสั่งการด่วนไปยัง รปภ. จราจร: จัดการลานจอดรถ ${lot.label} เต็ม 100%` : undefined}
              >
                <div className="text-[11px] font-mono font-bold text-slate-900 leading-tight">{lot.label}</div>
                <div className="text-[9px] font-mono tabular-nums text-slate-500 leading-tight mt-0.5">
                  {lot.used}/{lot.capacity}
                </div>
                {/* Micro Progress Bar */}
                <div className="w-full h-1 bg-slate-200 rounded-xs mt-1.5 overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className={`text-[10px] font-mono tabular-nums font-bold mt-1 ${textColor}`}>
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
