'use client';

import React from 'react';
import {
  BatteryMedium, Lightbulb, Radio, Volume2, Check, X, TriangleAlert, ScanLine, DoorOpen,
} from 'lucide-react';
import { Ring } from './Ring';
import type { ZoneStat, CheckStat } from './soc-utils';

function CheckCard({
  icon: Icon,
  labelEn,
  labelTh,
  pass,
  fail,
}: {
  icon: React.ElementType;
  labelEn: string;
  labelTh: string;
  pass: number;
  fail: number;
}) {
  const total = pass + fail;
  const state: 'ok' | 'fail' | 'empty' = total === 0 ? 'empty' : fail === 0 ? 'ok' : 'fail';
  return (
    <div className={`rounded-2xl border p-3 flex items-center gap-3 ${
      state === 'empty' ? 'bg-slate-50/60 border-slate-100' : 'bg-emerald-50/60 border-emerald-100/80'
    }`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
        state === 'empty' ? 'bg-slate-100' : 'bg-emerald-100/80'
      }`}>
        <Icon className={`w-5 h-5 ${state === 'empty' ? 'text-slate-400' : 'text-emerald-700'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-slate-700 truncate">{labelEn}</div>
        <div className="text-[9px] text-slate-400">{labelTh}</div>
        <div className="flex items-center gap-3 mt-0.5 text-sm font-extrabold tabular-nums">
          <span className={state === 'empty' ? 'text-slate-400' : 'text-emerald-600'}>{pass} <span className="text-[9px] font-semibold">Pass</span></span>
          <span className={state === 'fail' ? 'text-rose-500' : 'text-slate-300'}>{fail} <span className="text-[9px] font-semibold">Fail</span></span>
        </div>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        state === 'ok' ? 'bg-emerald-500' : state === 'fail' ? 'bg-rose-500' : 'bg-slate-300'
      }`}>
        {state === 'empty' ? <span className="text-white text-xs font-bold">–</span>
          : state === 'ok' ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
      </div>
    </div>
  );
}

/** Hand-held metal detector panel: 4 check cards + totals. */
export function HandheldPanel({
  checks,
  totalReports,
  updatedLabel,
}: {
  checks: { battery: CheckStat; led: CheckStat; detection: CheckStat; alarm: CheckStat };
  totalReports: number;
  updatedLabel: string | null;
}) {
  const pass = checks.battery.pass + checks.led.pass + checks.detection.pass + checks.alarm.pass;
  const fail = checks.battery.fail + checks.led.fail + checks.detection.fail + checks.alarm.fail;
  return (
    <section className="soc-glass rounded-[20px] p-4 md:p-5 h-full">
      <div className="flex items-center gap-2 mb-1">
        <ScanLine className="w-5 h-5 text-blue-700" />
        <h2 className="text-sm font-extrabold text-slate-800">Hand Held Metal Detector</h2>
      </div>
      <div className="text-[10px] text-slate-400 mb-3">
        เครื่องตรวจโลหะแบบมือถือ · Total Reports: {totalReports}
        {updatedLabel ? ` · Last Update: ${updatedLabel}` : ''}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <CheckCard icon={BatteryMedium} labelEn="Battery Check" labelTh="ตรวจแบตเตอรี่" pass={checks.battery.pass} fail={checks.battery.fail} />
        <CheckCard icon={Lightbulb} labelEn="LED Power" labelTh="ไฟ LED" pass={checks.led.pass} fail={checks.led.fail} />
        <CheckCard icon={Radio} labelEn="Detection Range" labelTh="ระยะตรวจจับ" pass={checks.detection.pass} fail={checks.detection.fail} />
        <CheckCard icon={Volume2} labelEn="Audio Alert" labelTh="เสียงเตือน" pass={checks.alarm.pass} fail={checks.alarm.fail} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 py-2 text-center flex items-center justify-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></span>
          <span className="text-lg font-extrabold text-emerald-700 tabular-nums">{pass}</span>
          <span className="text-[10px] font-semibold text-emerald-600">Total Pass · ผ่านทั้งหมด</span>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-100 py-2 text-center flex items-center justify-center gap-2">
          <span className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></span>
          <span className="text-lg font-extrabold text-rose-600 tabular-nums">{fail}</span>
          <span className="text-[10px] font-semibold text-rose-500">Total Fail · ไม่ผ่าน</span>
        </div>
      </div>
    </section>
  );
}

/** Walkthrough metal detector panel: Zone 1-6 cards + totals. */
export function WalkthroughPanel({
  zones,
  totalReports,
  updatedLabel,
}: {
  zones: ZoneStat[];
  totalReports: number;
  updatedLabel: string | null;
}) {
  const pass = zones.reduce((a, z) => a + z.pass, 0);
  const fail = zones.reduce((a, z) => a + z.fail, 0);
  return (
    <section className="soc-glass rounded-[20px] p-4 md:p-5 h-full">
      <div className="flex items-center gap-2 mb-1">
        <DoorOpen className="w-5 h-5 text-blue-700" />
        <h2 className="text-sm font-extrabold text-slate-800">Walkthrough Metal Detector</h2>
      </div>
      <div className="text-[10px] text-slate-400 mb-3">
        เครื่องตรวจโลหะแบบเดินผ่าน · Total Reports: {totalReports}
        {updatedLabel ? ` · Last Update: ${updatedLabel}` : ''}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {zones.map((z, i) => {
          const total = z.pass + z.fail;
          const pct = total > 0 ? Math.round((z.pass / total) * 100) : null;
          return (
            <div key={`${z.name}-${i}`} className="rounded-2xl bg-slate-50/70 border border-slate-100 p-2.5 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <DoorOpen className="w-5 h-5 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-slate-700">{z.name}</div>
                <div className="flex items-center gap-2 text-sm font-extrabold tabular-nums">
                  <span className="text-emerald-600">{z.pass} <span className="text-[9px] font-semibold">Pass</span></span>
                  <span className={z.fail > 0 ? 'text-rose-500' : 'text-slate-300'}>{z.fail} <span className="text-[9px] font-semibold">Fail</span></span>
                </div>
                <div className={`flex items-center gap-1 text-[9px] font-semibold ${pct === null ? 'text-slate-400' : z.fail > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pct === null ? 'bg-slate-300' : z.fail > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  {pct === null ? 'No data · ยังไม่มีข้อมูล' : z.fail > 0 ? 'Check · ตรวจสอบ' : 'Healthy · ปกติ'}
                </div>
              </div>
              <Ring percent={pct ?? 0} size={46} stroke={5} from={pct === null ? '#cbd5e1' : '#10b981'} to={pct === null ? '#e2e8f0' : '#34d399'}>
                <span className="text-[9px] font-extrabold text-slate-700 tabular-nums">{pct === null ? '–' : `${pct}%`}</span>
              </Ring>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2.5 mt-2.5">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 py-2 text-center flex items-center justify-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></span>
          <span className="text-lg font-extrabold text-emerald-700 tabular-nums">{pass}</span>
          <span className="text-[10px] font-semibold text-emerald-600">Total Pass</span>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-100 py-2 text-center flex items-center justify-center gap-2">
          <span className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></span>
          <span className="text-lg font-extrabold text-rose-600 tabular-nums">{fail}</span>
          <span className="text-[10px] font-semibold text-rose-500">Total Fail</span>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-100 py-2 text-center flex items-center justify-center gap-2">
          <TriangleAlert className="w-4 h-4 text-amber-500" />
          <span className="text-lg font-extrabold text-amber-600 tabular-nums">0</span>
          <span className="text-[10px] font-semibold text-amber-600">Total Other · อื่นๆ</span>
        </div>
      </div>
    </section>
  );
}
