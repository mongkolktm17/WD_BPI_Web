'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import MicButton from '@/components/MicButton';
import {
  Building2,
  Send,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Sun,
  Moon,
  Camera,
  Trash2,
  RotateCcw,
  Radio,
  Sparkles,
  Check,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { useSite } from '@/lib/SiteContext';
import { IncidentService } from '@/lib/incident-service';

const BUILDING_CONFIG: Record<string, { title: string; posts: string[] }> = {
  '2': {
    title: 'Building 2',
    posts: ['A2', 'A3', 'Traffic', 'D1', 'D3', 'D7', 'Patrol 1', 'Patrol 2', 'Machine', 'Support', 'Other'],
  },
  '3': {
    title: 'Building 3',
    posts: ['Gate 2', 'RCSC', 'FA LAB', 'EXIT INSPECTION (ทางออก)', 'Other'],
  },
  '4': {
    title: 'Building 4',
    posts: [
      'Gate 1',
      'Gate 5',
      'Gate 6',
      'Worker',
      'Scan Receiving',
      'Receiving',
      'Traffic Receiving',
      'Transfer room',
      'Scan Link way',
      'Park 3',
      'Customs Park 2',
      'Patrol 1',
      'Patrol 2',
      'Support',
      'Other',
    ],
  },
  '6': {
    title: 'Building 6',
    posts: ['6/1', '6/2', 'Rel.Lab B2L3', 'Patrol', 'Other'],
  },
  '9': {
    title: 'Building 9',
    posts: ['B9', 'Other'],
  },
};

const QUICK_OBSERVATION_PRESETS = [
  'เหตุการณ์ทั่วไปปกติเรียบร้อยดี',
  'ประตูทางเข้า-ออก และทางหนีไฟปิดล็อคสนิท',
  'ระบบไฟฟ้าแสงสว่างและอุปกรณ์ทำงานปกติ',
  'ไม่พบสิ่งของกีดขวางหรือสารเคมีรั่วไหล',
  'ไม่พบบุคคลภายนอกหรือผู้ไม่มีสิทธิ์ในพื้นที่',
];

export default function ReportBuildingPage() {
  const params = useParams();
  const router = useRouter();
  const { currentSite } = useSite();
  const buildingId = (params?.building as string) || '2';
  const config = BUILDING_CONFIG[buildingId];

  const draftKey = `wd_pwa_draft_bldg_${buildingId}`;

  const [formData, setFormData] = useState({
    report_date: '',
    employee_id: '',
    full_name: '',
    shift: 'เช้า',
    guard_post: '',
    report_time: '',
    incident_report: '',
    special_incident: '',
    emergency_incident: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notifySoc, setNotifySoc] = useState(false);
  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize date, time, and session auto-fill
  useEffect(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    setFormData((prev) => ({
      ...prev,
      report_date: dateStr,
      report_time: `${hours}:${minutes}`,
    }));

    // Auto-fill from session API
    apiFetch<any>('/api/auth/me')
      .then((res) => {
        const u = res.user ?? res.data ?? res;
        if (u) {
          setFormData((prev) => ({
            ...prev,
            employee_id: u.username || prev.employee_id,
            full_name: u.fullName || u.username || prev.full_name,
          }));
        }
      })
      .catch(() => {});

    // Check for existing saved draft in LocalStorage
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.incident_report || parsed.guard_post || parsed.special_incident || parsed.emergency_incident) {
          setHasDraftNotice(true);
          setLastSavedDraftTime(parsed._savedAt || 'ก่อนหน้านี้');
        }
      }
    } catch {}
  }, [draftKey]);

  // Debounced auto-save draft to LocalStorage
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (formData.incident_report || formData.guard_post || formData.special_incident || formData.emergency_incident) {
        try {
          const toSave = {
            ...formData,
            _savedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          };
          localStorage.setItem(draftKey, JSON.stringify(toSave));
          setLastSavedDraftTime(toSave._savedAt);
        } catch {}
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [formData, draftKey]);

  useEffect(() => {
    if (!config) {
      router.push('/select-building');
    }
  }, [config, router]);

  if (!config) return null;

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({
          ...prev,
          guard_post: parsed.guard_post || prev.guard_post,
          incident_report: parsed.incident_report || prev.incident_report,
          special_incident: parsed.special_incident || prev.special_incident,
          emergency_incident: parsed.emergency_incident || prev.emergency_incident,
          shift: parsed.shift || prev.shift,
        }));
        setHasDraftNotice(false);
      }
    } catch {}
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraftNotice(false);
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMicResult = (fieldName: string, transcript: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName as keyof typeof prev]
        ? prev[fieldName as keyof typeof prev] + ' ' + transcript
        : transcript,
    }));
  };

  const handleQuickPreset = (presetText: string) => {
    setFormData((prev) => {
      const current = prev.incident_report.trim();
      if (!current) return { ...prev, incident_report: presetText };
      if (current.includes(presetText)) return prev;
      return { ...prev, incident_report: `${current}\n- ${presetText}` };
    });
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      // 1. Submit Building Report to Backend API
      await apiFetch('/api/reports/building-reports', {
        method: 'POST',
        body: JSON.stringify({
          reportDate: formData.report_date,
          employeeId: formData.employee_id,
          fullName: formData.full_name,
          shift: formData.shift,
          building: buildingId,
          guardPost: formData.guard_post,
          reportTime: formData.report_time,
          incidentReport: formData.incident_report,
          specialIncident: formData.special_incident || undefined,
          emergencyIncident: formData.emergency_incident || undefined,
        }),
      });

      // 2. Real-time SOC Emergency Bridge: If toggle is enabled or emergency field is populated
      if ((notifySoc || formData.emergency_incident.trim()) && formData.emergency_incident.trim()) {
        try {
          IncidentService.createIncident({
            siteCode: currentSite?.code || 'BPI',
            siteName: currentSite?.name || 'บางปะอิน',
            location: `${config.title} - ${formData.guard_post || 'จุดตรวจ'}`,
            incidentType: `เหตุด่วนตรวจอาคาร (${config.title})`,
            severity: 'critical',
            description: `[รายงานประจำวัน ${config.title}] ${formData.emergency_incident}`,
            reportedBy: `${formData.full_name || 'รปภ. ประจำจุด'} (${formData.employee_id})`,
            employeeId: formData.employee_id,
            imageUrl: photoPreview || undefined,
          });
        } catch (socErr) {
          console.warn('SOC Bridge notification failed:', socErr);
        }
      }

      setMessage(`ส่งรายงานสำหรับ ${config.title} เรียบร้อยแล้ว`);

      // Clear draft upon successful submission
      try {
        localStorage.removeItem(draftKey);
      } catch {}

      // Reset dynamic input fields
      setFormData((prev) => ({
        ...prev,
        guard_post: '',
        incident_report: '',
        special_incident: '',
        emergency_incident: '',
      }));
      setPhotoPreview(null);
      setNotifySoc(false);

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-800 py-3 sm:py-6 px-2.5 sm:px-4 font-sans selection:bg-blue-600 selection:text-white pb-28 sm:pb-16">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
        {/* PWA Standard Header */}
        <PageHeader
          title={`รายงานประจำวัน ${config.title}`}
          subtitle={`Building Report Form · สาขา ${currentSite?.code || 'BPI'}`}
          badge={config.title}
          icon={<Building2 className="w-5 h-5 text-white" strokeWidth={1.75} />}
          backHref="/select-building"
          backLabel="เลือกอาคาร"
        />

        {/* Offline Draft Recovery Notice */}
        {hasDraftNotice && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" strokeWidth={2} />
              <div className="min-w-0 text-xs">
                <span className="font-bold">พบข้อมูลร่างเดิมที่บันทึกค้างไว้</span>{' '}
                <span className="text-amber-700">({lastSavedDraftTime})</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
              >
                กู้คืนร่าง
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-2 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-all"
              >
                ละทิ้ง
              </button>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {message && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-2.5 text-xs sm:text-sm font-semibold shadow-2xs animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" strokeWidth={2} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-red-50 text-red-800 border border-red-300 flex items-center gap-2.5 text-xs sm:text-sm font-semibold shadow-2xs animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        {/* Main PWA Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/90 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6"
        >
          {/* Section 1: Patrol Officer & Time Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
            {/* 1. Date */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                1. วัน เดือน ปี <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="report_date"
                required
                value={formData.report_date}
                onChange={handleChange}
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-slate-50/50 text-sm transition-all"
              />
            </div>

            {/* 2. Employee ID */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                2. รหัสพนักงาน PCS (8 หลัก) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="employee_id"
                  required
                  maxLength={8}
                  placeholder="เช่น 12345678"
                  value={formData.employee_id}
                  onChange={handleChange}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 pr-11 rounded-xl sm:rounded-2xl font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-slate-50/50 text-sm transition-all font-mono"
                />
                <MicButton onResult={(t) => handleMicResult('employee_id', t)} />
              </div>
            </div>

            {/* 3. Full Name */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                3. ชื่อ นามสกุล <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="กรอกชื่อและนามสกุลผู้ตรวจ"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 pr-11 rounded-xl sm:rounded-2xl font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-slate-50/50 text-sm transition-all"
                />
                <MicButton onResult={(t) => handleMicResult('full_name', t)} />
              </div>
            </div>

            {/* 4. Shift: Mono-color Outline Icons (No Emojis) */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                4. กะปฏิบัติงาน <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, shift: 'เช้า' })}
                  className={`flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 border-2 rounded-xl sm:rounded-2xl font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer ${
                    formData.shift === 'เช้า'
                      ? 'border-[#0052CC] bg-blue-50 text-[#0052CC] shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Sun className={`w-4 h-4 ${formData.shift === 'เช้า' ? 'text-[#0052CC]' : 'text-amber-500'}`} strokeWidth={2} />
                  <span className="text-xs sm:text-sm">เช้า (07:00 - 19:00)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, shift: 'ดึก' })}
                  className={`flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 border-2 rounded-xl sm:rounded-2xl font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer ${
                    formData.shift === 'ดึก'
                      ? 'border-[#0052CC] bg-blue-50 text-[#0052CC] shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Moon className={`w-4 h-4 ${formData.shift === 'ดึก' ? 'text-[#0052CC]' : 'text-indigo-500'}`} strokeWidth={2} />
                  <span className="text-xs sm:text-sm">ดึก (19:00 - 07:00)</span>
                </button>
              </div>
              <input type="hidden" name="shift" value={formData.shift} />
            </div>

            {/* 5. Guard Post */}
            <div>
              <AnimatedDropdown
                options={config.posts.map((post) => ({
                  value: post,
                  label: post,
                  icon: <MapPin className="w-4 h-4 text-sky-600" strokeWidth={1.75} />,
                }))}
                value={formData.guard_post}
                onChange={(val) => setFormData({ ...formData, guard_post: val })}
                label="5. จุดรักษาการณ์ *"
                placeholder="เลือกจุดรักษาการณ์ประจำอาคาร"
              />
            </div>

            {/* 6. Report Time */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                6. เวลารายงาน <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="report_time"
                required
                value={formData.report_time}
                onChange={handleChange}
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-slate-50/50 text-sm transition-all"
              />
            </div>
          </div>

          {/* Section 2: 7. Patrol Incident Report with Quick 1-Click Preset Chips */}
          <div className="border-t border-slate-100 pt-4 sm:pt-6 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                7. รายงานเหตุการณ์ตรวจตรา <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                เลือกข้อความด่วนด้านล่าง หรือใช้ไมโครโฟน
              </span>
            </div>

            {/* 1-Click Quick Preset Observation Chips */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {QUICK_OBSERVATION_PRESETS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleQuickPreset(preset)}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all active:scale-95 shadow-2xs"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                name="incident_report"
                rows={4}
                required
                placeholder="กรอกรายละเอียดผลการตรวจตรา หรือแตะข้อความสำเร็จรูปด้านบน..."
                value={formData.incident_report}
                onChange={handleChange}
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 pr-11 rounded-xl sm:rounded-2xl font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-slate-50/40 text-sm transition-all leading-relaxed"
              />
              <MicButton onResult={(t) => handleMicResult('incident_report', t)} className="!top-3" />
            </div>
          </div>

          {/* Section 3: Mobile Camera / Photo Evidence Capture */}
          <div className="border-t border-slate-100 pt-4 sm:pt-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                ภาพถ่ายหลักฐานหน้างาน (อุปกรณ์ / จุดเกิดเหตุ)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {photoPreview ? 'แนบภาพเรียบร้อย' : 'ไม่บังคับ'}
              </span>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative inline-block rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <img
                  src={photoPreview}
                  alt="Incident Preview"
                  className="max-h-48 rounded-2xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white transition-all shadow-md active:scale-90"
                  title="ลบภาพถ่าย"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/40 text-slate-600 hover:text-blue-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Camera className="w-4 h-4 text-slate-500" strokeWidth={2} />
                <span>แตะเพื่อถ่ายภาพจากกล้อง หรือแนบรูปหลักฐาน</span>
              </button>
            )}
          </div>

          {/* Section 4: 8. Special Incident */}
          <div className="border-t border-slate-100 pt-4 sm:pt-5">
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              8. กรณีเหตุการณ์พิเศษ (Special Incident)
            </label>
            <div className="relative">
              <textarea
                name="special_incident"
                rows={2}
                placeholder="ระบุข้อบกพร่อง ทรัพย์สินชำรุด หรือเหตุการณ์ที่ต้องติดตามผล (ถ้ามี)"
                value={formData.special_incident}
                onChange={handleChange}
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 pr-11 rounded-xl sm:rounded-2xl font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-slate-50/40 text-sm transition-all"
              />
              <MicButton onResult={(t) => handleMicResult('special_incident', t)} className="!top-3" />
            </div>
          </div>

          {/* Section 5: 9. Emergency Incident + Real-time SOC Bridge Toggle */}
          <div className="border-t border-slate-100 pt-4 sm:pt-5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs sm:text-sm font-bold text-rose-700">
                9. กรณีเหตุฉุกเฉิน / อันตรายเร่งด่วน (Emergency Incident)
              </label>

              {/* Real-time SOC Bridge Switch */}
              <label className="flex items-center gap-2 cursor-pointer bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1 rounded-xl border border-rose-200 text-rose-800 text-xs font-bold transition-all shadow-2xs">
                <input
                  type="checkbox"
                  checked={notifySoc}
                  onChange={(e) => setNotifySoc(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                />
                <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" strokeWidth={2} />
                <span>แจ้งเตือนศูนย์ SOC Command Center ทันที</span>
              </label>
            </div>

            <div className="relative">
              <textarea
                name="emergency_incident"
                rows={2}
                placeholder="ระบุเพลิงไหม้, ทรัพย์สินเสียหายรุนแรง, บาดเจ็บ หรือบุคคลบุกรุก (ถ้ามี)"
                value={formData.emergency_incident}
                onChange={handleChange}
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 pr-11 rounded-xl sm:rounded-2xl font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 bg-slate-50/40 text-sm transition-all"
              />
              <MicButton onResult={(t) => handleMicResult('emergency_incident', t)} className="!top-3" />
            </div>
          </div>
        </form>
      </div>

      {/* ── Mobile PWA Sticky Bottom Action Dock ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Auto-save Draft Status */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="truncate">
              {lastSavedDraftTime ? `ร่างอัตโนมัติ: ${lastSavedDraftTime}` : 'พร้อมส่งรายงาน'}
            </span>
          </div>

          {/* Right: Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 sm:px-10 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 min-h-[42px]"
          >
            <Send className="w-4 h-4" strokeWidth={2} />
            <span>{loading ? 'กำลังบันทึก...' : 'ส่งรายงาน'}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
