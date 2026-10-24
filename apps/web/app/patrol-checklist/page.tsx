'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Eye, Pencil, Trash2, X, Check,
  Save, RotateCcw, Sparkles, Send, Sun, Moon, Camera, Radio
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import MicButton from '@/components/MicButton';
import CollapsibleHistory from '@/components/CollapsibleHistory';

const DRAFT_KEY = 'wd_pwa_draft_patrol_checklist';

interface PatrolRecord {
  id: number;
  patrolDate: string;
  patrolRoute: string;
  officerName: string;
  status: string;
  notes: string;
  createdAt: string;
}

const CHECK_LABELS: Record<string, string> = {
  shift: 'กะ', report_condition: 'สภาพทั่วไป', patrol_time: 'เวลาทำการเดินตรวจ',
  fence_lighting: 'ไฟส่องรั้ว', fence_objects: 'สิ่งของริมรั้ว', no_gathering: 'ไม่มีการรวมกลุ่ม',
  no_flyers: 'ไม่มีใบปลิว', fence_normal: 'รั้วปกติ', no_suspicious_parking: 'ไม่มีรถน่าสงสัย',
  no_suspicious_boxes: 'ไม่มีกล่องน่าสงสัย', no_unauthorized_persons_area: 'ไม่มีบุคคลภายนอก',
  door_system_normal: 'ระบบประตูปกติ', electrical_system_normal: 'ระบบไฟฟ้าปกติ',
  no_room_abnormalities: 'ห้องปกติ', no_unauthorized_persons_room: 'ไม่มีบุคคลภายนอกในห้อง',
  no_chemical_obstruction: 'ไม่มีสิ่งกีดขวางสารเคมี', no_container_leaks: 'ไม่มีถังรั่ว',
  no_unauthorized_persons_chemical: 'ไม่มีบุคคลภายนอกสารเคมี', chemical_door_normal: 'ประตูสารเคมีปกติ',
  no_unauthorized_persons_electrical: 'ไม่มีบุคคลภายนอกไฟฟ้า', electrical_door_normal: 'ประตูไฟฟ้าปกติ',
  no_electrical_abnormalities: 'ไม่มีความผิดปกติไฟฟ้า', equipment_normal: 'อุปกรณ์ปกติ',
  no_fire_door_obstruction: 'ไม่มีสิ่งกีดขวางประตูไฟ', buildings: 'อาคารที่ตรวจ',
};

const PASS_PHRASES = ['ปกติ', 'ภาวะปกติ', 'normal', 'pass', 'ok', 'ปลอดภัย', 'ไม่มี', 'ไม่พบ', 'เพียงพอ'];

function isPassValue(val: string): boolean {
  if (!val) return false;
  const v = val.toLowerCase();
  return PASS_PHRASES.some(p => v === p || v.startsWith(p));
}

function parseNotes(notesStr: string): { key: string; label: string; value: string; pass: boolean }[] {
  try {
    const notes = JSON.parse(notesStr);
    return Object.entries(notes).map(([key, val]) => {
      const strVal = String(val || '');
      return { key, label: CHECK_LABELS[key] || key, value: strVal, pass: key === 'shift' ? true : isPassValue(strVal) };
    });
  } catch { return []; }
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  const h2 = String((i + 1) % 24).padStart(2, '0');
  return `${h}.00-${h2}.00`;
});

const BUILDING_OPTIONS = ['อาคาร 1', 'อาคาร 2', 'อาคาร 3', 'อาคาร 4', 'อาคาร 6', 'อาคาร 9'];

