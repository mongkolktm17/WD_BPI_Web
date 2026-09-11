'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import Pagination from '@/components/Pagination';
import { UserCheck, Sun, Moon, CheckCircle2, History, Clock, Pencil, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface GuardCount {
  id: number;
  recordDate: string;
  shift: string;
  totalGuards: number;
  presentGuards: number;
  absentGuards: number;
  remark: string | null;
  createdAt?: string;
}

function formatReportTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'ยังไม่มีข้อมูล';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);

  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  if (diffMinutes < 1) return `เมื่อสักครู่ (${timeStr})`;
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว (${timeStr})`;

  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `วันนี้ ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `เมื่อวาน ${timeStr}`;

  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${timeStr}`;
}

export default function GuardDutyLogPage() {
  // Mode selection: 'morning' | 'evening' | 'both'
  const [selectedShift, setSelectedShift] = useState<'morning' | 'evening' | 'both'>('morning');

  // Input states
  const [morningShift, setMorningShift] = useState<number | ''>(60);
  const [morningContract, setMorningContract] = useState<number | ''>(60);
  const [eveningShift, setEveningShift] = useState<number | ''>(47);
  const [eveningContract, setEveningContract] = useState<number | ''>(47);

  // Latest records data for initial / fallback display
  const [latestMorning, setLatestMorning] = useState<GuardCount | null>(null);
  const [latestEvening, setLatestEvening] = useState<GuardCount | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [history, setHistory] = useState<GuardCount[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 20;

  // Edit mode: when set, submit uses PUT /api/guards/counts/:id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editRemark, setEditRemark] = useState('');

  // Auto-detect shift based on current time (07:00-18:59 = morning, 19:00-06:59 = evening)
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 19) {
      setSelectedShift('morning');
    } else {
      setSelectedShift('evening');
    }
  }, []);

  const fetchStatusAndHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.allSettled([
        apiFetch<any>('/api/guards/status'),
        apiFetch<any>('/api/guards/counts?limit=100'),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value) {
        const sData = statusRes.value?.data ?? statusRes.value;
        const m = sData.morning_shift;
        const e = sData.evening_shift;

        if (m) {
          setLatestMorning(m);
          setMorningShift(m.presentGuards ?? 60);
          setMorningContract(m.totalGuards ?? 60);
        }
        if (e) {
          setLatestEvening(e);
          setEveningShift(e.presentGuards ?? 47);
          setEveningContract(e.totalGuards ?? 47);
        }
      }

      if (historyRes.status === 'fulfilled' && historyRes.value) {
        setHistory(historyRes.value.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatusAndHistory();
  }, [fetchStatusAndHistory]);

  const handleEdit = (rec: GuardCount) => {
    setEditingId(rec.id);
    const shiftVal = rec.shift === 'evening' || rec.shift === 'ดึก' ? 'evening' : 'morning';
    setSelectedShift(shiftVal as 'morning' | 'evening');
    if (shiftVal === 'morning') {
      setMorningShift(rec.presentGuards);
      setMorningContract(rec.totalGuards);
    } else {
      setEveningShift(rec.presentGuards);
      setEveningContract(rec.totalGuards);
    }
    setEditDate((rec.recordDate || '').split('T')[0] || new Date().toISOString().split('T')[0]);
    setEditRemark(rec.remark || '');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDate('');
    setEditRemark('');
    setMessage('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return;
    try {
      await apiFetch(`/api/guards/counts/${id}`, { method: 'DELETE' });
      setMessage('✅ ลบรายการเรียบร้อยแล้ว');
      await fetchStatusAndHistory();
    } catch {
      setMessage('❌ ลบรายการไม่สำเร็จ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Edit mode: update single record via PUT
      if (editingId !== null) {
        const shiftKey = selectedShift === 'evening' ? 'evening' : 'morning';
        const present = shiftKey === 'morning'
          ? (morningShift === '' ? 0 : Number(morningShift))
          : (eveningShift === '' ? 0 : Number(eveningShift));
        const total = shiftKey === 'morning'
          ? (morningContract === '' ? 0 : Number(morningContract))
          : (eveningContract === '' ? 0 : Number(eveningContract));
        await apiFetch(`/api/guards/counts/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            recordDate: editDate || new Date().toISOString().split('T')[0],
            shift: shiftKey,
            presentGuards: present,
            totalGuards: total,
            absentGuards: Math.max(0, total - present),
            remark: editRemark || undefined,
          }),
        });
        setMessage('✅ แก้ไขข้อมูลเรียบร้อยแล้ว');
        handleCancelEdit();
        await fetchStatusAndHistory();
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const promises: Promise<any>[] = [];

      // If morning shift is selected
      if (selectedShift === 'morning' || selectedShift === 'both') {
        const mActual = morningShift === '' ? (latestMorning?.presentGuards ?? 60) : Number(morningShift);
        const mContract = morningContract === '' ? (latestMorning?.totalGuards ?? 60) : Number(morningContract);
        promises.push(
          apiFetch('/api/guards/counts', {
            method: 'POST',
            body: JSON.stringify({
              recordDate: today,
              shift: 'morning',
              presentGuards: mActual,
              totalGuards: mContract,
              absentGuards: Math.max(0, mContract - mActual),
              remark: `กะเช้า: มาจริง ${mActual}/${mContract} นาย`,
            }),
          })
        );
      }

      // If evening shift is selected
      if (selectedShift === 'evening' || selectedShift === 'both') {
        const eActual = eveningShift === '' ? (latestEvening?.presentGuards ?? 47) : Number(eveningShift);
        const eContract = eveningContract === '' ? (latestEvening?.totalGuards ?? 47) : Number(eveningContract);
        promises.push(
          apiFetch('/api/guards/counts', {
            method: 'POST',
            body: JSON.stringify({
              recordDate: today,
              shift: 'evening',
              presentGuards: eActual,
              totalGuards: eContract,
              absentGuards: Math.max(0, eContract - eActual),
              remark: `กะดึก: มาจริง ${eActual}/${eContract} นาย`,
            }),
          })
        );
      }

      await Promise.all(promises);
      setMessage('✅ บันทึกข้อมูลจำนวน รปภ. เรียบร้อยแล้ว');
      await fetchStatusAndHistory();
    } catch (err) {
      setMessage('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="บันทึกเวร รปภ."
          subtitle="Guard Duty Log"
          icon={<UserCheck className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-bold shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-5">
          {editingId !== null && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-amber-800">✏️ กำลังแก้ไขรายการ #{editingId} — บันทึกจะใช้ PUT /api/guards/counts/{editingId}</span>
              <button type="button" onClick={handleCancelEdit} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-1.5">
                <X className="w-3.5 h-3.5" />ยกเลิก
              </button>
            </div>
          )}

          {editingId !== null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่บันทึก (recordDate)</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-sm text-slate-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ (remark)</label>
                <input type="text" value={editRemark} onChange={(e) => setEditRemark(e.target.value)} placeholder="หมายเหตุ"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-sm text-slate-800" />
              </div>
            </div>
          )}
          
          {/* Shift Selection Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              🕒 เลือกกะที่ต้องการบันทึกข้อมูล (Shift to Record)
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSelectedShift('morning')}
                className={`py-3 px-2 sm:px-4 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm ${
                  selectedShift === 'morning'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-amber-600 shadow-amber-500/20 ring-2 ring-amber-400'
                    : 'bg-slate-50 hover:bg-yellow-50/50 text-slate-700 border-slate-200'
                }`}
              >
                <Sun className={`w-4 h-4 ${selectedShift === 'morning' ? 'text-white' : 'text-amber-500'}`} />
                <span>เฉพาะกะเช้า</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('evening')}
                className={`py-3 px-2 sm:px-4 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm ${
                  selectedShift === 'evening'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-700 shadow-indigo-500/20 ring-2 ring-indigo-400'
                    : 'bg-slate-50 hover:bg-indigo-50/50 text-slate-700 border-slate-200'
                }`}
              >
                <Moon className={`w-4 h-4 ${selectedShift === 'evening' ? 'text-white' : 'text-indigo-500'}`} />
                <span>เฉพาะกะดึก</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('both')}
                className={`py-3 px-2 sm:px-4 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm ${
                  selectedShift === 'both'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-700 shadow-blue-500/20 ring-2 ring-blue-400'
                    : 'bg-slate-50 hover:bg-blue-50/50 text-slate-700 border-slate-200'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${selectedShift === 'both' ? 'text-white' : 'text-blue-500'}`} />
                <span>ทั้งสองกะ</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              💡 กะที่ไม่ได้เลือก ระบบจะคงตัวเลขเดิมล่าสุดไว้รายงานต่ออัตโนมัติ โดยไม่ overwrite เวลาอัปเดตของกะนั้น
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Morning Shift Card */}
            <div className={`p-4 rounded-2xl border transition-all duration-300 space-y-3 ${
              selectedShift === 'morning' || selectedShift === 'both'
                ? 'bg-yellow-50/80 border-yellow-300 shadow-md ring-1 ring-yellow-300/60'
                : 'bg-slate-50/70 border-slate-200 opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-yellow-900 text-sm md:text-base">☀️ กะเช้า (07:00 - 19:00)</h4>
                </div>
                {selectedShift === 'evening' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                    คงค่าเดิมล่าสุด
                  </span>
                )}
              </div>

              {latestMorning && (
                <div className="text-[11px] text-amber-800/80 bg-amber-100/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>รายงานล่าสุด: <strong>{formatReportTime(latestMorning.createdAt || latestMorning.recordDate)}</strong> (จริง: {latestMorning.presentGuards} / สัญญา: {latestMorning.totalGuards})</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนที่ปฏิบัติงานจริง (Actual)
                </label>
                <input
                  type="number"
                  min="0"
                  value={morningShift}
                  onChange={(e) => setMorningShift(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={selectedShift === 'evening'}
                  placeholder={latestMorning ? String(latestMorning.presentGuards) : '60'}
                  className={`w-full px-4 py-2 rounded-xl border outline-none font-bold text-lg text-slate-800 ${
                    selectedShift === 'evening'
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-yellow-500'
                  }`}
                  required={selectedShift === 'morning' || selectedShift === 'both'}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนตามสัญญา (Contract)
                </label>
                <input
                  type="number"
                  min="0"
                  value={morningContract}
                  onChange={(e) => setMorningContract(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={selectedShift === 'evening'}
                  placeholder={latestMorning ? String(latestMorning.totalGuards) : '60'}
                  className={`w-full px-4 py-2 rounded-xl border outline-none font-bold text-lg text-slate-800 ${
                    selectedShift === 'evening'
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-yellow-500'
                  }`}
                  required={selectedShift === 'morning' || selectedShift === 'both'}
                />
              </div>
            </div>

            {/* Evening Shift Card */}
            <div className={`p-4 rounded-2xl border transition-all duration-300 space-y-3 ${
              selectedShift === 'evening' || selectedShift === 'both'
                ? 'bg-indigo-50/80 border-indigo-300 shadow-md ring-1 ring-indigo-300/60'
                : 'bg-slate-50/70 border-slate-200 opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-bold text-indigo-900 text-sm md:text-base">🌙 กะดึก (19:00 - 07:00)</h4>
                </div>
                {selectedShift === 'morning' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                    คงค่าเดิมล่าสุด
                  </span>
                )}
              </div>

              {latestEvening && (
                <div className="text-[11px] text-indigo-800/80 bg-indigo-100/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span>รายงานล่าสุด: <strong>{formatReportTime(latestEvening.createdAt || latestEvening.recordDate)}</strong> (จริง: {latestEvening.presentGuards} / สัญญา: {latestEvening.totalGuards})</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนที่ปฏิบัติงานจริง (Actual)
                </label>
                <input
                  type="number"
                  min="0"
                  value={eveningShift}
                  onChange={(e) => setEveningShift(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={selectedShift === 'morning'}
                  placeholder={latestEvening ? String(latestEvening.presentGuards) : '47'}
                  className={`w-full px-4 py-2 rounded-xl border outline-none font-bold text-lg text-slate-800 ${
                    selectedShift === 'morning'
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                  required={selectedShift === 'evening' || selectedShift === 'both'}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนตามสัญญา (Contract)
                </label>
                <input
                  type="number"
                  min="0"
                  value={eveningContract}
                  onChange={(e) => setEveningContract(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={selectedShift === 'morning'}
                  placeholder={latestEvening ? String(latestEvening.totalGuards) : '47'}
                  className={`w-full px-4 py-2 rounded-xl border outline-none font-bold text-lg text-slate-800 ${
                    selectedShift === 'morning'
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                  required={selectedShift === 'evening' || selectedShift === 'both'}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 md:px-12 rounded-xl sm:rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base flex items-center justify-center gap-2 min-h-[44px]"
            >
              {loading ? 'กำลังบันทึก...' : editingId !== null ? '💾 บันทึกการแก้ไข (PUT)' : `💾 บันทึกจำนวน รปภ. (${selectedShift === 'morning' ? 'กะเช้า' : selectedShift === 'evening' ? 'กะดึก' : 'ทั้งสองกะ'})`}
            </button>
            {editingId !== null && (
              <button type="button" onClick={handleCancelEdit}
                className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 px-8 rounded-xl sm:rounded-full shadow transition-colors text-sm md:text-base inline-flex items-center justify-center gap-2 min-h-[44px]">
                <X className="w-4 h-4" />ยกเลิกการแก้ไข
              </button>
            )}
          </div>
        </form>

        {/* History Table */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              <h3 className="text-base md:text-lg font-bold text-slate-800">ประวัติการบันทึกย้อนหลัง</h3>
            </div>
            <span className="text-xs text-slate-400">ทั้งหมด {history.length} รายการ</span>
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-slate-400">กำลังโหลด...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">ยังไม่มีข้อมูล</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-700">
                  <thead className="text-xs uppercase bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">วันที่ / เวลาที่บันทึก</th>
                      <th className="px-4 py-3">กะ</th>
                      <th className="px-4 py-3">ปฏิบัติงานจริง</th>
                      <th className="px-4 py-3">ตามสัญญา</th>
                      <th className="px-4 py-3">ขาด</th>
                      <th className="px-4 py-3">หมายเหตุ</th>
                      <th className="px-4 py-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE).map((rec) => (
                      <tr key={rec.id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div>{rec.recordDate?.split('T')[0] || rec.recordDate}</div>
                          {rec.createdAt && (
                            <div className="text-[10px] text-slate-400">{formatReportTime(rec.createdAt)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                            rec.shift === 'morning' || rec.shift === 'เช้า'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {rec.shift === 'morning' || rec.shift === 'เช้า' ? '☀️ เช้า' : '🌙 ดึก'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span className="text-emerald-600 font-bold text-base">{rec.presentGuards}</span></td>
                        <td className="px-4 py-3"><span className="text-blue-600 font-bold">{rec.totalGuards}</span></td>
                        <td className="px-4 py-3"><span className={`font-bold ${rec.absentGuards > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{rec.absentGuards}</span></td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{rec.remark || '-'}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button type="button" onClick={() => handleEdit(rec)} title="แก้ไข" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(rec.id)} title="ลบ" className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={historyPage} totalItems={history.length} pageSize={HISTORY_PAGE_SIZE} onPageChange={setHistoryPage} />
            </>
          )}
        </div>

      </div>
    </div>
  );
}
