'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Building2,
  CheckCircle,
  Eye,
  Type,
  Hash,
  ListFilter,
  CheckSquare,
  Clock,
  Camera,
  PenTool,
  AlertCircle,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSite } from '@/lib/SiteContext';

export interface FormField {
  id: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'textarea'
    | 'select'
    | 'audit_status'
    | 'photo_upload'
    | 'signature'
    | 'time'
    | 'date';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormSection {
  title: string;
  fields: FormField[];
}

interface FormBuilderEditorProps {
  initialId?: number;
}

const FIELD_TYPES = [
  { type: 'text', label: 'ข้อความสั้น (Text)', icon: Type },
  { type: 'number', label: 'ตัวเลข (Number)', icon: Hash },
  { type: 'textarea', label: 'ข้อความยาว (Textarea)', icon: Type },
  { type: 'select', label: 'ตัวเลือกแบบดรอปดาวน์ (Select)', icon: ListFilter },
  { type: 'audit_status', label: 'ปุ่มสถานะ ปกติ/ผิดปกติ (Audit)', icon: CheckSquare },
  { type: 'photo_upload', label: 'ภาพถ่ายหน้างาน (Photo)', icon: Camera },
  { type: 'signature', label: 'ลายเซ็นดิจิทัล (Signature)', icon: PenTool },
  { type: 'time', label: 'เวลา (Time)', icon: Clock },
];

export function FormBuilderEditor({ initialId }: FormBuilderEditorProps) {
  const router = useRouter();
  const { sites } = useSite();

  const [loading, setLoading] = useState(!!initialId);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'preview'>('design');

  // Form Metadata
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('patrol');
  const [siteId, setSiteId] = useState<number | null>(1); // Default BPI
  const [isPublished, setIsPublished] = useState(true);

  // Sections and Fields
  const [sections, setSections] = useState<FormSection[]>([
    {
      title: 'ข้อมูลทั่วไปและเวรยาม',
      fields: [
        { id: 'inspector_name', label: 'ชื่อผู้ตรวจ (รปภ.)', type: 'text', required: true },
        { id: 'shift', label: 'กะการทำงาน', type: 'select', options: ['กะเช้า (Day)', 'กะดึก (Night)'], required: true },
      ],
    },
  ]);

  // Load existing template if editing
  useEffect(() => {
    if (!initialId) {
      // Auto-generate code for new template
      setCode(`FORM_${Date.now().toString().slice(-6)}`);
      return;
    }

    setLoading(true);
    apiFetch<any>(`/api/dynamic-forms/templates/${initialId}`)
      .then((res) => {
        const data = res?.data ?? res;
        if (data) {
          setTitle(data.title || '');
          setCode(data.code || '');
          setDescription(data.description || '');
          setCategory(data.category || 'patrol');
          setSiteId(data.siteId ?? null);
          setIsPublished(data.isPublished ?? true);

          if (data.schemaJson?.sections && Array.isArray(data.schemaJson.sections)) {
            setSections(data.schemaJson.sections);
          }
        }
      })
      .catch((err) => {
        alert('เกิดข้อผิดพลาดในการโหลดแบบฟอร์ม: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [initialId]);

  // Add Section
  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        title: `หมวดการตรวจสอบใหม่ #${sections.length + 1}`,
        fields: [],
      },
    ]);
  };

  const handleRemoveSection = (sIndex: number) => {
    if (sections.length <= 1) {
      alert('ต้องมีอย่างน้อย 1 หมวดหมู่');
      return;
    }
    setSections(sections.filter((_, i) => i !== sIndex));
  };

  const handleUpdateSectionTitle = (sIndex: number, newTitle: string) => {
    const updated = [...sections];
    updated[sIndex].title = newTitle;
    setSections(updated);
  };

  // Add Field to Section
  const handleAddField = (sIndex: number, type: FormField['type']) => {
    const fieldId = `field_${Date.now().toString().slice(-4)}`;
    const newField: FormField = {
      id: fieldId,
      label: type === 'audit_status' ? 'รายการตรวจความปลอดภัย' : 'ระบุหัวข้อ...',
      type,
      required: true,
      options: type === 'select' ? ['ตัวเลือก 1', 'ตัวเลือก 2'] : undefined,
    };

    const updated = [...sections];
    updated[sIndex].fields.push(newField);
    setSections(updated);
  };

  const handleRemoveField = (sIndex: number, fIndex: number) => {
    const updated = [...sections];
    updated[sIndex].fields.splice(fIndex, 1);
    setSections(updated);
  };

  const handleMoveField = (sIndex: number, fIndex: number, direction: 'up' | 'down') => {
    const updated = [...sections];
    const fields = updated[sIndex].fields;
    const targetIndex = direction === 'up' ? fIndex - 1 : fIndex + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const temp = fields[fIndex];
    fields[fIndex] = fields[targetIndex];
    fields[targetIndex] = temp;
    setSections(updated);
  };

  const handleUpdateField = (sIndex: number, fIndex: number, partial: Partial<FormField>) => {
    const updated = [...sections];
    updated[sIndex].fields[fIndex] = { ...updated[sIndex].fields[fIndex], ...partial };
    setSections(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('กรุณาระบุชื่อแบบฟอร์ม');
      return;
    }
    if (!code.trim()) {
      alert('กรุณาระบุรหัสแบบฟอร์ม');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code,
        title,
        description,
        category,
        siteId: siteId ? Number(siteId) : null,
        isPublished,
        schemaJson: {
          sections,
        },
      };

      if (initialId) {
        await apiFetch(`/api/dynamic-forms/templates/${initialId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/dynamic-forms/templates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      alert('บันทึกแบบฟอร์มเรียบร้อยแล้ว');
      router.push('/admin/forms');
    } catch (err: any) {
      alert(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <span>กำลังโหลดข้อมูลแบบฟอร์ม...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-3 z-30">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/admin/forms"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="กลับไปยังคลังแบบฟอร์ม"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base md:text-lg font-black text-slate-900 leading-tight">
              {initialId ? 'แก้ไขแบบฟอร์ม (Form Builder)' : 'สร้างแบบฟอร์มใหม่ (New Template)'}
            </h1>
            <p className="text-xs text-slate-400">
              {title ? title : 'กำหนดรายละเอียดและฟิลด์ที่ต้องการตรวจตรา'}
            </p>
          </div>
        </div>

        {/* Right Toggle and Save Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Design / Preview Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('design')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'design'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              โหมดออกแบบ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'preview'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ทดลองดู (Preview)</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกแบบฟอร์ม'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'design' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Settings & Information */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 text-xs">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>การกำหนดสังกัดและหมวดหมู่</span>
              </h3>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  สาขาที่ใช้งานแบบฟอร์มนี้:
                </label>
                <select
                  value={siteId === null ? 'global' : siteId}
                  onChange={(e) => setSiteId(e.target.value === 'global' ? null : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="1">สาขาบางปะอิน (BPI Plant)</option>
                  <option value="2">สาขาปราจีนบุรี (PRB Plant)</option>
                  <option value="global">ใช้ได้ทุกสาขา (Global Template)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  กำหนดเพื่อแยกฟอร์มเฉพาะของแต่ละสาขา เช่น รปภ. ปราจีนบุรี จะเห็นฟอร์มที่ระบุ PRB
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อแบบฟอร์ม (Form Title):
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น แบบฟอร์มตรวจตราอาคาร PRB"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รหัสแบบฟอร์ม (Form Code):
                </label>
                <input
                  type="text"
                  required
                  placeholder="PRB_PATROL_V2"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมวดหมู่:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="patrol">ตรวจตรา (Patrol)</option>
                  <option value="parking">ลานจอดรถ (Parking)</option>
                  <option value="cctv">กล้อง CCTV</option>
                  <option value="equipment">เครื่องตรวจจับ / อุปกรณ์</option>
                  <option value="incident">เหตุการณ์ฉุกเฉิน</option>
                  <option value="general">ทั่วไป</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">คำอธิบายฟอร์ม:</label>
                <textarea
                  rows={3}
                  placeholder="วัตถุประสงค์และคำชี้แจงสำหรับเจ้าหน้าที่ผู้ตรวจ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <div className="font-bold text-slate-800">สถานะเปิดใช้งาน (Publish)</div>
                  <div className="text-[11px] text-slate-400">หากปิดจะเป็นฉบับร่าง (Draft)</div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right Columns: Canvas Section Builder */}
          <div className="lg:col-span-2 space-y-4">
            {sections.map((sec, sIdx) => (
              <div
                key={sIdx}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                      {sIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => handleUpdateSectionTitle(sIdx, e.target.value)}
                      placeholder="ระบุชื่อหมวดหมู่..."
                      className="font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-slate-50 px-1 py-0.5 rounded outline-none flex-1 transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(sIdx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                    title="ลบหมวดนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Field List in Section */}
                <div className="space-y-3">
                  {sec.fields.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      ยังไม่มีฟิลด์ในหมวดนี้ กรุณาเลือกเพิ่มฟิลด์ด้านล่าง
                    </div>
                  ) : (
                    sec.fields.map((field, fIdx) => (
                      <div
                        key={field.id || fIdx}
                        className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                      >
                        {/* Field Label & Type Tag */}
                        <div className="flex-1 space-y-1 w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                              {field.type}
                            </span>
                            {field.required && (
                              <span className="text-[10px] text-rose-500 font-bold">* บังคับ</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) =>
                              handleUpdateField(sIdx, fIdx, { label: e.target.value })
                            }
                            placeholder="ระบุข้อความคำถาม / รายการตรวจ..."
                            className="w-full font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                          />

                          {/* Options editor if select */}
                          {field.type === 'select' && (
                            <div className="mt-1">
                              <label className="text-[10px] font-semibold text-slate-400">
                                ตัวเลือก (คั่นด้วยจุลภาค , ):
                              </label>
                              <input
                                type="text"
                                value={field.options?.join(', ') || ''}
                                onChange={(e) =>
                                  handleUpdateField(sIdx, fIdx, {
                                    options: e.target.value.split(',').map((s) => s.trim()),
                                  })
                                }
                                placeholder="ตัวเลือก 1, ตัวเลือก 2, ตัวเลือก 3"
                                className="w-full text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* Field Controls (Required, Up, Down, Delete) */}
                        <div className="flex items-center gap-1 self-end md:self-center">
                          <label className="flex items-center gap-1 text-[11px] text-slate-600 font-medium mr-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                handleUpdateField(sIdx, fIdx, { required: e.target.checked })
                              }
                              className="rounded text-blue-600"
                            />
                            <span>บังคับ</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleMoveField(sIdx, fIdx, 'up')}
                            disabled={fIdx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveField(sIdx, fIdx, 'down')}
                            disabled={fIdx === sec.fields.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(sIdx, fIdx)}
                            className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Field Palette Button Bar */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    + เพิ่มฟิลด์ในหมวดนี้:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {FIELD_TYPES.map((f) => {
                      const Icon = f.icon;
                      return (
                        <button
                          key={f.type}
                          type="button"
                          onClick={() => handleAddField(sIdx, f.type as any)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200/60"
                        >
                          <Icon className="w-3 h-3 text-slate-500" />
                          <span>{f.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Add Section Button */}
            <button
              type="button"
              onClick={handleAddSection}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มหมวดหมู่ใหม่ (Add Section)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Live Preview Mode */
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4 text-center">
            <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 mb-2">
              {siteId === 1 ? 'สาขาบางปะอิน (BPI)' : siteId === 2 ? 'สาขาปราจีนบุรี (PRB)' : 'แบบฟอร์มกลาง'}
            </span>
            <h2 className="text-xl font-black text-slate-900">{title || 'แบบฟอร์มไม่มีชื่อ'}</h2>
            {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
          </div>

          <div className="space-y-6">
            {sections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-3">
                <h3 className="font-bold text-sm text-slate-800 pb-1 border-b border-slate-100">
                  {sec.title}
                </h3>
                <div className="space-y-3 text-xs">
                  {sec.fields.map((f, fIdx) => (
                    <div key={fIdx} className="space-y-1">
                      <label className="block font-semibold text-slate-700">
                        {f.label} {f.required && <span className="text-rose-500">*</span>}
                      </label>

                      {f.type === 'text' && (
                        <input
                          type="text"
                          disabled
                          placeholder="กรอกข้อความ..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      )}

                      {f.type === 'number' && (
                        <input
                          type="number"
                          disabled
                          placeholder="0"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      )}

                      {f.type === 'textarea' && (
                        <textarea
                          disabled
                          rows={2}
                          placeholder="ระบุรายละเอียด..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      )}

                      {f.type === 'select' && (
                        <select
                          disabled
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <option>-- เลือกรายการ --</option>
                          {f.options?.map((opt, oIdx) => (
                            <option key={oIdx}>{opt}</option>
                          ))}
                        </select>
                      )}

                      {f.type === 'audit_status' && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            type="button"
                            className="py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 font-bold"
                          >
                            ✓ ปกติ
                          </button>
                          <button
                            type="button"
                            className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium"
                          >
                            ✗ ผิดปกติ
                          </button>
                          <button
                            type="button"
                            className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium"
                          >
                            ⚠ ชำรุด
                          </button>
                        </div>
                      )}

                      {f.type === 'photo_upload' && (
                        <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                          <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                          <span>ถ่ายรูปหน้างาน หรือเลือกไฟล์</span>
                        </div>
                      )}

                      {f.type === 'signature' && (
                        <div className="h-20 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <span>(พื้นที่ลงลายเซ็นดิจิทัล)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FormBuilderEditor;
