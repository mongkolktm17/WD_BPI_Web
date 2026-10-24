'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertTriangle,
  Flame,
  Activity,
  ShieldAlert,
  UserX,
  AlertCircle,
  Wrench,
  Car,
  Camera,
  MapPin,
  CheckCircle2,
  UploadCloud,
  Trash2,
} from 'lucide-react';
import { IncidentService, type IncidentSeverity } from '@/lib/incident-service';

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteCode: string;
  siteName: string;
  userName: string;
  userEmployeeId?: string;
  onSubmitted?: () => void;
  initialType?: string;
  initialSeverity?: IncidentSeverity;
  initialLocation?: string;
  initialCustomLocation?: string;
  initialDescription?: string;
}

const INCIDENT_TYPES = [
  { id: 'fire', label: 'อัคคีภัย / กลุ่มควัน', icon: Flame, defaultSeverity: 'critical' as IncidentSeverity },
  { id: 'accident', label: 'อุบัติเหตุ / บาดเจ็บ', icon: Activity, defaultSeverity: 'high' as IncidentSeverity },
  { id: 'theft', label: 'ทรัพย์สินเสียหาย / โจรกรรม', icon: ShieldAlert, defaultSeverity: 'high' as IncidentSeverity },
  { id: 'intruder', label: 'บุคคลต้องสงสัย / บุกรุก', icon: UserX, defaultSeverity: 'high' as IncidentSeverity },
  { id: 'hazard', label: 'สัตว์มีพิษ / อันตราย', icon: AlertCircle, defaultSeverity: 'medium' as IncidentSeverity },
  { id: 'equipment', label: 'อุปกรณ์รักษาความปลอดภัยขัดข้อง', icon: Wrench, defaultSeverity: 'medium' as IncidentSeverity },
  { id: 'parking', label: 'ลานจอดรถเต็ม / กีดขวาง', icon: Car, defaultSeverity: 'medium' as IncidentSeverity },
];

const PRESET_LOCATIONS = [
  'อาคาร B2',
  'อาคาร B3',
  'อาคาร B4',
  'อาคาร B6',
  'อาคาร B9',
  'ลานจอดรถ L1',
  'ลานจอดรถ L2',
  'ลานจอดรถ L3',
  'ลานจอดรถ L4',
  'ลานจอดรถ L5',
  'ลานจอดรถ L6',
  'ลานจอดรถ L7',
  'ป้อมหน้า 1 (Main Gate)',
  'ป้อม 2 (North Gate)',
  'โรงอาหาร (Canteen)',
];

