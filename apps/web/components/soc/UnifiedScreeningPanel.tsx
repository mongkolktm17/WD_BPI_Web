'use client';

import React from 'react';
import {
  ScanLine, DoorOpen, BatteryMedium, Lightbulb, Radio, Volume2, Check, X, ShieldCheck,
} from 'lucide-react';
import type { ZoneStat, CheckStat } from './soc-utils';

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
  updatedLabel: string | null;
}

function MiniCheckItem({
  icon: Icon,
  label,
  pass,
  fail,
}: {
  icon: React.ElementType;
  label: string;
  pass: number;
  fail: number;
}) {
  const isFail = fail > 0;
  return (
    <div
      className={`rounded-xl p-2 flex items-center justify-between border ${
        isFail
          ? 'bg-rose-50/70 border-rose-200'
          : 'bg-slate-50/80 border-slate-200/80'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isFail ? 'bg-rose-100 text-rose-600' : 'bg-blue-100/70 text-blue-600'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-bold text-slate-700 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 tabular-nums text-xs font-black">
        <span className="text-emerald-600">{pass}P</span>
        {isFail && <span className="text-rose-600 font-bold">/ {fail}F</span>}
        <span
          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${
            isFail ? 'bg-rose-500' : 'bg-emerald-500'
          }`}
        >
          {isFail ? <X className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />}
        </span>
      </div>
    </div>
  );
}

/**
 * Pillar 4: Physical Screening & Access Equipment
 * Consolidates Handheld and Walkthrough metal detectors into a single high-efficiency panel.
 * Saves 50%+ vertical height compared to two oversized stacked panels.
 */
export function UnifiedScreeningPanel({
  handheldChecks,
  handheldTotalReports,
  walkthroughZones,
  walkthroughTotalReports,
  updatedLabel,
}: UnifiedScreeningPanelProps) {
  const hhPass =
    handheldChecks.battery.pass +
    handheldChecks.led.pass +
    handheldChecks.detection.pass +
    handheldChecks.alarm.pass;
  const hhFail =
    handheldChecks.battery.fail +
    handheldChecks.led.fail +
    handheldChecks.detection.fail +
    handheldChecks.alarm.fail;
  const hhTotal = hhPass + hhFail;
  const hhPct = hhTotal > 0 ? Math.round((hhPass / hhTotal) * 100) : 100;

  const wtPass = walkthroughZones.reduce((a, z) => a + z.pass, 0);
  const wtFail = walkthroughZones.reduce((a, z) => a + z.fail, 0);
  const wtTotal = wtPass + wtFail;
  const wtPct = wtTotal > 0 ? Math.round((wtPass / wtTotal) * 100) : 100;

  const allPass = hhPass + wtPass;
  const allFail = hhFail + wtFail;
  const totalChecks = hhTotal + wtTotal;
  const overallRate = totalChecks > 0 ? Math.round((allPass / totalChecks) * 100) : 100;

  return (
    <section className="soc-glass rounded-[20px] p-3.5 md:p-4 h-full flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs md:text-sm font-extrabold text-slate-800 leading-tight">
                Physical Screening & Access Equipment
              </h2>
              <p className="text-[10px] text-slate-400 leading-tight">
                อุปกรณ์ตรวจค้นและจุดคัดกรองบุคคล
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>{overallRate}% Equipment Pass Rate</span>
            </div>
            {updatedLabel && (
              <span className="hidden sm:inline text-[9px] text-slate-400">
                อัปเดต: {updatedLabel}
              </span>
            )}
          </div>
        </div>

        {/* 2-Column Split: Left = Handheld, Right = Walkthrough */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
          {/* Left Column: Handheld Metal Detectors */}
          <div className="rounded-xl bg-white/70 border border-slate-200/80 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <ScanLine className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-800">
                  Handheld Detectors · เครื่องตรวจมือถือ
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-500">
                {hhPass}/{hhTotal} Pass ({hhPct}%)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <MiniCheckItem
                icon={BatteryMedium}
                label="Battery Check"
                pass={handheldChecks.battery.pass}
                fail={handheldChecks.battery.fail}
              />
              <MiniCheckItem
                icon={Lightbulb}
                label="LED Power"
                pass={handheldChecks.led.pass}
                fail={handheldChecks.led.fail}
              />
              <MiniCheckItem
                icon={Radio}
                label="Detection Range"
                pass={handheldChecks.detection.pass}
                fail={handheldChecks.detection.fail}
              />
              <MiniCheckItem
                icon={Volume2}
                label="Audio Alert"
                pass={handheldChecks.alarm.pass}
                fail={handheldChecks.alarm.fail}
              />
            </div>

            <div className="flex items-center justify-between pt-1.5 mt-1 text-[9px] text-slate-400">
              <span>รายงานทั้งหมด: {handheldTotalReports} รายการ</span>
              <span className={hhFail > 0 ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>
                {hhFail > 0 ? `พบปัญหา ${hhFail} จุด` : 'ปกติทุกฟังก์ชัน'}
              </span>
            </div>
          </div>

          {/* Right Column: Walkthrough Metal Detectors */}
          <div className="rounded-xl bg-white/70 border border-slate-200/80 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-800">
                  Walkthrough Detectors · ซุ้มเดินผ่าน 6 โซน
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-500">
                {wtPass}/{wtTotal} Pass ({wtPct}%)
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {walkthroughZones.map((z, idx) => {
                const zFail = z.fail > 0;
                return (
                  <div
                    key={z.name || idx}
                    className={`rounded-lg p-1.5 text-center border ${
                      zFail
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-slate-50/80 border-slate-200/70'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-700 truncate">
                      {z.name}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[9px] font-extrabold mt-0.5 tabular-nums">
                      <span className="text-emerald-600">{z.pass}P</span>
                      {zFail && <span className="text-rose-500">/{z.fail}F</span>}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5 text-[8px] font-semibold text-slate-400">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          zFail ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span>{zFail ? 'Check' : 'Normal'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1.5 mt-1 text-[9px] text-slate-400">
              <span>รายงานทั้งหมด: {walkthroughTotalReports} รายการ</span>
              <span className={wtFail > 0 ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>
                {wtFail > 0 ? `พบข้อบกพร่อง ${wtFail} จุด` : 'พร้อมใช้งาน 100%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Bottom Strip */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-[10px] mt-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-slate-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ผ่านการทดสอบรวม (Passed): <strong className="text-emerald-600 tabular-nums">{allPass}</strong>
          </span>
          <span className="flex items-center gap-1 text-slate-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            ไม่ผ่าน (Failed): <strong className="text-rose-600 tabular-nums">{allFail}</strong>
          </span>
        </div>
        <span className="text-slate-400">
          มาตรฐานความปลอดภัยโรงงาน Western Digital Storage Technologies (Thailand)
        </span>
      </div>
    </section>
  );
}
