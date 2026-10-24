'use client';

import React, { useState, useEffect } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import MicButton from '@/components/MicButton';
import CollapsibleHistory from '@/components/CollapsibleHistory';
import { apiFetch } from '@/lib/api';
import { Calendar, Clock, MapPin, User, RefreshCw, Camera, Trash2, X, Eye, Check, Save, RotateCcw, Sparkles, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const DRAFT_KEY = 'wd_pwa_draft_cctv_inspection';

interface CctvInspectionItem {
  id: number;
  inspectionDate: string;
  inspectorName: string;
  totalChecked: number;
  totalPassed: number;
  totalFailed: number;
  summary: string;
  createdAt?: string;
}

export default function CctvInspectionPage() {
  const [inspectionDate, setInspectionDate] = useState('');
  const [shift, setShift] = useState('กะเช้า (07.00 - 19.00)');
  const [cctvRoom, setCctvRoom] = useState('ห้องปฏิบัติการ CCTV B2');
  const [inspectorName, setInspectorName] = useState('');

  const [radioStatus, setRadioStatus] = useState('ปกติ');
  const [reportBooksStatus, setReportBooksStatus] = useState('ปกติ');
  const [nvrScreenStatus, setNvrScreenStatus] = useState('ปกติ');
  const [nvrMachineStatus, setNvrMachineStatus] = useState('ปกติ');
  const [keysStatus, setKeysStatus] = useState('ปกติ');
  const [accessControlStatus, setAccessControlStatus] = useState('ปกติ');
  const [incidentReportStatus, setIncidentReportStatus] = useState('ปกติ');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<CctvInspectionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CctvInspectionItem | null>(null);
  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.shift || d.cctvRoom || d.radioStatus) {
          setHasDraftNotice(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const payload = {
          inspectionDate,
          shift,
          cctvRoom,
          radioStatus,
          reportBooksStatus,
          nvrScreenStatus,
          nvrMachineStatus,
          keysStatus,
          accessControlStatus,
          incidentReportStatus,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setLastSavedDraftTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
      } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, [inspectionDate, shift, cctvRoom, radioStatus, reportBooksStatus, nvrScreenStatus, nvrMachineStatus, keysStatus, accessControlStatus, incidentReportStatus]);

  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.inspectionDate) setInspectionDate(d.inspectionDate);
        if (d.shift) setShift(d.shift);
        if (d.cctvRoom) setCctvRoom(d.cctvRoom);
        if (d.radioStatus) setRadioStatus(d.radioStatus);
        if (d.reportBooksStatus) setReportBooksStatus(d.reportBooksStatus);
        if (d.nvrScreenStatus) setNvrScreenStatus(d.nvrScreenStatus);
        if (d.nvrMachineStatus) setNvrMachineStatus(d.nvrMachineStatus);
        if (d.keysStatus) setKeysStatus(d.keysStatus);
        if (d.accessControlStatus) setAccessControlStatus(d.accessControlStatus);
        if (d.incidentReportStatus) setIncidentReportStatus(d.incidentReportStatus);
        setMessage('กู้คืนข้อมูลร่างล่าสุดเรียบร้อยแล้ว');
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

  const handleCheckAllNormal = () => {
    setRadioStatus('ปกติ');
    setReportBooksStatus('ปกติ');
    setNvrScreenStatus('ปกติ');
    setNvrMachineStatus('ปกติ');
    setKeysStatus('ปกติ');
    setAccessControlStatus('ปกติ');
    setIncidentReportStatus('ปกติ');
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch<any>('/api/cctv/inspections?limit=20');
      const list = res?.data ?? res;
      if (Array.isArray(list)) {
        setHistory(list);
      }
    } catch (err) {
      console.error('Failed to load cctv inspections:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบรายงานตรวจเช็คห้อง CCTV นี้?')) return;
    try {
      await apiFetch(`/api/cctv/inspections/${id}`, { method: 'DELETE' });
      setMessage('ลบรายงานเรียบร้อยแล้ว');
      if (selectedReport?.id === id) setSelectedReport(null);
      fetchHistory();
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  useEffect(() => {
    setInspectionDate(new Date().toISOString().split('T')[0]);
    fetchHistory();
    apiFetch<any>('/api/auth/me')
      .then(async (data) => {
        const d = data?.data ?? data;
        const empId = d.department || d.employeeId || '';
        if (empId) {
          try {
            const officersRes = await apiFetch<any>(`/api/officers`);
            const officers = officersRes?.data ?? officersRes;
            const officer = Array.isArray(officers) ? officers.find((o: any) => o.employeeId === empId) : null;
            if (officer) {
              const display = [officer.firstName, officer.lastName, `(${officer.employeeId})`].filter(Boolean).join(' ');
              setInspectorName(display);
              return;
            }
          } catch {}
        }
        const name = d.fullName || d.username || '';
        if (name) setInspectorName(name);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!inspectorName.trim()) {
      setMessage('กรุณากรอกข้อมูลผู้ตรวจ');
      return;
    }

    const statuses = [
      { label: 'วิทยุสื่อสาร', status: radioStatus },
      { label: 'สมุดบันทึก', status: reportBooksStatus },
      { label: 'จอมอนิเตอร์ NVR', status: nvrScreenStatus },
      { label: 'เครื่อง NVR', status: nvrMachineStatus },
      { label: 'กุญแจ', status: keysStatus },
      { label: 'Access Control', status: accessControlStatus },
      { label: 'Incident Report', status: incidentReportStatus },
    ];

    const totalChecked = statuses.length;
    const totalPassed = statuses.filter(s => s.status === 'ปกติ').length;
    const totalFailed = totalChecked - totalPassed;
    const summary = statuses
      .filter(s => s.status !== 'ปกติ')
      .map(s => `${s.label}: ${s.status}`)
      .join('; ') || 'ทุกรายการปกติ';

    setLoading(true);
    try {
      await apiFetch('/api/cctv/inspections', {
        method: 'POST',
        body: JSON.stringify({
          inspectionDate,
          inspectorName,
          totalChecked,
          totalPassed,
          totalFailed,
          summary: `[${cctvRoom}] ${shift} — ${summary}`,
        }),
      });
      setMessage('ส่งรายงานการตรวจเช็คเรียบร้อยแล้ว');
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      fetchHistory();
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const shiftOptions = [
    { value: 'กะเช้า (07.00 - 19.00)', label: 'กะเช้า (07.00 - 19.00)', icon: <Clock className="w-4 h-4 text-amber-500" /> },
    { value: 'กะดึก (19.00 - 07.00)', label: 'กะดึก (19.00 - 07.00)', icon: <Clock className="w-4 h-4 text-indigo-500" /> },
  ];

  const roomOptions = [
    { value: 'ห้องปฏิบัติการ CCTV B2', label: 'ห้องปฏิบัติการ CCTV B2', icon: <MapPin className="w-4 h-4 text-blue-500" /> },
    { value: 'ห้องปฏิบัติการ CCTV B3', label: 'ห้องปฏิบัติการ CCTV B3', icon: <MapPin className="w-4 h-4 text-emerald-500" /> },
    { value: 'ห้องปฏิบัติการ CCTV B4', label: 'ห้องปฏิบัติการ CCTV B4', icon: <MapPin className="w-4 h-4 text-amber-500" /> },
    { value: 'ห้องปฏิบัติการ CCTV B9', label: 'ห้องปฏิบัติการ CCTV B9', icon: <MapPin className="w-4 h-4 text-rose-500" /> },
  ];

  const radioOptions = [
    { value: 'ปกติ', label: 'ปกติ (Pass)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
    { value: 'ชำรุด', label: 'ชำรุด (Fail)', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
  ];

  const reportBooksOptions = [
    { value: 'ปกติ', label: 'ปกติ (Pass)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
    { value: 'ชำรุด/สูญหาย', label: 'ชำรุด/สูญหาย (Fail)', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
  ];

  const nvrScreenOptions = [
    { value: 'ปกติ', label: 'ปกติ (Pass)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
    { value: 'หน้าจอเสีย/ไม่แสดงผล', label: 'หน้าจอเสีย/ไม่แสดงผล (Fail)', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
  ];

  const nvrMachineOptions = [
    { value: 'ปกติ', label: 'ปกติ (Pass)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
    { value: 'เครื่องค้าง/พัดลมดัง', label: 'เครื่องค้าง/พัดลมดัง (Fail)', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
  ];

  const keysOptions = [
    { value: 'ปกติ', label: 'ปกติ (Pass)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
    { value: 'ไม่ครบถ้วน', label: 'ไม่ครบถ้วน (Fail)', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
  ];

  const accessControlOptions = [
    { value: 'ปกติ', label: 'ปกติ (Pass)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
    { value: 'ระบบไม่ทาบบัตร', label: 'ระบบไม่ทาบบัตร (Fail)', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
  ];

  const incidentOptions = [
    { value: 'ปกติ', label: 'ปกติ (ไม่มีเหตุการณ์)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
    { value: 'มีเหตุการณ์ผิดปกติ', label: 'มีเหตุการณ์ผิดปกติ (Fail)', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
  ];

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans pb-28 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="ตรวจสอบห้อง CCTV"
          subtitle="CCTV Inspection"
          icon={<Camera className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {hasDraftNotice && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium">พบข้อมูลร่างการตรวจเช็คที่บันทึกค้างไว้ในเครื่องนี้</span>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">วันที่ตรวจเช็ค <span className="text-rose-500">*</span></label>
              <input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
            </div>

            <AnimatedDropdown options={shiftOptions} value={shift} onChange={setShift} label="กะการทำงาน *" />

            <AnimatedDropdown options={roomOptions} value={cctvRoom} onChange={setCctvRoom} label="ประจำห้องปฏิบัติการ *" />

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อ-รหัส ผู้ตรวจ <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <MicButton
                  onResult={setInspectorName}
                  currentValue={inspectorName}
                  mode="replace"
                  className="top-1/2 -translate-y-1/2 right-2.5"
                />
              </div>
            </div>
          </div>

          {/* Inspection Items */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-800">รายการตรวจเช็คอุปกรณ์ภายในห้อง CCTV</h3>
                {lastSavedDraftTime && (
                  <span className="text-xs text-slate-400">บันทึกร่างอัตโนมัติ {lastSavedDraftTime} น.</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCheckAllNormal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-all active:scale-95 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                ตั้งค่าผ่านทุกอุปกรณ์ (Check All Normal)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatedDropdown options={radioOptions} value={radioStatus} onChange={setRadioStatus} label="1. วิทยุสื่อสารประจำห้อง" />
              <AnimatedDropdown options={reportBooksOptions} value={reportBooksStatus} onChange={setReportBooksStatus} label="2. สมุดบันทึกรายงาน" />
              <AnimatedDropdown options={nvrScreenOptions} value={nvrScreenStatus} onChange={setNvrScreenStatus} label="3. จอมอนิเตอร์แสดงผล NVR" />
              <AnimatedDropdown options={nvrMachineOptions} value={nvrMachineStatus} onChange={setNvrMachineStatus} label="4. เครื่องบันทึก NVR" />
              <AnimatedDropdown options={keysOptions} value={keysStatus} onChange={setKeysStatus} label="5. ดอกกุญแจสำคัญ" />
              <AnimatedDropdown options={accessControlOptions} value={accessControlStatus} onChange={setAccessControlStatus} label="6. ระบบ Access Control ประตู" />
              <div className="sm:col-span-2">
                <AnimatedDropdown options={incidentOptions} value={incidentReportStatus} onChange={setIncidentReportStatus} label="7. รายงานเหตุการณ์ผิดปกติ (Incident Report)" />
              </div>
            </div>
          </div>

          <div className="pt-4 hidden md:flex justify-center">
            <button type="submit" disabled={loading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 md:px-10 rounded-xl sm:rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2">
              <Send className="w-5 h-5" />
              <span>{loading ? 'กำลังบันทึก...' : 'ส่งรายงานตรวจเช็คห้อง CCTV'}</span>
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
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'บันทึก...' : 'ส่งรายงาน'}</span>
          </button>
        </div>

        {/* History Section */}
        <CollapsibleHistory
          title="ประวัติการตรวจเช็คห้อง CCTV"
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
            <div className="text-center py-8 text-slate-400">ไม่มีข้อมูลประวัติการตรวจเช็ค</div>
          ) : (
            <div className="overflow-x-auto mobile-table-scroll">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">วันที่</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">ผู้ตรวจ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">สถานะ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">ผลการตรวจ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">สรุป</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedReport(item)}
                    >
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {item.inspectionDate ? new Date(item.inspectionDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {item.inspectorName || '-'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.totalFailed === 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {item.totalFailed === 0 ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>ปกติทั้งหมด</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              <span>ผิดปกติ {item.totalFailed} รายการ</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">
                        ผ่าน {item.totalPassed}/{item.totalChecked}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate text-xs">
                        {item.summary || '-'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="ดูรายละเอียด"
                            onClick={() => setSelectedReport(item)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="ลบ"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
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

        {/* Detail Modal */}
        {selectedReport && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedReport(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">รายละเอียดการตรวจเช็คห้อง CCTV</h3>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">วันที่ตรวจเช็ค</p>
                      <p className="text-sm font-medium text-slate-800">
                        {selectedReport.inspectionDate
                          ? new Date(selectedReport.inspectionDate).toLocaleDateString('th-TH')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">ผู้ตรวจ</p>
                      <p className="text-sm font-medium text-slate-800">{selectedReport.inspectorName || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">สถานะโดยรวม</p>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${
                          selectedReport.totalFailed === 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {selectedReport.totalFailed === 0 ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>ปกติทั้งหมด</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>ผิดปกติ {selectedReport.totalFailed} รายการ</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">สถิติการตรวจ</p>
                      <p className="text-sm font-medium text-slate-800 mt-1">
                        ผ่าน {selectedReport.totalPassed} จาก {selectedReport.totalChecked} รายการ
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">สรุปรายละเอียดการตรวจเช็ค</p>
                    <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                      {selectedReport.summary || '-'}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
