'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BarChart3,
  Brain,
  ShieldCheck,
  FileCheck2,
  Clock,
  Hourglass,
  Check,
  Cpu,
  AlertCircle,
} from 'lucide-react';

interface AiReportProgressBarProps {
  reportType?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  modelUsed?: string;
  providerUsed?: string;
  estimatedDurationSeconds?: number;
}

interface StepInfo {
  id: number;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  startPct: number;
  endPct: number;
  subStatuses: string[];
}

const STEPS: StepInfo[] = [
  {
    id: 1,
    title: 'รวบรวม Telemetry 5 เสาหลัก',
    shortDesc: 'สถิติประจำวันของโรงงาน',
    icon: BarChart3,
    startPct: 0,
    endPct: 25,
    subStatuses: [
      'กำลังเชื่อมต่อฐานข้อมูลความปลอดภัย SOC...',
      'กำลังสรุปยอดกำลังพล รปภ. PCS ประจำกะกลางวันและกะกลางคืน...',
      'กำลังตรวจเช็กสถานะกล้อง CCTV 815 ตัว และเครื่องบันทึก NVR 62 วัน...',
      'กำลังคำนวณอัตราการใช้พื้นที่ลานจอดรถ และตรวจเช็กวิทยุสื่อสาร 184 เครื่อง...',
    ],
  },
  {
    id: 2,
    title: 'ดึงคลังความรู้ & RAG Context',
    shortDesc: 'บริบทโรงงาน WD และกฎเกณฑ์',
    icon: Brain,
    startPct: 25,
    endPct: 50,
    subStatuses: [
      'กำลังดึงข้อกำหนดและนโยบายความปลอดภัยเฉพาะโรงงาน Western Digital...',
      'กำลังค้นหาและนำกฎที่เรียนรู้จากข้อเสนอแนะของผู้บริหารในอดีตมาประมวลผล...',
      'กำลังจับคู่ตัวอย่างรายงานต้นแบบ (Golden Examples) ที่เคยได้รับอนุมัติ...',
    ],
  },
  {
    id: 3,
    title: 'สังเคราะห์และวิเคราะห์ด้วย AI',
    shortDesc: 'ประเมินความเสี่ยง 4 เสาหลัก',
    icon: Sparkles,
    startPct: 50,
    endPct: 85,
    subStatuses: [
      'กำลังส่งข้อมูลตัวชี้วัดเข้าสู่โมเดล AI เพื่อวิเคราะห์สถานการณ์...',
      'กำลังประเมินระดับความเสี่ยง (Risk Assessment) ในแต่ละโซนและอาคารสำคัญ...',
      'กำลังร่างข้อสั่งการและแผนปฏิบัติการเร่งด่วน 24 ชั่วโมง (Action Plan)...',
      'กำลังตรวจสอบคุณภาพเนื้อหา (ระบบพร้อมสลับโมเดลสำรองอัตโนมัติหากทราฟฟิกหนาแน่น)...',
    ],
  },
  {
    id: 4,
    title: 'จัดโครงสร้าง 4 เสาหลัก & บันทึก DRAFT',
    shortDesc: 'ตรวจสอบความถูกต้องและ PDPA',
    icon: FileCheck2,
    startPct: 85,
    endPct: 100,
    subStatuses: [
      'กำลังจัดรูปแบบตารางสรุป 5 เสาหลัก และไฮไลท์จุดเฝ้าระวัง...',
      'กำลังคัดกรองความปลอดภัยของข้อมูลตามมาตรฐานสากลและ PDPA...',
      'กำลังบันทึกเอกสารฉบับร่าง (DRAFT) เข้าสู่ระบบ พร้อมส่งมอบให้ผู้บริหาร...',
    ],
  },
];