export default function ReportIncidentModal({
  isOpen,
  onClose,
  siteCode,
  siteName,
  userName,
  userEmployeeId,
  onSubmitted,
  initialType,
  initialSeverity,
  initialLocation,
  initialCustomLocation,
  initialDescription,
}: ReportIncidentModalProps) {
  const [selectedType, setSelectedType] = useState('อัคคีภัย / กลุ่มควัน');
  const [severity, setSeverity] = useState<IncidentSeverity>('critical');
  const [location, setLocation] = useState('อาคาร B4');
  const [customLocation, setCustomLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialType) setSelectedType(initialType);
      if (initialSeverity) setSeverity(initialSeverity);
      if (initialLocation) setLocation(initialLocation);
      if (initialCustomLocation !== undefined) setCustomLocation(initialCustomLocation);
      if (initialDescription !== undefined) setDescription(initialDescription);
    }
  }, [isOpen, initialType, initialSeverity, initialLocation, initialCustomLocation, initialDescription]);

  if (!isOpen) return null;

  const handleTypeSelect = (typeLabel: string, defSev: IncidentSeverity) => {
    setSelectedType(typeLabel);
    setSeverity(defSev);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('กรุณากรอกรายละเอียดเหตุการณ์');
      return;
    }

    setSubmitting(true);
    const finalLocation = customLocation.trim() ? `${location} (${customLocation.trim()})` : location;

    try {
      IncidentService.createIncident({
        siteCode,
        siteName,
        location: finalLocation,
        incidentType: selectedType,
        severity,
        description: description.trim(),
        imageUrl: imagePreview || undefined,
        reportedBy: userName || 'เจ้าหน้าที่ รปภ.',
        employeeId: userEmployeeId || 'WD-SEC',
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSubmitting(false);
        setDescription('');
        setImagePreview(null);
        setCustomLocation('');
        onSubmitted?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(err?.message || 'ส่งรายงานไม่สำเร็จ');
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 safe-area-inset"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center shadow-md flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  แจ้งเหตุฉุกเฉิน
                </h2>
                {/* Facility Badge Locked to Current Site */}
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  {siteCode} · {siteName || 'บางปะอิน'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-tight mt-0.5">
                รายงานเหตุด่วน / อุบัติเหตุเข้าสู่ศูนย์ SOC แบบ Real-time
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 space-y-4">
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" strokeWidth={2} />
              <span>ส่งข้อมูลแจ้งเหตุฉุกเฉินไปยังศูนย์ SOC Command Center เรียบร้อยแล้ว</span>
            </div>
          )}

          {/* 1. Incident Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ประเภทเหตุการณ์ (Incident Type) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {INCIDENT_TYPES.map((t) => {
                const IconComponent = t.icon;
                const isSelected = selectedType === t.label;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => handleTypeSelect(t.label, t.defaultSeverity)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs ring-1 ring-rose-400/40'
                        : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-rose-600' : 'text-slate-500'}`}
                      strokeWidth={1.75}
                    />
                    <span className="truncate text-[11px] leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Severity Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ระดับความรุนแรง (Severity Level) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: 'critical', label: 'วิกฤต (Critical)', bg: 'bg-rose-50 text-rose-700 border-rose-300', active: 'bg-rose-600 text-white border-rose-600 shadow-xs' },
                { key: 'high', label: 'สูง (High)', bg: 'bg-amber-50 text-amber-700 border-amber-300', active: 'bg-amber-500 text-white border-amber-500 shadow-xs' },
                { key: 'medium', label: 'ปานกลาง (Medium)', bg: 'bg-yellow-50 text-yellow-800 border-yellow-300', active: 'bg-yellow-600 text-white border-yellow-600 shadow-xs' },
                { key: 'low', label: 'ต่ำ (Low)', bg: 'bg-sky-50 text-sky-700 border-sky-300', active: 'bg-sky-600 text-white border-sky-600 shadow-xs' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => setSeverity(s.key as IncidentSeverity)}
                  className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition-all ${
                    severity === s.key ? s.active : `${s.bg} hover:opacity-90`
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              จุดเกิดเหตุ (Location: อาคาร / ลานจอดรถ) <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  type="button"
                  key={loc}
                  onClick={() => setLocation(loc)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    location === loc
                      ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="ระบุจุดย่อยเพิ่มเติม เช่น ชั้น 2 ทางเชื่อม, ช่องจอด L4-12, ประตู 3..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 4. Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              รายละเอียดเหตุการณ์ (Incident Details) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="อธิบายสถานการณ์ที่พบเห็น สภาพแวดล้อม และการดำเนินการเบื้องต้น..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl p-3 text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 5. Attach Photo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              แนบรูปภาพประกอบ (Attach Photo)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative rounded-xl border border-slate-200 p-2 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-800 truncate block">
                      รูปภาพหลักฐานแนบเรียบร้อย
                    </span>
                    <span className="text-[10px] text-slate-400">พร้อมส่งไปยังศูนย์ SOC</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="ลบรูปภาพ"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 rounded-xl p-3 flex items-center justify-center gap-2 text-slate-600 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                <span className="text-xs font-semibold">ถ่ายภาพจากกล้อง หรือเลือกไฟล์จากอุปกรณ์</span>
              </button>
            )}
          </div>

          {/* Submitter Info Footer */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-[11px] text-slate-600">
            <span>ผู้รายงาน: <strong>{userName || 'เจ้าหน้าที่ รปภ.'}</strong></span>
            <span>รหัส: <strong>{userEmployeeId || 'WD-SEC'}</strong></span>
          </div>

          {/* Sticky Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-white" strokeWidth={2} />
              <span>{submitting ? 'กำลังส่งข้อมูล...' : 'ส่งรายงานเหตุฉุกเฉิน (Submit Incident)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
