'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ClipboardList,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  User,
  Radio,
  Send,
  ShieldCheck,
  CheckCheck,
  ChevronRight,
  Flame,
  Activity,
  ShieldAlert,
  Car,
  Wrench,
  Camera,
} from 'lucide-react';
import {
  IncidentService,
  type IncidentReport,
  type SopStep,
} from '@/lib/incident-service';

interface SopTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmployeeId?: string;
  defaultIncidentId?: string | null;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  'อัคคีภัย / กลุ่มควัน': Flame,
  'อุบัติเหตุ / บาดเจ็บ': Activity,
  'ทรัพย์สินเสียหาย / โจรกรรม': ShieldAlert,
  'CCTV / NVR ขัดข้อง': Camera,
  'ลานจอดรถเต็ม 100%': Car,
  'อุปกรณ์รักษาความปลอดภัยขัดข้อง': Wrench,
  'ตรวจสอบวิทยุสื่อสารประจำผลัด': Radio,
};

export default function SopTaskModal({
  isOpen,
  onClose,
  userName,
  userEmployeeId,
  defaultIncidentId,
}: SopTaskModalProps) {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load and subscribe to incidents
  useEffect(() => {
    if (!isOpen) return;

    const reload = () => {
      const all = IncidentService.getIncidents();
      setIncidents(all);

      if (defaultIncidentId) {
        setSelectedIncidentId(defaultIncidentId);
      } else if (!selectedIncidentId || !all.find((i) => i.id === selectedIncidentId)) {
        // Pick first active dispatched or in_progress task, or first task
        const active = all.find((i) => i.status === 'dispatched' || i.status === 'in_progress') || all[0];
        if (active) setSelectedIncidentId(active.id);
      }
    };

    reload();
    const unsub = IncidentService.subscribe(() => reload());
    return unsub;
  }, [isOpen, defaultIncidentId]);

  if (!isOpen) return null;

  const currentTask = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  const handleAcknowledge = () => {
    if (!currentTask) return;
    setIsSubmitting(true);
    IncidentService.acknowledgeIncident(currentTask.id, userName || 'เจ้าหน้าที่ รปภ.');
    setIsSubmitting(false);
  };

  const handleToggleStep = (stepId: string) => {
    if (!currentTask) return;
    IncidentService.toggleSopStep(currentTask.id, stepId);
  };

  const handleResolve = () => {
    if (!currentTask) return;
    if (!confirm('ยืนยันปิดเคสระงับเหตุและส่งรายงานสรุปกลับศูนย์ SOC?')) return;

    setIsSubmitting(true);
    IncidentService.resolveIncident(currentTask.id, {
      note: resolutionNote.trim() || 'ระงับเหตุตามขั้นตอน SOP ครบถ้วนเรียบร้อย',
      resolvedBy: userName || 'เจ้าหน้าที่ รปภ.',
    });
    setResolutionNote('');
    setIsSubmitting(false);
  };

  // Checklist calculations
  const totalSteps = currentTask?.sopSteps?.length || 0;
  const completedSteps = currentTask?.sopSteps?.filter((s) => s.completed).length || 0;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const TypeIcon = (currentTask && TYPE_ICONS[currentTask.incidentType]) || ClipboardList;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 safe-area-inset"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  งานสั่งการ / SOP ระงับเหตุ
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Real-time Checklist
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-tight mt-0.5">
                รับคำสั่งจาก SOC Command Center และดำเนินตามขั้นตอนมาตรฐาน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-slate-500" strokeWidth={2} />
          </button>
        </div>

        {/* Task Selector Bar (Horizontal scroll of assigned tasks) */}
        <div className="bg-slate-50/80 border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            รายการงาน ({incidents.length}):
          </span>
          {incidents.map((task) => {
            const isSelected = task.id === currentTask?.id;
            const isPendingAck = task.status === 'dispatched';
            const isDone = task.status === 'resolved';

            return (
              <button
                key={task.id}
                onClick={() => setSelectedIncidentId(task.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {isPendingAck && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
                {isDone && (
                  <CheckCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} strokeWidth={2} />
                )}
                <span>{task.incidentType}</span>
                <span className={`text-[10px] font-mono opacity-80 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {task.siteCode}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        {currentTask ? (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {/* Task Card Summary */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3.5 sm:p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <TypeIcon className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                      {currentTask.incidentType}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono">
                      <span>{currentTask.id}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-sky-600" strokeWidth={1.75} />
                        {currentTask.location} ({currentTask.siteCode})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Severity Badge */}
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border flex-shrink-0 ${
                    currentTask.severity === 'critical'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : currentTask.severity === 'high'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-sky-50 text-sky-800 border-sky-300'
                  }`}
                >
                  {currentTask.severity}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-700 bg-white border border-slate-200/80 rounded-xl p-2.5 leading-relaxed">
                {currentTask.description}
              </p>

              {/* Dispatch Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="bg-white border border-slate-200/70 rounded-lg p-2">
                  <span className="text-slate-400 block text-[10px]">ผู้สั่งการ (SOC)</span>
                  <span className="font-semibold text-slate-800">{currentTask.dispatchedBy || 'ศูนย์ควบคุม SOC'}</span>
                </div>
                <div className="bg-white border border-slate-200/70 rounded-lg p-2">
                  <span className="text-slate-400 block text-[10px]">มอบหมายให้</span>
                  <span className="font-semibold text-slate-800">{currentTask.assignedTo || 'รอสั่งการ'}</span>
                </div>
                <div className="bg-white border border-slate-200/70 rounded-lg p-2 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[10px]">สถานะปัจจุบัน</span>
                  <span className="font-bold font-mono text-blue-700 uppercase">
                    {currentTask.status === 'dispatched' ? 'รอรับทราบคำสั่ง' : currentTask.status === 'in_progress' ? 'กำลังปฏิบัติการ' : 'ปิดเคสแล้ว'}
                  </span>
                </div>
              </div>

              {currentTask.dispatchNote && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-2.5 text-xs">
                  <strong className="font-bold">ข้อความสั่งการด่วน:</strong> {currentTask.dispatchNote}
                </div>
              )}
            </div>

            {/* Step 1: Acknowledge Button if status is dispatched */}
            {currentTask.status === 'dispatched' && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 text-center space-y-2.5 animate-pulse">
                <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                  <Radio className="w-4 h-4 text-amber-600 animate-spin" strokeWidth={2} />
                  <span>มีคำสั่งใหม่จาก SOC Command Center รอการยืนยัน</span>
                </div>
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2} />
                  <span>รับทราบคำสั่ง (Acknowledge Order)</span>
                </button>
              </div>
            )}

            {/* Step 2: SOP Interactive Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    {currentTask.sopTitle || 'ขั้นตอนมาตรฐานระงับเหตุ (SOP)'}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    ติ๊กเช็กขั้นตอนทีละข้อ ข้อมูลจะซิงค์กับ SOC Dashboard ทันที
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-blue-700">
                    {completedSteps} / {totalSteps} ข้อ ({progressPct}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Steps List */}
              <div className="space-y-2 pt-1">
                {currentTask.sopSteps?.map((step, idx) => (
                  <button
                    type="button"
                    key={step.id}
                    onClick={() => handleToggleStep(step.id)}
                    disabled={currentTask.status === 'resolved'}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      step.completed
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        step.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      {step.completed && <CheckCheck className="w-3.5 h-3.5 text-white" strokeWidth={2} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold leading-tight">
                        <span className="font-mono text-slate-400 mr-1.5">{idx + 1}.</span>
                        {step.label}
                      </div>
                      {step.completedAt && (
                        <div className="text-[10px] text-emerald-700 font-mono mt-1">
                          ดำเนินการแล้ว เมื่อ {new Date(step.completedAt).toLocaleTimeString('th-TH')}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Resolve Section */}
            {currentTask.status !== 'resolved' ? (
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  บันทึกผลการระงับเหตุ / หมายเหตุปิดเคส
                </label>
                <input
                  type="text"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="ระบุผลการระงับเหตุ เช่น ตรวจสอบไม่พบควันแล้ว ปลดเบรกเกอร์เรียบร้อย..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2} />
                  <span>บันทึกและปิดเคสระงับเหตุ (Resolve Case)</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  <span>เคสระงับเหตุนี้เสร็จสิ้นและปิดเคสเรียบร้อยแล้ว</span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  ปิดเคสโดย: {currentTask.resolvedBy} เมื่อ {currentTask.resolvedAt ? new Date(currentTask.resolvedAt).toLocaleTimeString('th-TH') : '-'}
                </div>
                {currentTask.resolutionNote && (
                  <div className="text-[11px] text-emerald-700 italic mt-0.5">
                    หมายเหตุ: {currentTask.resolutionNote}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            ไม่พบข้อมูลงานสั่งการ
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