function ToggleGroup({ label, value, options, onChange }: { label: string; value: string; options: { val: string; label: string; icon?: React.ReactNode; color: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label} <span className="text-rose-500">*</span></label>
      <div className="grid grid-cols-2 sm:flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button key={opt.val} type="button" onClick={() => onChange(opt.val)}
            className={`px-4 py-3 sm:py-2.5 min-h-[44px] flex items-center justify-center border-2 rounded-xl font-medium text-sm transition-all cursor-pointer ${value === opt.val ? opt.color : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}>
            {value === opt.val && <Check className="w-3.5 h-3.5 mr-1 inline" />}
            {opt.icon && <span className="mr-1">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
      <input type="hidden" value={value} required />
    </div>
  );
}

export default function PatrolChecklistPage() {
  const [mode, setMode] = useState<'form' | 'list'>('form');
  const [records, setRecords] = useState<PatrolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Form state
  const [patrolDate, setPatrolDate] = useState('');
  const [reportCondition, setReportCondition] = useState('');
  const [shift, setShift] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [patrolTime, setPatrolTime] = useState('');
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Draft state
  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);

  // Toggle field states (15 perimeter + 12 interior = 27)
  const [perimeter, setPerimeter] = useState<Record<string, string>>({
    fence_lighting: '', fence_objects: '', no_gathering: '', no_flyers: '',
    fence_normal: '', no_suspicious_parking: '', no_suspicious_boxes: '',
  });
  const [interior, setInterior] = useState<Record<string, string>>({
    no_unauthorized_persons_area: '', door_system_normal: '',
    no_room_abnormalities: '', no_unauthorized_persons_room: '',
    no_chemical_obstruction: '', no_container_leaks: '', no_unauthorized_persons_chemical: '', chemical_door_normal: '',
    no_unauthorized_persons_electrical: '', electrical_door_normal: '', no_electrical_abnormalities: '',
    equipment_normal: '', no_fire_door_obstruction: '',
  });

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; data: PatrolRecord[] }>('/api/patrol');
      setRecords(Array.isArray(res) ? res : res.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setPatrolDate(new Date().toISOString().split('T')[0]);
    apiFetch<any>('/api/auth/me').then(d => {
      const data = d?.data ?? d.user ?? d;
      const empId = data.username || data.employeeId || data.department || '';
      if (empId) setEmployeeCode(empId);
      const name = data.fullName || data.username || '';
      if (name) setEmployeeName(name);
    }).catch(() => {});
    fetchRecords();

    // Check for draft in localStorage
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.reportCondition || p.shift || p.patrolTime || (p.selectedBuildings && p.selectedBuildings.length > 0)) {
          setHasDraftNotice(true);
          setLastSavedDraftTime(p._savedAt || 'ก่อนหน้านี้');
        }
      }
    } catch {}
  }, [fetchRecords]);

  // Debounced auto-save draft
  useEffect(() => {
    if (editingId !== null) return;
    const timer = setTimeout(() => {
      const hasData = reportCondition || shift || patrolTime || selectedBuildings.length > 0 || Object.values(perimeter).some(Boolean) || Object.values(interior).some(Boolean);
      if (hasData) {
        try {
          const toSave = {
            patrolDate,
            reportCondition,
            shift,
            patrolTime,
            selectedBuildings,
            perimeter,
            interior,
            _savedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
          setLastSavedDraftTime(toSave._savedAt);
        } catch {}
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [patrolDate, reportCondition, shift, patrolTime, selectedBuildings, perimeter, interior, editingId]);

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.reportCondition) setReportCondition(p.reportCondition);
        if (p.shift) setShift(p.shift);
        if (p.patrolTime) setPatrolTime(p.patrolTime);
        if (p.selectedBuildings) setSelectedBuildings(p.selectedBuildings);
        if (p.perimeter) setPerimeter(p.perimeter);
        if (p.interior) setInterior(p.interior);
        setHasDraftNotice(false);
      }
    } catch {}
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraftNotice(false);
      setLastSavedDraftTime(null);
    } catch {}
  };

  const handleQuickPassAll = () => {
    setReportCondition('ภาวะปกติ');
    const pNormal: Record<string, string> = {};
    perimeterFields.forEach(f => { pNormal[f.key] = f.pass; });
    setPerimeter(pNormal);

    const iNormal: Record<string, string> = {};
    interiorFields.forEach(f => { iNormal[f.key] = f.pass; });
    setInterior(iNormal);
  };

  const toggleBuilding = (b: string) => {
    setSelectedBuildings(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const resetForm = () => {
    setEditingId(null);
    setPatrolDate(new Date().toISOString().split('T')[0]);
    setReportCondition('');
    setShift('');
    setPatrolTime('');
    setSelectedBuildings([]);
    setPerimeter({ fence_lighting: '', fence_objects: '', no_gathering: '', no_flyers: '', fence_normal: '', no_suspicious_parking: '', no_suspicious_boxes: '' });
    setInterior({ no_unauthorized_persons_area: '', door_system_normal: '', no_room_abnormalities: '', no_unauthorized_persons_room: '', no_chemical_obstruction: '', no_container_leaks: '', no_unauthorized_persons_chemical: '', chemical_door_normal: '', no_unauthorized_persons_electrical: '', electrical_door_normal: '', no_electrical_abnormalities: '', equipment_normal: '', no_fire_door_obstruction: '' });
  };

  const handleEdit = (rec: PatrolRecord) => {
    setEditingId(rec.id);
    setPatrolDate((rec.patrolDate || '').split('T')[0] || new Date().toISOString().split('T')[0]);
    try {
      const notes = JSON.parse(rec.notes || '{}');
      setReportCondition(notes.report_condition || '');
      setShift(notes.shift || '');
      setPatrolTime(notes.patrol_time || '');
      const bldgs = String(notes.buildings || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      setSelectedBuildings(bldgs);
      setPerimeter({
        fence_lighting: notes.fence_lighting || '', fence_objects: notes.fence_objects || '',
        no_gathering: notes.no_gathering || '', no_flyers: notes.no_flyers || '',
        fence_normal: notes.fence_normal || '', no_suspicious_parking: notes.no_suspicious_parking || '',
        no_suspicious_boxes: notes.no_suspicious_boxes || '',
      });
      setInterior({
        no_unauthorized_persons_area: notes.no_unauthorized_persons_area || '', door_system_normal: notes.door_system_normal || '',
        no_room_abnormalities: notes.no_room_abnormalities || '', no_unauthorized_persons_room: notes.no_unauthorized_persons_room || '',
        no_chemical_obstruction: notes.no_chemical_obstruction || '', no_container_leaks: notes.no_container_leaks || '',
        no_unauthorized_persons_chemical: notes.no_unauthorized_persons_chemical || '', chemical_door_normal: notes.chemical_door_normal || '',
        no_unauthorized_persons_electrical: notes.no_unauthorized_persons_electrical || '', electrical_door_normal: notes.electrical_door_normal || '',
        no_electrical_abnormalities: notes.no_electrical_abnormalities || '', equipment_normal: notes.equipment_normal || '',
        no_fire_door_obstruction: notes.no_fire_door_obstruction || '',
      });
      if (rec.officerName) setEmployeeName(rec.officerName);
    } catch { /* keep defaults if notes unparseable */ }
    setMode('form');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
    setMessage('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบรายงานนี้?')) return;
    try {
      await apiFetch(`/api/patrol/${id}`, { method: 'DELETE' });
      setMessage('ลบรายงานเรียบร้อยแล้ว');
      fetchRecords();
    } catch { setMessage('เกิดข้อผิดพลาดในการลบข้อมูล'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportCondition || !shift || !patrolTime || selectedBuildings.length === 0) {
      setMessage('กรุณากรอกข้อมูลให้ครบถ้วน'); return;
    }
    const allPerimeterPass = Object.values(perimeter).every(v => v);
    const allInteriorPass = Object.values(interior).every(v => v);
    const allPass = reportCondition === 'ภาวะปกติ' && allPerimeterPass && allInteriorPass;

    const notes: Record<string, string> = {
      shift, report_condition: reportCondition, patrol_time: patrolTime,
      buildings: selectedBuildings.join(', '),
      ...perimeter, ...interior,
    };

    setSubmitting(true);
    setMessage('');
    try {
      const payload = {
        patrolDate,
        patrolRoute: `[${patrolTime}] ${selectedBuildings.join(', ')}`,
        officerName: employeeName || employeeCode,
        status: allPass ? 'normal' : 'abnormal',
        notes: JSON.stringify(notes),
      };
      if (editingId !== null) {
        await apiFetch(`/api/patrol/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setMessage('แก้ไขรายงานการลาดตระเวนเรียบร้อยแล้ว');
        setEditingId(null);
      } else {
        await apiFetch('/api/patrol', { method: 'POST', body: JSON.stringify(payload) });
        setMessage('บันทึกรายงานการลาดตระเวนเรียบร้อยแล้ว');
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraftNotice(false);
        setLastSavedDraftTime(null);
      } catch {}
      fetchRecords();
    } catch { setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล'); }
    finally { setSubmitting(false); }
  };

  const perimeterFields = [
    { key: 'fence_lighting', label: '1.1 ไฟส่องรั้วและพื้นที่โดยรอบ', pass: 'ปกติ', fail: 'ผิดปกติ', passColor: 'border-emerald-500 bg-emerald-50 text-emerald-700', failColor: 'border-rose-500 bg-rose-50 text-rose-700' },
    { key: 'fence_objects', label: '1.2 สิ่งของวางขวางริมรั้ว', pass: 'ไม่มี', fail: 'มี', passColor: 'border-emerald-500 bg-emerald-50 text-emerald-700', failColor: 'border-rose-500 bg-rose-50 text-rose-700' },
    { key: 'no_gathering', label: '1.3 การรวมกลุ่มของบุคคล', pass: 'ไม่มี', fail: 'มี', passColor: 'border-emerald-500 bg-emerald-50 text-emerald-700', failColor: 'border-rose-500 bg-rose-50 text-rose-700' },
    { key: 'no_flyers', label: '1.4 ใบปลิว/สิ่งพิมพ์', pass: 'ไม่มี', fail: 'มี', passColor: 'border-emerald-500 bg-emerald-50 text-emerald-700', failColor: 'border-rose-500 bg-rose-50 text-rose-700' },
    { key: 'fence_normal', label: '1.5 รั้วโดยรอบ', pass: 'ปกติ', fail: 'ผิดปกติ', passColor: 'border-emerald-500 bg-emerald-50 text-emerald-700', failColor: 'border-rose-500 bg-rose-50 text-rose-700' },
    { key: 'no_suspicious_parking', label: '1.6 รถน่าสงสัย', pass: 'ไม่มี', fail: 'มี', passColor: 'border-emerald-500 bg-emerald-50 text-emerald-700', failColor: 'border-rose-500 bg-rose-50 text-rose-700' },
    { key: 'no_suspicious_boxes', label: '1.7 กล่อง/สิ่งของน่าสงสัย', pass: 'ไม่มี', fail: 'มี', passColor: 'border-emerald-500 bg-emerald-50 text-emerald-700', failColor: 'border-rose-500 bg-rose-50 text-rose-700' },
  ];

  const interiorFields = [
    { key: 'no_unauthorized_persons_area', label: '2.1.1 บุคคลภายนอกในพื้นที่ทั่วไป', pass: 'ไม่มี', fail: 'มี' },
    { key: 'door_system_normal', label: '2.1.2 ระบบประตูเปิด-ปิด', pass: 'ปกติ', fail: 'ผิดปกติ' },
    { key: 'no_room_abnormalities', label: '2.2.1 ห้องควบคุมปกติ', pass: 'ปกติ', fail: 'ผิดปกติ' },
    { key: 'no_unauthorized_persons_room', label: '2.2.2 บุคคลภายนอกในห้องควบคุม', pass: 'ไม่มี', fail: 'มี' },
    { key: 'no_chemical_obstruction', label: '2.3.1 สารเคมีไม่มีสิ่งกีดขวาง', pass: 'ไม่มี', fail: 'มี' },
    { key: 'no_container_leaks', label: '2.3.2 ถังสารเคมีไม่รั่ว', pass: 'ไม่มี', fail: 'มี' },
    { key: 'no_unauthorized_persons_chemical', label: '2.3.3 บุคคลภายนอกในห้องสารเคมี', pass: 'ไม่มี', fail: 'มี' },
    { key: 'chemical_door_normal', label: '2.4 ประตูห้องสารเคมี', pass: 'ปกติ', fail: 'ผิดปกติ' },
    { key: 'no_unauthorized_persons_electrical', label: '2.5.1 บุคคลภายนอกสถานีไฟฟ้า', pass: 'ไม่มี', fail: 'มี' },
    { key: 'electrical_door_normal', label: '2.5.2 ประตูสถานีไฟฟ้า', pass: 'ปกติ', fail: 'ผิดปกติ' },
    { key: 'no_electrical_abnormalities', label: '2.5.3 ความผิดปกติสถานีไฟฟ้า', pass: 'ไม่มี', fail: 'มี' },
    { key: 'equipment_normal', label: '2.6.1 อุปกรณ์หนีไฟปกติ', pass: 'ปกติ', fail: 'ผิดปกติ' },
    { key: 'no_fire_door_obstruction', label: '2.6.2 ประตูหนีไฟไม่มีสิ่งกีดขวาง', pass: 'ไม่มี', fail: 'มี' },
  ];

  const abnormalRecords = records.filter(r => r.status === 'abnormal');
  const normalRecords = records.filter(r => r.status === 'normal');

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans pb-28">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <PageHeader
          title="Checklist Patrol"
          subtitle="รายการตรวจตรา"
          icon={<ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          actions={
            <button onClick={() => setMode(mode === 'form' ? 'list' : 'form')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm cursor-pointer">
              {mode === 'form' ? <><Eye className="w-4 h-4" />ดูรายการ</> : <><ShieldCheck className="w-4 h-4" />กรอกรายงาน</>}
            </button>
          }
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Auto-save Draft Notice Banner */}
        {mode === 'form' && hasDraftNotice && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-amber-900">
                  พบข้อมูลฉบับร่างที่บันทึกไว้ ({lastSavedDraftTime})
                </p>
                <p className="text-[11px] sm:text-xs text-amber-700">
                  คุณต้องการกู้คืนข้อมูลการเดินตรวจที่กรอกค้างไว้หรือไม่?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                กู้คืนข้อมูล
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100/60 text-xs font-semibold transition-all cursor-pointer"
              >
                ล้างร่าง
              </button>
            </div>
          </div>
        )}

        {mode === 'form' ? (
          /* ========== PATROL FORM ========== */
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {editingId !== null && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-amber-700" />
                  กำลังแก้ไขรายการ #{editingId} — บันทึกจะใช้ PUT /api/patrol/{editingId}
                </span>
                <button type="button" onClick={handleCancelEdit} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-1.5 cursor-pointer">
                  <X className="w-3.5 h-3.5" />ยกเลิก
                </button>
              </div>
            )}

            {/* Quick Action: 1-Click Pass All */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-blue-900">ตัวช่วยบันทึกผลการตรวจด่วน (Quick Presets)</h4>
                  <p className="text-[11px] text-blue-700">คลิกเดียวเพื่อตั้งค่าผลตรวจรอบรั้วและภายในอาคารทั้งหมดเป็น &quot;ปกติ&quot;</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickPassAll}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ตั้งค่าปกติทุกรายการ (Pass All)</span>
              </button>
            </div>

            {/* Section 1: General Info */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
              <h3 className="text-base md:text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">ข้อมูลทั่วไป</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">วันที่ <span className="text-rose-500">*</span></label>
                  <input type="date" value={patrolDate} onChange={e => setPatrolDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <ToggleGroup label="ตรวจสอบภาวะ" value={reportCondition} onChange={setReportCondition}
                  options={[{ val: 'ภาวะปกติ', label: 'ภาวะปกติ', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' }, { val: 'ภาวะฉุกเฉิน', label: 'ภาวะฉุกเฉิน', color: 'border-rose-500 bg-rose-50 text-rose-700' }]} />
                <ToggleGroup label="กะ" value={shift} onChange={setShift}
                  options={[
                    { val: 'เช้า', label: 'เช้า', icon: <Sun className="w-3.5 h-3.5 text-amber-500 inline" />, color: 'border-blue-500 bg-blue-50 text-blue-700' },
                    { val: 'บ่าย', label: 'บ่าย', icon: <Sun className="w-3.5 h-3.5 text-orange-500 inline" />, color: 'border-orange-500 bg-orange-50 text-orange-700' },
                    { val: 'ดึก', label: 'ดึก', icon: <Moon className="w-3.5 h-3.5 text-indigo-500 inline" />, color: 'border-purple-500 bg-purple-50 text-purple-700' }
                  ]} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">รหัสพนักงาน <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input type="text" value={employeeCode} onChange={e => setEmployeeCode(e.target.value)} placeholder="รหัสพนักงาน"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                    <MicButton onResult={v => setEmployeeCode(v)} currentValue={employeeCode} mode="replace" label="พูดรหัสพนักงาน" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อนามสกุล <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input type="text" value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="ชื่อ-นามสกุล"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                    <MicButton onResult={v => setEmployeeName(v)} currentValue={employeeName} mode="replace" label="พูดชื่อ-นามสกุล" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">เวลาทำการเดินตรวจ <span className="text-rose-500">*</span></label>
                  <select value={patrolTime} onChange={e => setPatrolTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required>
                    <option value="" disabled>เลือกเวลา</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">อาคารที่ตรวจ <span className="text-rose-500">*</span></label>
                <div className="flex gap-2 flex-wrap">
                  {BUILDING_OPTIONS.map(b => (
                    <button key={b} type="button" onClick={() => toggleBuilding(b)}
                      className={`px-4 py-2 border-2 rounded-xl font-medium text-sm transition-all cursor-pointer ${selectedBuildings.includes(b) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-emerald-300 bg-white'}`}>
                      {selectedBuildings.includes(b) && <Check className="w-3.5 h-3.5 mr-1 inline" />}{b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Perimeter */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
              <h3 className="text-base md:text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">1. การตรวจสอบแนวรั้ว</h3>
              {perimeterFields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{f.label} <span className="text-rose-500">*</span></label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPerimeter({ ...perimeter, [f.key]: f.pass })}
                      className={`flex-1 px-4 py-2.5 border-2 rounded-xl font-medium text-sm transition-all cursor-pointer ${perimeter[f.key] === f.pass ? f.passColor : 'border-slate-200 text-slate-600 hover:border-emerald-300 bg-white'}`}>
                      {perimeter[f.key] === f.pass && <Check className="w-3.5 h-3.5 mr-1 inline" />}{f.pass}
                    </button>
                    <button type="button" onClick={() => setPerimeter({ ...perimeter, [f.key]: f.fail })}
                      className={`flex-1 px-4 py-2.5 border-2 rounded-xl font-medium text-sm transition-all cursor-pointer ${perimeter[f.key] === f.fail ? f.failColor : 'border-slate-200 text-slate-600 hover:border-rose-300 bg-white'}`}>
                      {perimeter[f.key] === f.fail && <X className="w-3.5 h-3.5 mr-1 inline" />}{f.fail}
                    </button>
                  </div>
                  <input type="hidden" value={perimeter[f.key]} required />
                </div>
              ))}
            </div>

            {/* Section 3: Interior */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
              <h3 className="text-base md:text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">2. การตรวจสอบพื้นที่ภายใน</h3>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase">2.1 พื้นที่ทั่วไป</p>
                {interiorFields.slice(0, 2).map(f => (
                  <ToggleField key={f.key} field={f} value={interior[f.key]} onChange={v => setInterior({ ...interior, [f.key]: v })} />
                ))}
              </div>
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">2.2 ห้องควบคุม</p>
                {interiorFields.slice(2, 4).map(f => (
                  <ToggleField key={f.key} field={f} value={interior[f.key]} onChange={v => setInterior({ ...interior, [f.key]: v })} />
                ))}
              </div>
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">2.3-2.4 ห้องเก็บสารเคมี / สถานีจ่ายไฟฟ้า</p>
                {interiorFields.slice(4, 9).map(f => (
                  <ToggleField key={f.key} field={f} value={interior[f.key]} onChange={v => setInterior({ ...interior, [f.key]: v })} />
                ))}
              </div>
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">2.5-2.6 สถานีจ่ายไฟฟ้า / อุปกรณ์หนีไฟ</p>
                {interiorFields.slice(9).map(f => (
                  <ToggleField key={f.key} field={f} value={interior[f.key]} onChange={v => setInterior({ ...interior, [f.key]: v })} />
                ))}
              </div>
            </div>

            <div className="pt-2 hidden md:flex justify-center gap-3 flex-wrap">
              <button type="submit" disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-10 rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]">
                <Save className="w-4 h-4" />
                <span>{submitting ? 'กำลังบันทึก...' : editingId !== null ? 'บันทึกการแก้ไข (PUT)' : 'บันทึกรายงานการลาดตระเวน'}</span>
              </button>
              {editingId !== null && (
                <button type="button" onClick={handleCancelEdit}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 px-8 rounded-full shadow transition-colors text-sm md:text-base inline-flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <X className="w-4 h-4" /><span>ยกเลิกการแก้ไข</span>
                </button>
              )}
            </div>
          </form>
        ) : (
          /* ========== LIST MODE ========== */
          <CollapsibleHistory
            title="ประวัติการตรวจตราย้อนหลัง"
            count={records.length}
            defaultOpen={true}
            headerActions={
              <button
                type="button"
                onClick={fetchRecords}
                disabled={loading}
                title="รีเฟรชประวัติ"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200/60 p-4 text-center">
                  <div className="text-2xl font-black text-slate-800">{records.length}</div>
                  <div className="text-xs text-slate-500">รายการทั้งหมด</div>
                </div>
                <div className="bg-emerald-50/50 rounded-2xl shadow-sm border border-emerald-200/60 p-4 text-center">
                  <div className="text-2xl font-black text-emerald-600">{normalRecords.length}</div>
                  <div className="text-xs text-slate-500">ปกติ</div>
                </div>
                <div className="bg-rose-50/50 rounded-2xl shadow-sm border border-rose-200/60 p-4 text-center">
                  <div className="text-2xl font-black text-rose-600">{abnormalRecords.length}</div>
                  <div className="text-xs text-slate-500">ผิดปกติ</div>
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-2xl p-12 text-center"><RefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" /><p className="text-slate-400 text-sm">กำลังโหลด...</p></div>
              ) : records.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center"><ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-400">ยังไม่มีรายงาน</p></div>
              ) : (
                <>
                  {records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(rec => {
                    const items = parseNotes(rec.notes || '{}');
                    return (
                      <div key={rec.id} className="bg-slate-50/70 rounded-2xl shadow-sm border border-slate-200/60 p-4 md:p-5">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className={`w-2.5 h-2.5 rounded-full ${rec.status === 'normal' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="font-bold text-slate-800 text-sm">{rec.patrolRoute || 'ไม่ระบุเส้นทาง'}</span>
                          <span className="text-xs text-slate-500">{formatDate(rec.patrolDate || rec.createdAt)}</span>
                          <span className="text-xs text-slate-500">{rec.officerName}</span>
                          <span className="ml-auto inline-flex gap-1">
                            <button type="button" onClick={() => handleEdit(rec)} title="แก้ไข" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleDelete(rec.id)} title="ลบ" className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </span>
                        </div>
                        {items.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-2">
                            {items.filter(i => i.key !== 'buildings').map(item => (
                              <div key={item.key} className={`text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 ${item.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {item.pass ? <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" /> : <X className="w-3 h-3 text-rose-600 flex-shrink-0" />}
                                <span className="truncate">{item.label}: {item.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {records.length > PAGE_SIZE && <Pagination page={page} totalItems={records.length} pageSize={PAGE_SIZE} onPageChange={setPage} />}
                </>
              )}
            </div>
          </CollapsibleHistory>
        )}
      </div>

      {/* Mobile PWA Sticky Bottom Action Dock */}
      {mode === 'form' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] shadow-lg">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="truncate">
                {lastSavedDraftTime ? `ร่างอัตโนมัติ: ${lastSavedDraftTime}` : 'พร้อมส่งรายงานตรวจตรา'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 min-h-[42px]"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'กำลังบันทึก...' : editingId !== null ? 'บันทึกแก้ไข' : 'ส่งรายงาน'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleField({ field, value, onChange }: { field: { key: string; label: string; pass: string; fail: string }; value: string; onChange: (v: string) => void }) {
  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => onChange(field.pass)}
            className={`flex-1 sm:flex-initial px-4 py-2 min-h-[40px] sm:min-h-[36px] flex items-center justify-center border rounded-xl font-medium text-xs transition-all cursor-pointer ${value === field.pass ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-500 hover:border-emerald-300 bg-white'}`}>
            {value === field.pass && <Check className="w-3.5 h-3.5 mr-1 inline" />}
            {field.pass}
          </button>
          <button type="button" onClick={() => onChange(field.fail)}
            className={`flex-1 sm:flex-initial px-4 py-2 min-h-[40px] sm:min-h-[36px] flex items-center justify-center border rounded-xl font-medium text-xs transition-all cursor-pointer ${value === field.fail ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold' : 'border-slate-200 text-slate-500 hover:border-rose-300 bg-white'}`}>
            {value === field.fail && <X className="w-3.5 h-3.5 mr-1 inline" />}
            {field.fail}
          </button>
        </div>
        <input type="hidden" value={value} required />
      </div>
    </div>
  );
}
