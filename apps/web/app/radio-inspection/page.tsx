'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import MicButton from '@/components/MicButton';
import CollapsibleHistory from '@/components/CollapsibleHistory';
import { Clock, Radio, Camera, Search, RefreshCw, Trash2, Eye, X, Pencil, Download, ImagePlus, Plus, Check, Save, RotateCcw, Sparkles, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { apiFetch } from '@/lib/api';

const DRAFT_KEY = 'wd_pwa_draft_radio_inspection';

interface RadioEquipment {
  id: number;
  assetNumber: string;
  assetName: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  referenceImageUrl?: string | null;
}

interface ItemState {
  present: boolean;
  working: boolean;
  remark: string;
  photo: string | null;
}

const defaultItemState = (): ItemState => ({ present: true, working: true, remark: '', photo: null });

const isOk = (s: ItemState) => s.present && s.working;

/** ย่อ+บีบอัดรูปถ่ายหน้างานเหลือไม่เกิน 1024px (JPEG) ก่อนส่งเก็บใน DB */
function compressImage(file: File, maxSize = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatSafeDate(val?: any): string {
  if (!val) return '-';
  const str = String(val).trim();
  if (str.toUpperCase().includes('INVALID') || str === 'null' || str === 'undefined' || str === 'NaN') return '-';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('th-TH');
}

export default function RadioInspectionPage() {
  const [equipments, setEquipments] = useState<RadioEquipment[]>([]);
  const [equipLoading, setEquipLoading] = useState(true);
  const [equipSearch, setEquipSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');

  const [inspectionDate, setInspectionDate] = useState('');
  const [shift, setShift] = useState('กะเช้า (07.00 - 19.00)');
  const [inspectorName, setInspectorName] = useState('');

  const [items, setItems] = useState<Record<number, ItemState>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw && !editingId) {
        const d = JSON.parse(raw);
        if (d.items && Object.keys(d.items).length > 0) {
          setHasDraftNotice(true);
        }
      }
    } catch {}
  }, [editingId]);

  useEffect(() => {
    if (editingId) return;
    const timer = setTimeout(() => {
      try {
        if (Object.keys(items).length > 0) {
          const payload = {
            inspectionDate,
            shift,
            items,
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
          setLastSavedDraftTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [inspectionDate, shift, items, editingId]);

  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.inspectionDate) setInspectionDate(d.inspectionDate);
        if (d.shift) setShift(d.shift);
        if (d.items) setItems((prev) => ({ ...prev, ...d.items }));
        setMessage('กู้คืนข้อมูลร่างการตรวจวิทยุเรียบร้อยแล้ว');
      }
    } catch {}
    setHasDraftNotice(false);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setHasDraftNotice(false);
  };

  const handleCheckAllOk = () => {
    setItems((prev) => {
      const next = { ...prev };
      for (const eq of equipments) {
        next[eq.id] = { ...(next[eq.id] ?? defaultItemState()), present: true, working: true };
      }
      return next;
    });
  };

  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (selectedReport || lightbox) {
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (lightbox) setLightbox(null);
          else setSelectedReport(null);
        }
      };
      document.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [selectedReport, lightbox]);

  const fetchEquipments = async () => {
    setEquipLoading(true);
    try {
      const res = await apiFetch<any>('/api/radio/equipments?limit=500');
      const list = res?.data ?? res;
      if (Array.isArray(list)) {
        setEquipments(list);
        setItems((prev) => {
          const next = { ...prev };
          for (const eq of list) if (!next[eq.id]) next[eq.id] = defaultItemState();
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load radio equipments:', err);
    } finally {
      setEquipLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch<any>('/api/radio/inspections?limit=20');
      const list = res?.data ?? res;
      if (Array.isArray(list)) setHistory(list);
    } catch (err) {
      console.error('Failed to load radio inspections:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setInspectionDate(new Date().toISOString().split('T')[0]);
    fetchEquipments();
    fetchHistory();
    apiFetch<any>('/api/auth/me')
      .then(async (data) => {
        const d = data?.data ?? data;
        const u = d?.user ?? d;
        const empId = u?.department || u?.employeeId || u?.username || '';
        if (empId) {
          try {
            const officersRes = await apiFetch<any>(`/api/officers`);
            const officers = officersRes?.data ?? officersRes;
            const officer = Array.isArray(officers) ? officers.find((o: any) => o.employeeId === empId) : null;
            if (officer) {
              setInspectorName([officer.firstName, officer.lastName, `(${officer.employeeId})`].filter(Boolean).join(' '));
              return;
            }
          } catch {}
        }
        const name = u?.fullName || u?.username || '';
        if (name) setInspectorName(name);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brands = Array.from(new Set(equipments.map((e) => e.brand).filter(Boolean) as string[]));

  const filtered = equipments.filter((e) => {
    if (brandFilter !== 'all' && e.brand !== brandFilter) return false;
    if (!equipSearch.trim()) return true;
    const q = equipSearch.trim().toLowerCase();
    return (
      e.assetNumber.toLowerCase().includes(q) ||
      e.assetName.toLowerCase().includes(q) ||
      (e.serialNumber || '').toLowerCase().includes(q)
    );
  });

  const presentCount = equipments.filter((e) => items[e.id]?.present ?? true).length;
  const workingCount = equipments.filter((e) => isOk(items[e.id] ?? defaultItemState())).length;
  const failCount = equipments.length - workingCount;

  const setItem = (id: number, patch: Partial<ItemState>) =>
    setItems((prev) => ({ ...prev, [id]: { ...(prev[id] ?? defaultItemState()), ...patch } }));

  const handlePhoto = async (id: number, file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setItem(id, { photo: dataUrl });
    } catch {
      setMessage('อ่านไฟล์รูปไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!inspectorName.trim()) {
      setMessage('กรุณากรอกข้อมูลผู้ตรวจ');
      return;
    }
    if (equipments.length === 0) {
      setMessage('ยังไม่มีทะเบียนเครื่องวิทยุในระบบ');
      return;
    }
    const payload = equipments.map((eq) => {
      const s = items[eq.id] ?? defaultItemState();
      return {
        equipmentId: eq.id,
        isPresent: s.present,
        isWorking: s.present ? s.working : false,
        remark: s.remark || undefined,
        photoUrl: s.photo || undefined,
      };
    });
    const bad = payload.filter((p) => !p.isPresent || !p.isWorking);
    const summary = bad.length === 0
      ? `อยู่ครบ ${equipments.length} เครื่อง พร้อมใช้งานทั้งหมด`
      : bad
          .map((p) => {
            const eq = equipments.find((x) => x.id === p.equipmentId);
            const tag = !p.isPresent ? 'ไม่อยู่' : 'ชำรุด';
            return `${eq?.assetNumber} (${tag})${p.remark ? `: ${p.remark}` : ''}`;
          })
          .join('; ');
    setLoading(true);
    try {
      await apiFetch(editingId ? `/api/radio/inspections/${editingId}` : '/api/radio/inspections', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          inspectionDate,
          shift,
          inspectorName,
          summary: `[วิทยุสื่อสาร] ${shift} — ${summary}`,
          items: payload,
        }),
      });
      setMessage(editingId ? 'แก้ไขรายงานเรียบร้อยแล้ว' : 'ส่งรายงานตรวจวิทยุเรียบร้อยแล้ว');
      if (!editingId) {
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
      }
      setEditingId(null);
      setItems({});
      fetchEquipments();
      fetchHistory();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (report: any) => {
    setSelectedReport(null);
    setEditingId(report.id);
    setMessage('');
    setInspectionDate(report.inspectionDate ? new Date(report.inspectionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const m = /\[(.*?)\]\s*(กะเช้า|กะดึก)/.exec(report.summary || '');
    if (m?.[2]) setShift(m[2].includes('ดึก') ? 'กะดึก (19.00 - 07.00)' : 'กะเช้า (07.00 - 19.00)');
    setInspectorName(report.inspectorName || '');
    const next: Record<number, ItemState> = {};
    for (const it of report.items || []) {
      next[it.equipmentId] = {
        present: !!it.isPresent,
        working: !!it.isWorking,
        remark: it.remark || '',
        photo: it.photoUrl || null,
      };
    }
    setItems(next);
    setEquipments((prev) => {
      const withMissing = [...prev];
      for (const it of report.items || []) {
        if (it.equipment && !withMissing.some((e) => e.id === it.equipmentId)) withMissing.push(it.equipment);
      }
      return withMissing.sort((a, b) => a.assetNumber.localeCompare(b.assetNumber));
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบรายงานตรวจวิทยุรอบนี้?')) return;
    try {
      await apiFetch(`/api/radio/inspections/${id}`, { method: 'DELETE' });
      setMessage('ลบรายงานเรียบร้อยแล้ว');
      if (selectedReport?.id === id) setSelectedReport(null);
      fetchHistory();
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleExportCSV = (report: any) => {
    const rows = (report.items || []).map((it: any) => [
      it.equipment?.assetNumber || '',
      it.equipment?.assetName || '',
      it.equipment?.brand || '',
      it.equipment?.model || '',
      it.equipment?.serialNumber || '',
      it.isPresent ? 'อยู่' : 'ไม่อยู่',
      it.isWorking ? 'พร้อมใช้' : 'ชำรุด',
      (it.remark || '').replace(/\n/g, ' '),
    ]);
    const headers = ['Asset number', 'ชื่อ', 'ยี่ห้อ', 'รุ่น', 'Serial', 'ยังอยู่', 'พร้อมใช้', 'หมายเหตุ'];
    const csv = '\uFEFF' + [headers, ...rows].map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `radio_inspection_${report.inspectionDate ? new Date(report.inspectionDate).toISOString().slice(0, 10) : 'round'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shiftOptions = [
    { value: 'กะเช้า (07.00 - 19.00)', label: 'กะเช้า (07.00 - 19.00)' },
    { value: 'กะดึก (19.00 - 07.00)', label: 'กะดึก (19.00 - 07.00)' },
  ];

  const brandOptions = [{ value: 'all', label: 'ทุกยี่ห้อ' }, ...brands.map((b) => ({ value: b, label: b }))];

  // เพิ่มเครื่องวิทยุใหม่เข้าทะเบียน (ระบบใหม่)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState({ assetNumber: '', assetName: '', brand: '', model: '', serialNumber: '' });
  const [adding, setAdding] = useState(false);

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.assetNumber.trim() || !newAsset.assetName.trim()) {
      setMessage('กรุณาระบุ Asset number และชื่ออุปกรณ์');
      return;
    }
    setAdding(true);
    try {
      await apiFetch('/api/radio/equipments', {
        method: 'POST',
        body: JSON.stringify({
          assetNumber: newAsset.assetNumber.trim(),
          assetName: newAsset.assetName.trim(),
          brand: newAsset.brand.trim() || undefined,
          model: newAsset.model.trim() || undefined,
          serialNumber: newAsset.serialNumber.trim() || undefined,
        }),
      });
      setMessage('เพิ่มเครื่องวิทยุเรียบร้อยแล้ว');
      setNewAsset({ assetNumber: '', assetName: '', brand: '', model: '', serialNumber: '' });
      setShowAddForm(false);
      fetchEquipments();
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans pb-28 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="ตรวจวิทยุสื่อสาร"
          subtitle="Radio Inspection — ตรวจทั้งล็อตในรอบเดียว"
          icon={<Radio className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {hasDraftNotice && !editingId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium">พบข้อมูลร่างการตรวจวิทยุที่บันทึกค้างไว้ในเครื่องนี้</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                กู้คืนข้อมูลร่าง
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                ละทิ้ง
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">วันที่ตรวจเช็ค <span className="text-rose-500">*</span></label>
              <input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
            </div>
            <AnimatedDropdown options={shiftOptions} value={shift} onChange={setShift} label="กะการทำงาน *" />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อ-รหัส ผู้ตรวจ <span className="text-rose-500">*</span></label>
              <input type="text" value={inspectorName} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 text-sm cursor-not-allowed" />
            </div>
          </div>

          {/* Summary + filter */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base md:text-lg font-bold text-slate-800 mr-auto">รายการวิทยุ ({filtered.length}/{equipments.length} เครื่อง)</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">อยู่ {presentCount}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">พร้อมใช้ {workingCount}</span>
              {failCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700">ผิดปกติ {failCount}</span>}
              <button
                type="button"
                onClick={handleCheckAllOk}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                ตั้งค่าตรวจปกติทั้งล็อต (Check All OK)
              </button>
              <button type="button" onClick={() => setShowAddForm((v) => !v)} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors">
                {showAddForm ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>ปิด</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มเครื่องใหม่</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50 border border-slate-200/50 rounded-2xl p-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ค้นหา Asset / ชื่อ / Serial</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={equipSearch}
                    onChange={(e) => setEquipSearch(e.target.value)}
                    placeholder="พิมพ์หรือกดไมค์เพื่อค้นหา..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[44px]"
                  />
                  <MicButton
                    onResult={setEquipSearch}
                    currentValue={equipSearch}
                    mode="replace"
                    className="top-1/2 -translate-y-1/2 right-2.5"
                  />
                </div>
              </div>
              <AnimatedDropdown options={brandOptions} value={brandFilter} onChange={setBrandFilter} label="กรองตามยี่ห้อ" />
            </div>

            {showAddForm && (
              <div className="bg-blue-50/50 border border-blue-200/60 rounded-2xl p-3 md:p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">เพิ่มเครื่องวิทยุใหม่เข้าทะเบียน (ครุภัณฑ์ใหม่นอกเหนือจาก legacy)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Asset number <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newAsset.assetNumber}
                        onChange={(e) => setNewAsset({ ...newAsset, assetNumber: e.target.value })}
                        placeholder="เช่น 310000099999"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <MicButton
                        onResult={(val) => setNewAsset((prev) => ({ ...prev, assetNumber: val }))}
                        currentValue={newAsset.assetNumber}
                        mode="replace"
                        className="top-1/2 -translate-y-1/2 right-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่ออุปกรณ์ <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newAsset.assetName}
                        onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                        placeholder="เช่น Walky Talky Icom 50FX"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <MicButton
                        onResult={(val) => setNewAsset((prev) => ({ ...prev, assetName: val }))}
                        currentValue={newAsset.assetName}
                        mode="replace"
                        className="top-1/2 -translate-y-1/2 right-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">ยี่ห้อ</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newAsset.brand}
                        onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                        placeholder="เช่น Icom"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <MicButton
                        onResult={(val) => setNewAsset((prev) => ({ ...prev, brand: val }))}
                        currentValue={newAsset.brand}
                        mode="replace"
                        className="top-1/2 -translate-y-1/2 right-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">รุ่น</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newAsset.model}
                        onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                        placeholder="เช่น IC-50FX"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <MicButton
                        onResult={(val) => setNewAsset((prev) => ({ ...prev, model: val }))}
                        currentValue={newAsset.model}
                        mode="replace"
                        className="top-1/2 -translate-y-1/2 right-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Serial number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newAsset.serialNumber}
                        onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                        placeholder="เช่น 01001960-9"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <MicButton
                        onResult={(val) => setNewAsset((prev) => ({ ...prev, serialNumber: val }))}
                        currentValue={newAsset.serialNumber}
                        mode="replace"
                        className="top-1/2 -translate-y-1/2 right-2"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={handleAddEquipment} disabled={adding} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-sm shadow transition-transform active:scale-95 min-h-[40px] flex items-center justify-center gap-1.5">
                      {adding ? 'กำลังเพิ่ม...' : <><Plus className="w-4 h-4" /> <span>เพิ่มเข้าทะเบียน</span></>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {equipLoading ? (
              <div className="text-center py-8 text-slate-400">กำลังโหลดทะเบียนวิทยุ...</div>
            ) : equipments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">ยังไม่มีทะเบียนเครื่องวิทยุ — รัน migration หรือ import ด้วย scripts/import-radio-master.py</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((eq) => {
                  const s = items[eq.id] ?? defaultItemState();
                  const ok = isOk(s);
                  return (
                    <div
                      key={eq.id}
                      className={`relative rounded-xl border-2 transition-all overflow-hidden ${!s.present ? 'border-slate-300 bg-slate-50' : ok ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/50'}`}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-0.5 ${!s.present ? 'bg-slate-400' : ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div className="p-3 space-y-2">
                        <div className="flex gap-2.5">
                          <div
                            className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0 border border-slate-200"
                            title="คลิกเพื่อดูรูปตัวอย่างขนาดใหญ่"
                            onClick={() => eq.referenceImageUrl && setLightbox({ src: eq.referenceImageUrl, title: `${eq.assetNumber} — ${eq.assetName}` })}
                          >
                            {eq.referenceImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={eq.referenceImageUrl} alt={eq.assetName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                            ) : (
                              <Radio className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono font-bold text-sm text-slate-800 truncate">{eq.assetNumber}</p>
                            <p className="text-xs text-slate-600 truncate">{eq.assetName}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {[eq.brand, eq.model].filter(Boolean).join(' ')}
                              {eq.serialNumber ? ` • S/N ${eq.serialNumber}` : ''}
                            </p>
                            {eq.referenceImageUrl && (
                              <button type="button" onClick={() => setLightbox({ src: eq.referenceImageUrl!, title: `${eq.assetNumber} — ${eq.assetName}` })} className="text-[11px] text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span>ดูรูปตัวอย่าง</span>
                              </button>
                            )}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold h-fit inline-flex items-center gap-1 ${!s.present ? 'bg-slate-200 text-slate-600' : ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {!s.present ? (
                              'ไม่อยู่'
                            ) : ok ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>ปกติ</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                <span>ผิดปกติ</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[11px] font-medium text-slate-500 mb-1">ยังอยู่ไหม *</p>
                            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-bold">
                              <button type="button" onClick={() => setItem(eq.id, { present: true })} className={`flex-1 py-1.5 ${s.present ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'}`}>อยู่</button>
                              <button type="button" onClick={() => setItem(eq.id, { present: false })} className={`flex-1 py-1.5 ${!s.present ? 'bg-slate-500 text-white' : 'bg-white text-slate-500'}`}>ไม่อยู่</button>
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-slate-500 mb-1">พร้อมทำงาน *</p>
                            <div className={`flex rounded-lg overflow-hidden border border-slate-200 text-xs font-bold ${!s.present ? 'opacity-40 pointer-events-none' : ''}`}>
                              <button type="button" onClick={() => setItem(eq.id, { working: true })} className={`flex-1 py-1.5 ${s.working ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'}`}>พร้อม</button>
                              <button type="button" onClick={() => setItem(eq.id, { working: false })} className={`flex-1 py-1.5 ${!s.working ? 'bg-rose-500 text-white' : 'bg-white text-slate-500'}`}>ชำรุด</button>
                            </div>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={s.remark}
                            onChange={(e) => setItem(eq.id, { remark: e.target.value })}
                            placeholder="หมายเหตุ (พิมพ์หรือกดไมค์เพื่อพูด)"
                            className="w-full px-3 py-1.5 pr-10 rounded-lg border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <MicButton onResult={(t) => setItem(eq.id, { remark: s.remark ? `${s.remark} ${t}` : t })} />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            ref={(el) => { fileRefs.current[eq.id] = el; }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => { handlePhoto(eq.id, e.target.files?.[0]); e.target.value = ''; }}
                          />
                          <button type="button" onClick={() => fileRefs.current[eq.id]?.click()} className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                            <ImagePlus className="w-3.5 h-3.5" /> ถ่ายรูปหน้างาน
                          </button>
                          {s.photo ? (
                            <div className="flex items-center gap-1.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.photo} alt="หน้างาน" className="w-8 h-8 rounded-lg object-cover border border-slate-200 cursor-pointer" onClick={() => setLightbox({ src: s.photo!, title: `${eq.assetNumber} — รูปถ่ายหน้างาน` })} />
                              <button type="button" onClick={() => setItem(eq.id, { photo: null })} className="text-[11px] text-rose-500 hover:underline">ลบรูป</button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">ยังไม่มีรูปหน้างาน</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 hidden md:flex justify-center gap-2.5 sm:gap-3">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setItems({}); setMessage(''); }} className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 px-8 rounded-xl sm:rounded-full shadow transition-transform active:scale-95 min-h-[44px]">
                ยกเลิก
              </button>
            )}
            <button type="submit" disabled={loading || equipments.length === 0} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-10 rounded-xl sm:rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2">
              {loading ? (
                'กำลังบันทึก...'
              ) : editingId ? (
                <>
                  <Save className="w-5 h-5" />
                  <span>บันทึกการแก้ไข</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>ส่งรายงานตรวจวิทยุทั้งล็อต</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Mobile Sticky Bottom Action Dock */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 truncate">
            {lastSavedDraftTime ? `ร่างล่าสุด ${lastSavedDraftTime} น.` : 'พร้อมบันทึก'}
          </div>
          <button
            type="button"
            onClick={(e) => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={loading || equipments.length === 0}
            className="px-5 py-2.5 bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {editingId ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'บันทึก...' : editingId ? 'บันทึกแก้ไข' : 'ส่งรายงาน'}</span>
          </button>
        </div>

        {/* History */}
        <CollapsibleHistory
          title="ประวัติตรวจวิทยุ (รายรอบ)"
          count={history.length}
          defaultOpen={false}
          headerActions={
            <button
              type="button"
              onClick={fetchHistory}
              disabled={historyLoading}
              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
            </button>
          }
        >
          {historyLoading && history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">ไม่มีประวัติการตรวจวิทยุ</div>
          ) : (
            <div className="overflow-x-auto mobile-table-scroll">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">วันที่</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">ผู้ตรวจ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">สถานะ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">อยู่/พร้อมใช้</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">สรุป</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedReport(item)}>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {formatSafeDate(item.inspectionDate)}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">{item.inspectorName || '-'}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${item.totalFailed === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {item.totalFailed === 0 ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>ปกติทั้งล็อต</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              <span>ผิดปกติ {item.totalFailed}</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">อยู่ {item.totalPresent}/{item.totalChecked} • พร้อม {item.totalWorking}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate text-xs">{item.summary || '-'}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button type="button" title="ดูรายละเอียด" onClick={() => setSelectedReport(item)} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button type="button" title="แก้ไข" onClick={() => handleEdit(item)} className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" title="ลบ" onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleHistory>

        {/* Detail modal (portal ไป body + inline fixed กันเหนียว + overlay scroll เองได้) */}
        {selectedReport && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setSelectedReport(null)}>
            <div className="m-auto bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">
                    รายละเอียดรอบตรวจ — {formatSafeDate(selectedReport.inspectionDate)}
                  </h3>
                  <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                  <div><p className="text-xs text-slate-500">ผู้ตรวจ</p><p className="font-medium text-slate-800">{selectedReport.inspectorName || '-'}</p></div>
                  <div><p className="text-xs text-slate-500">กะ</p><p className="font-medium text-slate-800">{selectedReport.shift || '-'}</p></div>
                  <div><p className="text-xs text-slate-500">อยู่ / ทั้งหมด</p><p className="font-medium text-slate-800">{selectedReport.totalPresent}/{selectedReport.totalChecked}</p></div>
                  <div><p className="text-xs text-slate-500">พร้อมใช้</p><p className="font-medium text-slate-800">{selectedReport.totalWorking}</p></div>
                </div>
                {selectedReport.summary && (
                  <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-100 mb-4 whitespace-pre-wrap">{selectedReport.summary}</div>
                )}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {(selectedReport.items || []).map((it: any) => (
                    <div key={it.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${!it.isPresent ? 'border-slate-200 bg-slate-50' : it.isWorking ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/50'}`}>
                      {it.equipment?.referenceImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.equipment.referenceImageUrl} alt={it.equipment?.assetName} className="w-12 h-12 rounded-lg object-cover border border-slate-200 cursor-pointer flex-shrink-0" loading="lazy"
                          onClick={() => setLightbox({ src: it.equipment.referenceImageUrl, title: `${it.equipment?.assetNumber} — ${it.equipment?.assetName} (รูปตัวอย่าง)` })} />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Camera className="w-5 h-5 text-slate-300" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-bold text-slate-800">{it.equipment?.assetNumber} <span className="font-sans font-medium text-slate-600">• {it.equipment?.assetName}</span></p>
                        <p className="text-[11px] text-slate-500">{[it.equipment?.brand, it.equipment?.model, it.equipment?.serialNumber ? `S/N ${it.equipment.serialNumber}` : ''].filter(Boolean).join(' • ')}{it.remark ? ` — ${it.remark}` : ''}</p>
                      </div>
                      {it.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.photoUrl} alt="หน้างาน" className="w-12 h-12 rounded-lg object-cover border border-blue-200 cursor-pointer flex-shrink-0" loading="lazy" title="รูปถ่ายหน้างาน — คลิกเพื่อขยาย"
                          onClick={() => setLightbox({ src: it.photoUrl, title: `${it.equipment?.assetNumber} — รูปถ่ายหน้างาน` })} />
                      )}
                      <span className={`text-[11px] px-2 py-1 rounded-full font-bold whitespace-nowrap inline-flex items-center gap-1 ${!it.isPresent ? 'bg-slate-200 text-slate-600' : it.isWorking ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {!it.isPresent ? (
                          'ไม่อยู่'
                        ) : it.isWorking ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>พร้อมใช้</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            <span>ชำรุด</span>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => handleExportCSV(selectedReport)} className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-1.5">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button type="button" onClick={() => handleEdit(selectedReport)} className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium">
                    แก้ไขรอบนี้
                  </button>
                  <button type="button" onClick={() => setSelectedReport(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium">
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Lightbox: รูปตัวอย่าง / รูปหน้างาน ขนาดใหญ่ (portal + inline fixed + overlay scroll เองได้) */}
        {lightbox && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[60] flex overflow-y-auto bg-black/70 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setLightbox(null)}>
            <div className="m-auto bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b border-slate-100">
                <h3 className="text-sm md:text-base font-bold text-slate-800 truncate">{lightbox.title}</h3>
                <button onClick={() => setLightbox(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-slate-900 flex items-center justify-center max-h-[70vh] overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lightbox.src} alt={lightbox.title} className="w-full h-auto max-h-[70vh] object-contain" />
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    </div>
  );
}
