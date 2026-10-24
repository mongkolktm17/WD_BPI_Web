'use client';

import React from 'react';
import { Users, Video, Server, Car, Bike, ShieldCheck } from 'lucide-react';

interface TopKpiRowProps {
  guardsTotal: number;
  guardsContract: number;
  cctvOnline: number;
  cctvTotal: number;
  nvrPassed: number;
  nvrTotal: number;
  carsToday: number;
  carCapacity: number;
  motoToday: number;
  motoCapacity: number;
  equipmentPassed: number;
  equipmentTotal: number;
}

export function TopKpiRow({
  guardsTotal,
  guardsContract,
  cctvOnline,
  cctvTotal,
  nvrPassed,
  nvrTotal,
  carsToday,
  carCapacity,
  motoToday,
  motoCapacity,
  equipmentPassed,
  equipmentTotal,
}: TopKpiRowProps) {
  const guardsPct = guardsContract > 0 ? Math.round((guardsTotal / guardsContract) * 100) : 100;
  const cctvPct = cctvTotal > 0 ? Math.round((cctvOnline / cctvTotal) * 100) : 100;
  const nvrPct = nvrTotal > 0 ? Math.round((nvrPassed / nvrTotal) * 100) : 0;
  const carPct = carCapacity > 0 ? Math.round((carsToday / carCapacity) * 100) : 0;
  const motoPct = motoCapacity > 0 ? Math.round((motoToday / motoCapacity) * 100) : 0;
  const equipPct = equipmentTotal > 0 ? Math.round((equipmentPassed / equipmentTotal) * 100) : 100;

  const kpis = [
    {
      id: 'guards',
      title: 'Active Security Force',
      subTitle: 'กำลังพลเวรปฏิบัติการ',
      value: guardsTotal.toLocaleString(),
      max: `${guardsContract.toLocaleString()} นาย`,
      percentage: `${guardsPct}%`,
      status: guardsPct >= 100 ? 'NOMINAL' : 'DEFICIT',
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      accentColor: '#0052cc',
      icon: Users,
    },
    {
      id: 'cctv',
      title: 'Cameras Online',
      subTitle: 'กล้องวงจรปิดพร้อมใช้งาน',
      value: cctvOnline.toLocaleString(),
      max: `${cctvTotal.toLocaleString()} จุด`,
      percentage: `${cctvPct}%`,
      status: cctvPct >= 100 ? '100% ONLINE' : `${cctvTotal - cctvOnline} OFFLINE`,
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      accentColor: '#00a3e0',
      icon: Video,
    },
    {
      id: 'nvr',
      title: 'NVR ≥ 62 Days Retention',
      subTitle: 'ระบบบันทึกภาพผ่านมาตรฐาน',
      value: nvrPassed.toLocaleString(),
      max: `${nvrTotal.toLocaleString()} NVR`,
      percentage: `${nvrPct}%`,
      status: `${nvrPct}% MET`,
      statusColor: 'text-sky-800 bg-sky-50 border-sky-200',
      accentColor: '#0052cc',
      icon: Server,
    },
    {
      id: 'cars',
      title: 'Vehicles (Cars)',
      subTitle: 'รถยนต์ในพื้นที่โรงงาน',
      value: carsToday.toLocaleString(),
      max: `${carCapacity.toLocaleString()} คัน`,
      percentage: `${carPct}%`,
      status: `${carPct}% OCCUPIED`,
      statusColor: 'text-slate-700 bg-slate-100 border-slate-200',
      accentColor: '#0284c7',
      icon: Car,
    },
    {
      id: 'moto',
      title: 'Motorcycles',
      subTitle: 'รถจักรยานยนต์ในพื้นที่',
      value: motoToday.toLocaleString(),
      max: `${motoCapacity.toLocaleString()} คัน`,
      percentage: `${motoPct}%`,
      status: `${motoPct}% OCCUPIED`,
      statusColor: 'text-amber-800 bg-amber-50 border-amber-200',
      accentColor: '#d97706',
      icon: Bike,
    },
    {
      id: 'equipment',
      title: 'Physical Access Equip.',
      subTitle: 'อุปกรณ์ตรวจค้นผ่านเกณฑ์',
      value: equipmentPassed.toLocaleString(),
      max: `${equipmentTotal.toLocaleString()} ชุด`,
      percentage: `${equipPct}%`,
      status: 'VERIFIED',
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      accentColor: '#059669',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div
            key={k.id}
            className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            {/* Top hairline indicator colored by metric type */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5 transition-opacity opacity-75 group-hover:opacity-100"
              style={{ backgroundColor: k.accentColor }}
            />

            {/* Header: Label + Technical Icon */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {k.title}
              </span>
              <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
            </div>

            {/* Main Numeric Telemetry */}
            <div className="my-1">
              <div className="flex items-baseline gap-1 leading-none">
                <span className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
                  {k.value}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 font-mono truncate">
                  / {k.max}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 truncate">
                {k.subTitle}
              </div>
            </div>

            {/* Bottom Status Tag + Mini Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 mt-1">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, parseInt(k.percentage, 10))}%`,
                    backgroundColor: k.accentColor,
                  }}
                />
              </div>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${k.statusColor}`}
              >
                {k.percentage}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