export function AiReportProgressBar({
  reportType = 'DAILY',
  modelUsed = 'gemini-3.8-flash',
  providerUsed = 'gemini',
  estimatedDurationSeconds = 14,
}: AiReportProgressBarProps) {
  const [progress, setProgress] = useState(4);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [microStatus, setMicroStatus] = useState<string>(STEPS[0].subStatuses[0]);

  const startTimeRef = useRef<number>(Date.now());
  const reportTypeLabel =
    reportType === 'DAILY' ? 'ประจำวัน' : reportType === 'WEEKLY' ? 'ประจำสัปดาห์' : 'ประจำเดือน';

  useEffect(() => {
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      // Asymptotic progress calculation
      // Rapid early phase (0-60%), steady middle phase (60-85%), decelerating tail (85-95%)
      const targetSec = Math.max(estimatedDurationSeconds, 12);
      let calculatedProgress = 0;

      if (elapsed <= targetSec) {
        // Smooth ease-out cubic curve up to 88%
        const ratio = elapsed / targetSec;
        calculatedProgress = Math.min(88, Math.round((1 - Math.pow(1 - ratio, 2.2)) * 88));
      } else {
        // Asymptotic tail: gently moves towards 95% while waiting for network/LLM completion
        const extraSec = elapsed - targetSec;
        calculatedProgress = Math.min(95, Math.round(88 + (1 - Math.exp(-extraSec / 10)) * 7));
      }

      const safeProgress = Math.max(4, Math.min(95, calculatedProgress));
      setProgress(safeProgress);

      // Determine active step
      let activeIdx = 0;
      if (safeProgress >= 85) activeIdx = 3;
      else if (safeProgress >= 50) activeIdx = 2;
      else if (safeProgress >= 25) activeIdx = 1;
      else activeIdx = 0;
      setCurrentStepIndex(activeIdx);

      // Determine micro status message based on active step and elapsed time
      const activeStep = STEPS[activeIdx];
      const subList = activeStep.subStatuses;
      const subIdx = Math.floor(elapsed / 2.5) % subList.length;
      setMicroStatus(subList[subIdx]);
    }, 200);

    return () => clearInterval(interval);
  }, [estimatedDurationSeconds]);

  // Calculate estimated remaining seconds
  const remainingSeconds = Math.max(0, estimatedDurationSeconds - elapsedSeconds);
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-6 p-6 sm:p-8 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200/80 shadow-xl shadow-blue-900/5 animate-in fade-in zoom-in-95 duration-300">
      <style>{`
        @keyframes shimmerGlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .shimmer-active {
          animation: shimmerGlide 2s infinite ease-in-out;
        }
      `}</style>
      {/* Top Header with Pulsing AI Orb */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-slate-100">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-500/30 animate-pulse">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-amber-300">
              <Sparkles className="w-7 h-7 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border-2 border-white" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              กำลังประมวลผลร่างรายงาน AI {reportTypeLabel}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-[#0052CC] font-bold border border-blue-200">
              4 Pillars System
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            ระบบกำลังผสานรวมข้อมูลโทรมาตรความปลอดภัย คลังความรู้โรงงาน WD และส่งให้ AI สังเคราะห์รายงานระดับผู้บริหาร
          </p>
        </div>

        {/* Live Timer Badges */}
        <div className="flex sm:flex-col items-center sm:items-end justify-center gap-1.5 shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>ใช้ไป: <strong className="text-slate-900">{formatTime(elapsedSeconds)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Hourglass className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
            <span>
              {remainingSeconds > 0 ? (
                <>เหลืออีก: <strong className="text-blue-700">~{remainingSeconds}s</strong></>
              ) : (
                <span className="text-emerald-700 font-bold">ขั้นตอนสุดท้าย...</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Percentage */}
      <div className="mt-6 mb-6">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span className="font-bold text-blue-900">
              ขั้นตอนที่ {currentStepIndex + 1}/4: {STEPS[currentStepIndex].title}
            </span>
          </div>
          <span className="text-sm font-black font-mono text-[#0052CC] tracking-tight">
            {progress}%
          </span>
        </div>

        {/* Outer Bar */}
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/90 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300 ease-out relative overflow-hidden shadow-sm"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full shimmer-active" />
          </div>
        </div>

        {/* Current Micro-Status Ticker */}
        <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600 bg-blue-50/60 py-2 px-3 rounded-lg border border-blue-100/80">
          <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-pulse" />
          <span className="truncate font-medium">{microStatus}</span>
        </div>
      </div>

      {/* 4 Steps Visual Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-6">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isDone = currentStepIndex > idx;
          const isCurrent = currentStepIndex === idx;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'border-blue-400 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                  : isDone
                  ? 'border-emerald-200 bg-emerald-50/40 text-slate-700'
                  : 'border-slate-200 bg-slate-50/50 opacity-60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                </div>
                <StepIcon
                  className={`w-4 h-4 ${
                    isCurrent ? 'text-blue-600 animate-pulse' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
              </div>

              <h4
                className={`text-[11px] font-bold line-clamp-1 ${
                  isCurrent ? 'text-blue-950' : isDone ? 'text-emerald-950' : 'text-slate-600'
                }`}
              >
                {step.title}
              </h4>
              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{step.shortDesc}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Info & Multi-tier Fallback Notice */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>โมเดล AI หลัก: <strong>{modelUsed}</strong> ({providerUsed.toUpperCase()})</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600 bg-amber-50/80 px-2.5 py-1 rounded-full border border-amber-200/70">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>ระบบมี Auto-Fallback อัจฉริยะ ป้องกันคิวหนาแน่น</span>
        </div>
      </div>
    </div>
  );
}
