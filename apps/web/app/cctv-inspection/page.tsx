'use client';

import React, { useState, useEffect } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import MicButton from '@/components/MicButton';
import { apiFetch } from '@/lib/api';
import { Calendar, Clock, MapPin, User, RefreshCw, Camera } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

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

  useEffect(() => {
    setInspectionDate(new Date().toISOString().split('T')[0]);
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
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="ตรวจสอบห้อง CCTV"
          subtitle="CCTV Inspection"
          icon={<Camera className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

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
              <input type="text" value={inspectorName} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 text-sm cursor-not-allowed" />
            </div>
          </div>

          {/* Inspection Items */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800">รายการตรวจเช็คอุปกรณ์ภายในห้อง CCTV</h3>

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

          <div className="pt-4 flex justify-center">
            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 md:py-3.5 px-6 md:px-10 rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : '📊 ส่งรายงานตรวจเช็คห้อง CCTV'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
