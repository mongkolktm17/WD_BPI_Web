'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Camera,
  Upload,
  Send,
  Sparkles,
  AlertCircle,
  FileText,
  User,
  Clock,
  MapPin,
  HelpCircle,
  RefreshCw,
  Eye,
  Check,
  RotateCcw,
  Save,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSite } from '@/lib/SiteContext';
import MicButton from '@/components/MicButton';

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormSection {
  title: string;
  fields: FormField[];
}

interface FormTemplate {
  id: number;
  code: string;
  title: string;
  description?: string;
  category: string;
  siteId?: number | null;
  site?: { id: number; code: string; name: string };
  schemaJson: {
    sections: FormSection[];
  };
}

export default function FormFillPage() {
  const params = useParams();
  const router = useRouter();
  const { currentSite } = useSite();
  const templateId = params?.id ? Number(params.id) : null;

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Common Guard Header Info
  const [guardInfo, setGuardInfo] = useState({
    officerName: '',
    employeeId: '',
    shift: 'Day',
    location: '',
  });

  // Dynamic form values: { [fieldId]: value }
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [remarksValues, setRemarksValues] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({}); // fieldId -> base64
  const [signatures, setSignatures] = useState<Record<string, string>>({}); // fieldId -> name
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<any | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasDraft, setHasDraft] = useState<boolean>(false);

  const DRAFT_KEY = templateId ? `wd_pwa_draft_dynamic_form_${templateId}` : null;

  // Restore draft when template loads
  useEffect(() => {
    if (!DRAFT_KEY || !template) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.guardInfo) setGuardInfo(parsed.guardInfo);
          if (parsed.formValues) setFormValues((prev) => ({ ...prev, ...parsed.formValues }));
          if (parsed.remarksValues) setRemarksValues(parsed.remarksValues);
          if (parsed.signatures) setSignatures(parsed.signatures);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.photos) setPhotos(parsed.photos);
          setHasDraft(true);
        }
      }
    } catch (e) {
      console.error('Failed to restore dynamic form draft', e);
    }
  }, [DRAFT_KEY, template]);

  // Auto-save draft debounced
  useEffect(() => {
    if (!DRAFT_KEY || !template) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            guardInfo,
            formValues,
            remarksValues,
            signatures,
            notes,
            photos,
            savedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        try {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
              guardInfo,
              formValues,
              remarksValues,
              signatures,
              notes,
              savedAt: new Date().toISOString(),
            })
          );
        } catch (err) {
          console.error('Failed to auto-save draft', err);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [DRAFT_KEY, template, guardInfo, formValues, remarksValues, signatures, notes, photos]);

  const handleClearDraft = () => {
    if (DRAFT_KEY) {
      try {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
        const initial: Record<string, any> = {};
        if (template?.schemaJson && Array.isArray(template.schemaJson.sections)) {
          template.schemaJson.sections.forEach((sec: FormSection) => {
            sec.fields?.forEach((f: FormField) => {
              if (f.type === 'audit_status') initial[f.id] = 'PASS';
              else if (f.type === 'number') initial[f.id] = '';
              else initial[f.id] = '';
            });
          });
        }
        setFormValues(initial);
        setRemarksValues({});
        setPhotos({});
        setSignatures({});
        setNotes('');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const hasAuditStatusFields = useMemo(() => {
    return template?.schemaJson?.sections?.some((sec) =>
      sec.fields?.some((f) => f.type === 'audit_status')
    );
  }, [template]);

  const handleQuickPassAll = () => {
    if (!template?.schemaJson?.sections) return;
    const updated = { ...formValues };
    template.schemaJson.sections.forEach((sec) => {
      sec.fields?.forEach((f) => {
        if (f.type === 'audit_status') {
          updated[f.id] = 'PASS';
        }
      });
    });
    setFormValues(updated);
  };

  useEffect(() => {
    if (!templateId) return;

    async function fetchTemplate() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<any>(`/api/dynamic-forms/templates/${templateId}`);
        if (res && res.data) {
          setTemplate(res.data);
          // Initialize default values for fields
          const initial: Record<string, any> = {};
          if (res.data.schemaJson && Array.isArray(res.data.schemaJson.sections)) {
            res.data.schemaJson.sections.forEach((sec: FormSection) => {
              sec.fields?.forEach((f: FormField) => {
                if (f.type === 'audit_status') {
                  initial[f.id] = 'PASS';
                } else if (f.type === 'number') {
                  initial[f.id] = '';
                } else {
                  initial[f.id] = '';
                }
              });
            });
          }
          setFormValues(initial);
        } else {
          setError('ไม่พบแบบฟอร์มที่ระบุ');
        }
      } catch (err: any) {
        console.error('Failed to load template:', err);
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดแบบฟอร์ม');
      } finally {
        setLoading(false);
      }
    }

    fetchTemplate();
  }, [templateId]);

  const handleFieldValueChange = (fieldId: string, val: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handlePhotoUpload = (fieldId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPhotos((prev) => ({ ...prev, [fieldId]: e.target?.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (fieldId: string) => {
    setPhotos((prev) => {
      const copy = { ...prev };
      delete copy[fieldId];
      return copy;
    });
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!guardInfo.officerName.trim()) {
      errors.push('กรุณาระบุชื่อ-นามสกุล เจ้าหน้าที่');
    }
    if (!guardInfo.location.trim()) {
      errors.push('กรุณาระบุจุดตรวจ / ป้อมประจำการ / อาคาร');
    }

    if (template?.schemaJson?.sections) {
      template.schemaJson.sections.forEach((sec) => {
        sec.fields?.forEach((field) => {
          if (field.required) {
            const val = formValues[field.id];
            if (field.type === 'photo_upload') {
              if (!photos[field.id]) {
                errors.push(`จำเป็นต้องแนบภาพ: "${field.label}"`);
              }
            } else if (field.type === 'signature') {
              if (!signatures[field.id]?.trim()) {
                errors.push(`จำเป็นต้องลงชื่อกำกับ: "${field.label}"`);
              }
            } else if (val === undefined || val === null || val === '') {
              errors.push(`กรุณากรอกข้อมูล: "${field.label}"`);
            }
          }
        });
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      // Assemble submission payload
      const combinedData = {
        guardInfo,
        formValues,
        auditRemarks: remarksValues,
        signatures,
        submittedAt: new Date().toISOString(),
      };

      const attachments = {
        photos,
      };

      const targetSiteId = template?.siteId || currentSite?.id || 1;

      const payload = {
        templateId: template!.id,
        siteId: targetSiteId,
        dataJson: combinedData,
        attachmentsJson: attachments,
        notes: notes.trim() || undefined,
      };

      const res = await apiFetch<any>('/api/dynamic-forms/submissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.data) {
        if (DRAFT_KEY) {
          try {
            localStorage.removeItem(DRAFT_KEY);
            setHasDraft(false);
          } catch (e) {}
        }
        setSubmittedSuccess(res.data);
      } else {
        throw new Error(res?.message || 'ส่งแบบฟอร์มไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || 'โปรดลองอีกครั้ง'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm">กำลังโหลดแบบฟอร์มตรวจการ...</p>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">ไม่สามารถเปิดแบบฟอร์มได้</h2>
          <p className="text-sm text-slate-400 mb-6">{error || 'ไม่พบข้อมูล'}</p>
          <Link
            href="/admin/forms"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้ารายการแบบฟอร์ม
          </Link>
        </div>
      </div>
    );
  }

  // Success Screen
  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex items-center justify-center">
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 md:p-8 max-w-lg w-full text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 mb-2">
            บันทึกสำเร็จ (Success)
          </span>
          <h2 className="text-xl font-bold text-white mb-1">ส่งแบบฟอร์มเรียบร้อยแล้ว</h2>
          <p className="text-sm text-slate-400 mb-4">{template.title}</p>

          <div className="bg-slate-950/70 rounded-2xl p-4 text-left border border-slate-800/80 mb-6 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">รหัสบันทึก:</span>
              <span className="text-cyan-400 font-mono">#{submittedSuccess.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">สาขา:</span>
              <span className="text-white font-medium">
                {submittedSuccess.site?.name || 'บางปะอิน (BPI)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">เจ้าหน้าที่:</span>
              <span className="text-white font-medium">{guardInfo.officerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">จุดตรวจ:</span>
              <span className="text-white font-medium">{guardInfo.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">เวลาบันทึก:</span>
              <span className="text-slate-300">
                {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setSubmittedSuccess(null);
                setNotes('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition"
            >
              บันทึกรายการถัดไป
            </button>
            <Link
              href="/forms/submissions"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition text-center"
            >
              ดูประวัติการส่งฟอร์ม
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto pb-28 md:pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/admin/forms"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            ย้อนกลับ
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                template.siteId === 2
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : template.siteId === 1
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {template.siteId === 2
                ? 'สาขาปราจีนบุรี (PRB)'
                : template.siteId === 1
                ? 'สาขาบางปะอิน (BPI)'
                : 'แบบฟอร์มกลาง (Global)'}
            </span>
            <span className="px-2 py-1 bg-slate-800/80 text-slate-400 text-xs rounded-lg border border-slate-700/60">
              {template.category}
            </span>
          </div>
        </div>

        {/* Title Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 md:p-6 mb-6 shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">{template.title}</h1>
              {template.description && (
                <p className="text-xs md:text-sm text-slate-400 mt-1">{template.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span>รหัสฟอร์ม: <code className="text-slate-300 font-mono">{template.code}</code></span>
              </div>
            </div>
          </div>
          {hasAuditStatusFields && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">ตัวช่วยกรอกข้อมูลด่วน:</span>
              <button
                type="button"
                onClick={handleQuickPassAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
              >
                <Check className="w-3.5 h-3.5" />
                ตั้งค่าผ่านทุกข้อ (Quick Pass All)
              </button>
            </div>
          )}
        </div>

        {/* Draft Recovery Banner */}
        {hasDraft && (
          <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-6 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>กู้คืนข้อมูลร่างการตรวจสอบที่ยังไม่ได้บันทึกเรียบร้อยแล้ว</span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-amber-400 hover:text-amber-300 font-bold underline shrink-0"
            >
              ละทิ้งร่าง
            </button>
          </div>
        )}

        {/* Validation error alert */}
        {validationErrors.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-6 text-rose-300 text-xs">
            <div className="flex items-center gap-2 font-semibold mb-2 text-rose-200">
              <AlertCircle className="w-4 h-4" />
              กรุณาตรวจสอบข้อมูลก่อนบันทึก:
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 0: Guard Identification */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-md">
            <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              ข้อมูลเจ้าหน้าที่ผู้ตรวจการ (Security Guard Info)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  ชื่อ-นามสกุล เจ้าหน้าที่ <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="เช่น สมชาย ใจดี"
                    value={guardInfo.officerName}
                    onChange={(e) => setGuardInfo({ ...guardInfo, officerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm transition"
                    required
                  />
                  <MicButton
                    onResult={(val) => setGuardInfo(prev => ({ ...prev, officerName: val }))}
                    currentValue={guardInfo.officerName}
                    mode="replace"
                    className="top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">รหัสพนักงาน (ID)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="เช่น SEC-104"
                    value={guardInfo.employeeId}
                    onChange={(e) => setGuardInfo({ ...guardInfo, employeeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm transition"
                  />
                  <MicButton
                    onResult={(val) => setGuardInfo(prev => ({ ...prev, employeeId: val }))}
                    currentValue={guardInfo.employeeId}
                    mode="replace"
                    className="top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">ผลัด / กะ (Shift)</label>
                <select
                  value={guardInfo.shift}
                  onChange={(e) => setGuardInfo({ ...guardInfo, shift: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-sm transition"
                >
                  <option value="Day">กะกลางวัน (07:00 - 19:00)</option>
                  <option value="Night">กะกลางคืน (19:00 - 07:00)</option>
                  <option value="Special">กะพิเศษ / นอกเวลา</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  จุดตรวจ / ป้อม / อาคาร <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="เช่น Gate 1, ป้อม 2, อาคารผลิต B"
                    value={guardInfo.location}
                    onChange={(e) => setGuardInfo({ ...guardInfo, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm transition"
                    required
                  />
                  <MicButton
                    onResult={(val) => setGuardInfo(prev => ({ ...prev, location: val }))}
                    currentValue={guardInfo.location}
                    mode="replace"
                    className="top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Sections & Fields */}
          {template.schemaJson?.sections?.map((section, sIndex) => (
            <div
              key={sIndex}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-md"
            >
              <h2 className="text-base font-bold text-white mb-4 pb-2 border-b border-slate-800/80 flex items-center justify-between">
                <span>{section.title}</span>
                <span className="text-xs text-slate-500 font-normal">
                  หมวดที่ {sIndex + 1} ({section.fields?.length || 0} รายการ)
                </span>
              </h2>

              <div className="space-y-5">
                {section.fields?.map((field, fIndex) => {
                  const val = formValues[field.id];

                  return (
                    <div
                      key={field.id}
                      className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl transition hover:border-slate-700/80"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <label className="text-sm font-medium text-slate-200">
                          {field.label}{' '}
                          {field.required && <span className="text-rose-400 font-bold">*</span>}
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          #{fIndex + 1}
                        </span>
                      </div>

                      {/* Field Renderers */}
                      {field.type === 'text' && (
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={field.placeholder || 'ระบุข้อความ...'}
                            value={val || ''}
                            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
                          />
                          <MicButton
                            onResult={(t) => handleFieldValueChange(field.id, t)}
                            currentValue={val || ''}
                            mode="replace"
                            className="top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-white"
                          />
                        </div>
                      )}

                      {field.type === 'number' && (
                        <input
                          type="number"
                          placeholder={field.placeholder || '0'}
                          value={val ?? ''}
                          onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
                        />
                      )}

                      {field.type === 'textarea' && (
                        <div className="relative">
                          <textarea
                            rows={3}
                            placeholder={field.placeholder || 'รายละเอียดเพิ่มเติม...'}
                            value={val || ''}
                            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pr-10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
                          />
                          <MicButton
                            onResult={(t) => handleFieldValueChange(field.id, val ? `${val} ${t}` : t)}
                            currentValue={val || ''}
                            mode="append"
                            className="top-2.5 right-2.5 text-slate-400 hover:text-white"
                          />
                        </div>
                      )}

                      {field.type === 'select' && (
                        <select
                          value={val || ''}
                          onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                        >
                          <option value="">-- โปรดเลือก --</option>
                          {field.options?.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === 'audit_status' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleFieldValueChange(field.id, 'PASS')}
                              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                                val === 'PASS'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/30'
                                  : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:bg-slate-850'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ปกติ (PASS)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFieldValueChange(field.id, 'FAIL')}
                              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                                val === 'FAIL'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500 ring-2 ring-rose-500/30'
                                  : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:bg-slate-850'
                              }`}
                            >
                              <XCircle className="w-4 h-4 text-rose-400" />
                              ผิดปกติ (FAIL)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFieldValueChange(field.id, 'NA')}
                              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                                val === 'NA'
                                  ? 'bg-slate-700/50 text-slate-200 border-slate-500 ring-2 ring-slate-500/30'
                                  : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:bg-slate-850'
                              }`}
                            >
                              <MinusCircle className="w-4 h-4 text-slate-400" />
                              ไม่เกี่ยวข้อง (N/A)
                            </button>
                          </div>

                          {val === 'FAIL' && (
                            <div className="mt-2 p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl">
                              <label className="block text-xs text-rose-300 font-medium mb-1">
                                ระบุสาเหตุความผิดปกติ / อาการที่พบ:
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="เช่น กล้องมุมเอียง, ภาพดับ, ประตูล็อคไม่สนิท..."
                                  value={remarksValues[field.id] || ''}
                                  onChange={(e) =>
                                    setRemarksValues({
                                      ...remarksValues,
                                      [field.id]: e.target.value,
                                    })
                                  }
                                  className="w-full bg-slate-900 border border-rose-800/80 rounded-lg pl-3 pr-9 py-1.5 text-xs text-rose-100 placeholder-rose-500/50 focus:outline-none focus:border-rose-500"
                                />
                                <MicButton
                                  onResult={(t) => setRemarksValues(prev => ({ ...prev, [field.id]: t }))}
                                  currentValue={remarksValues[field.id] || ''}
                                  mode="replace"
                                  className="top-1/2 -translate-y-1/2 right-1.5 text-rose-400 hover:text-rose-200"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {field.type === 'photo_upload' && (
                        <div>
                          {photos[field.id] ? (
                            <div className="relative inline-block mt-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photos[field.id]}
                                alt="Inspection attachment"
                                className="w-48 h-32 object-cover rounded-xl border border-slate-700 shadow"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(field.id)}
                                className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-500 transition"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-4 cursor-pointer hover:border-cyan-500 transition bg-slate-900/40">
                              <Camera className="w-6 h-6 text-slate-400 mb-1" />
                              <span className="text-xs text-slate-300 font-medium">
                                แตะเพื่อถ่ายภาพ หรือเลือกรูปถ่าย
                              </span>
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                JPG, PNG (รองรับกล้องมือถือ)
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handlePhotoUpload(field.id, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {field.type === 'signature' && (
                        <div className="space-y-2">
                          <label className="block text-xs text-slate-400">
                            ลงชื่อกำกับการตรวจสอบ (Digital Sign-off)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="พิมพ์ชื่อเต็มเพื่อรับรอง..."
                              value={signatures[field.id] || ''}
                              onChange={(e) =>
                                setSignatures({ ...signatures, [field.id]: e.target.value })
                              }
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (guardInfo.officerName) {
                                  setSignatures({
                                    ...signatures,
                                    [field.id]: `${guardInfo.officerName} (${new Date().toLocaleTimeString('th-TH')})`,
                                  });
                                }
                              }}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold rounded-xl border border-slate-700 transition"
                            >
                              ดึงชื่อฉัน
                            </button>
                          </div>
                        </div>
                      )}

                      {field.type === 'time' && (
                        <input
                          type="time"
                          value={val || ''}
                          onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                        />
                      )}

                      {field.type === 'date' && (
                        <input
                          type="date"
                          value={val || ''}
                          onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Section: Additional Notes */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-md">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
              หมายเหตุ / ข้อสังเกตเพิ่มเติม (Optional Notes)
            </h2>
            <div className="relative">
              <textarea
                rows={3}
                placeholder="บันทึกข้อความ หรือเหตุการณ์ผิดปกติที่ต้องการแจ้งหัวหน้า รปภ. / Site Manager ทราบ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pr-10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
              />
              <MicButton
                onResult={(t) => setNotes(prev => prev ? `${prev} ${t}` : t)}
                currentValue={notes}
                mode="append"
                className="top-2.5 right-2.5 text-slate-400 hover:text-white"
              />
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="sticky bottom-0 md:bottom-4 z-20 bg-slate-900/95 border border-slate-700/80 rounded-t-2xl md:rounded-2xl p-4 shadow-2xl backdrop-blur-lg flex items-center justify-between gap-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="hidden sm:block text-xs text-slate-400">
              ตรวจสอบข้อมูลให้ถูกต้องก่อนกดยืนยันส่งแบบฟอร์ม
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Link
                href="/admin/forms"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    กำลังส่งฟอร์ม...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    ยืนยันส่งรายงาน
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
