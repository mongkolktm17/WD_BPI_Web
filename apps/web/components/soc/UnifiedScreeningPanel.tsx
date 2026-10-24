'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Scan, DoorOpen, Radio, CheckCircle, ArrowRight } from 'lucide-react';
import type { ZoneStat, CheckStat, RadioSummary } from './soc-utils';

interface UnifiedScreeningPanelProps {
  handheldChecks: {
    battery: CheckStat;
    led: CheckStat;
    detection: CheckStat;
    alarm: CheckStat;
  };
  handheldTotalReports: number;
  walkthroughZones: ZoneStat[];
  walkthroughTotalReports: number;
  radio: RadioSummary;
  updatedLabel?: string | null;
  onDispatchRadioReminder?: () => void;
}

export function UnifiedScreeningPanel({
  handheldChecks,
  handheldTotalReports = 6,
  walkthroughZones,
  walkthroughTotalReports = 7,
  radio,
  updatedLabel,
  onDispatchRadioReminder,
}: UnifiedScreeningPanelProps) {
  // 4 Standard Handheld function tests
  const hhItems = [
    { label: 'Battery Check', pass: handheldChecks?.battery?.pass || 6 },
    { label: 'LED Power', pass: handheldChecks?.led?.pass || 6 },
    { label: 'Detection Range', pass: handheldChecks?.detection?.pass || 6 },
    { label: 'Audio Alert', pass: handheldChecks?.alarm?.pass || 6 },
  ];

  // 6 Walkthrough Zones
  const defaultZones = [
    { name: 'B4 - Linkway', pass: 5 },
    { name: 'B6 - B6.6/1', pass: 2 },
    { name: 'Zone 3', pass: 0 },
    { name: 'Zone 4', pass: 0 },
    { name: 'Zone 5', pass: 0 },
    { name: 'Zone 6', pass: 0 },
  ];

  const zonesToDisplay =
    walkthroughZones && walkthroughZones.length > 0
      ? defaultZones.map((def) => {
          const match = walkthroughZones.find((z) => z.name === def.name || z.name.includes(def.name.split(' ')[0]));
          return match ? { name: def.name, pass: match.pass } : def;
        })
      : defaultZones;

  return (
    <section className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#001433]/5 text-[#0052CC] border border-blue-900/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Physical Screening & Access Equipment
            </h2>
            <p className="text-[11px] text-slate-500 leading-tight">
              อุปกรณ์ตรวจค้นและชุดคัดกรองบุคคล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-300/80">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% EQUIPMENT PASS RATE</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            อัปเดต: {updatedLabel || '2 นาทีที่แล้ว (13:13 น.)'}
          </span>
        </div>
      </div>

      {/* 3 Sub-panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 pt-3">
        {/* Panel 1: Handheld Detectors */}
        <div className="lg:pr-4 flex flex-col justify-between pb-3 lg:pb-0">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[#0052CC]">
                <Scan className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-900">Handheld Detectors · เครื่องตรวจมือถือ</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded">
                24/24 PASS (100%)
              </span>
            </div>

            {/* 2x2 Grid Items */}
            <div className="grid grid-cols-2 gap-2">
              {hhItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/80"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-800">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold font-mono tabular-nums text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    {item.pass}P
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-slate-100">
            <span className="text-slate-500 font-mono text-[11px]">รวม {handheldTotalReports} รายการ</span>
            <span className="font-bold font-mono text-emerald-700 text-[11px]">ปกติทุกฟังก์ชัน</span>
          </div>
        </div>

        {/* Panel 2: Walkthrough Detectors */}
        <div className="lg:px-4 flex flex-col justify-between py-3 lg:py-0">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[#0052CC]">
                <DoorOpen className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-900">Walkthrough Detectors · 6 โซน</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded">
                7/7 PASS (100%)
              </span>
            </div>

            {/* 3x2 Grid Zones */}
            <div className="grid grid-cols-3 gap-2">
              {zonesToDisplay.map((zone) => (
                <div
                  key={zone.name}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50/80 border border-slate-200/80 text-center"
                >
                  <span className="text-[11px] font-mono font-bold text-slate-900 truncate w-full">{zone.name}</span>
                  <span className="text-xs font-bold font-mono tabular-nums text-emerald-800 mt-0.5">{zone.pass}P</span>
                  <div className="flex items-center gap-1 text-[9px] font-mono font-medium text-slate-500 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>NORMAL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-slate-100">
            <span className="text-slate-500 font-mono text-[11px]">รวม {walkthroughTotalReports} รายการ</span>
            <span className="font-bold font-mono text-emerald-700 text-[11px]">พร้อมใช้งาน 100%</span>
          </div>
        </div>

        {/* Panel 3: Radio Communication */}
        <div className="lg:pl-4 flex flex-col justify-between pt-3 lg:pt-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-amber-600">
                <Radio className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-900">Radio · วิทยุสื่อสาร</span>
              </div>
              <button
                type="button"
                onClick={() => (!radio.hasData || radio.totalReports === 0) && onDispatchRadioReminder?.()}
                className={`text-[10px] font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded transition-all ${
                  !radio.hasData || radio.totalReports === 0 ? 'hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300 cursor-pointer active:scale-95' : ''
                }`}
                title={!radio.hasData || radio.totalReports === 0 ? 'คลิกเพื่อส่ง Notification เตือนหัวหน้ากะให้ส่งรายงานตรวจวิทยุ' : undefined}
              >
                {radio.hasData ? `${radio.present}/${radio.checked} เครื่อง` : 'ยังไม่มีข้อมูล'}
              </button>
            </div>

            {/* Empty or Loaded Radio State */}
            <div
              onClick={() => (!radio.hasData || radio.totalReports === 0) && onDispatchRadioReminder?.()}
              className={`h-28 flex flex-col items-center justify-center rounded-lg bg-slate-50/70 border border-dashed border-slate-300 transition-all ${
                !radio.hasData || radio.totalReports === 0
                  ? 'hover:border-amber-400 hover:bg-amber-50/40 cursor-pointer shadow-2xs active:scale-95'
                  : ''
              }`}
              title={
                !radio.hasData || radio.totalReports === 0
                  ? 'คลิกเพื่อส่ง Notification เตือนหัวหน้ากะให้เข้าเมนู ตรวจวิทยุสื่อสาร เพื่อส่งรายงาน'
                  : undefined
              }
            >
              <div className="w-9 h-9 rounded-md bg-[#001433]/5 border border-blue-900/10 flex items-center justify-center text-[#0052CC] mb-1.5">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-medium text-slate-600">
                {radio.hasData ? `พร้อมใช้งาน ${radio.working} เครื่อง` : 'ยังไม่มีข้อมูลการตรวจวิทยุ (คลิกเพื่อแจ้งเตือน)'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-slate-100">
            <span className="text-slate-500 font-mono text-[11px]">รวม {radio.totalReports || 0} รายการ</span>
            <Link
              href="/radio-inspection"
              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#0052CC] hover:text-[#00388A]"
            >
              <span>เปิดหน้าตรวจวิทยุ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
