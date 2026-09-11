'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Clock, Mic, X, Shield, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { apiFetch } from '@/lib/api';

const GUARD_POSTS = [
  'Gate 5 B4', 'Gate 6 B4', 'Worker', 'Scan Receiving', 'Receiving',
  'Tranfer Room', 'Scan Link way', 'Rel Lab', 'A2', 'A3',
  'Exit inspection', 'FA Lab', 'RCSC', '6/1', '6/2', 'Gate 2 B3',
];

const isStatusPass = (status: any) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'normal' || s === 'pass' || s === 'ปกติ' || s === 'พร้อมใช้งาน' || s === 'ผ่าน';
};

export default function HandheldDetectorPage() {
  const [inspectionDate, setInspectionDate] = useState('');
  const [building, setBuilding] = useState('');
  const [guardPost, setGuardPost] = useState('');
  const [inspectorCode, setInspectorCode] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [shift, setShift] = useState('');
  const [batteryStatus, setBatteryStatus] = useState('');
  const [ledStatus, setLedStatus] = useState('');
  const [detectionTestStatus, setDetectionTestStatus] = useState('');
  const [alarmStatus, setAlarmStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    setInspectionDate(new Date().toISOString().split('T')[0]);
    apiFetch<any>('/api/auth/me').then((res)=>{
      const u = res.user ?? res.data ?? res;
      if (u.username) setInspectorCode(u.username);
      if (u.fullName) setInspectorName(u.fullName);
      else if (u.username) setInspectorName(u.username);
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    apiFetch<any>('/api/metal-detector/handheld-checks?limit=50')
      .then((data) => setHistory(data.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  };

  const toInputDate = (v: any) => {
    if (!v) return '';
    try {
      return new Date(v).toISOString().split('T')[0];
    } catch { return ''; }
  };

  const safeParseRemark = (remark: any): any => {
    if (remark == null) return null;
    if (typeof remark === 'object') return remark;
    if (typeof remark !== 'string') return null;
    try { return JSON.parse(remark); } catch { return null; }
  };

  const startSpeechRecognition = (targetId: string) => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการแปลงเสียงเป็นข้อความ');
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const el = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement;
      if (el) el.value += (el.value.length > 0 ? ' ' : '') + transcript;
      el?.dispatchEvent(new Event('input', { bubbles: true }));
    };
    recognition.onerror = (event: any) => {
      alert('เกิดข้อผิดพลาดในการจดจำเสียง: ' + event.error);
    };
    recognition.start();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setMessage('');
  };

  const handleEdit = (item: any) => {
    setSelectedReport(null);
    setEditingId(item.id);
    setMessage('');
    const legacy = item.legacy;
    if (item._legacy && legacy) {
      setInspectionDate(toInputDate(legacy.inspectionDate || item.checkDate) || new Date().toISOString().split('T')[0]);
      setBuilding(legacy.building || '');
      setGuardPost(legacy.guardPost || '');
      setInspectorCode(legacy.inspectorCode || '');
      setInspectorName(legacy.inspectorName || item.inspector || '');
      setShift(legacy.shift || '');
      setBatteryStatus(legacy.batteryStatus || '');
      setLedStatus(legacy.ledStatus || '');
      setDetectionTestStatus(legacy.detectionTestStatus || '');
      setAlarmStatus(legacy.alarmStatus || '');
      setRemarks(legacy.remarks || '');
    } else {
      setInspectionDate(toInputDate(item.checkDate) || new Date().toISOString().split('T')[0]);
      const parsed = safeParseRemark(item.remark);
      if (parsed && typeof parsed === 'object') {
        setBuilding(parsed.building || '');
        setGuardPost(parsed.guard_post || parsed.guardPost || '');
        setInspectorCode(parsed.inspector_code || parsed.inspectorCode || '');
        setInspectorName(parsed.inspector_name || parsed.inspectorName || '');
        setShift(parsed.shift || '');
        setBatteryStatus(parsed.battery_status || parsed.batteryStatus || '');
        setLedStatus(parsed.led_status || parsed.ledStatus || '');
        setDetectionTestStatus(parsed.detection_test_status || parsed.detectionTestStatus || '');
        setAlarmStatus(parsed.alarm_status || parsed.alarmStatus || '');
        setRemarks(parsed.remarks || '');
      } else {
        // remark ไม่ใช่ JSON ใช้ค่าเดิม: inspector แยก code/name, remarks = raw
        const insp: string = item.inspector || '';
        const parts = insp.split(' ');
        setInspectorCode(parts[0] || '');
        setInspectorName(parts.slice(1).join(' ') || insp);
        setRemarks(typeof item.remark === 'string' ? item.remark : '');
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบรายงานนี้?')) return;
    try {
      await apiFetch(`/api/metal-detector/handheld-checks/${id}`, { method: 'DELETE' });
      setMessage('ลบรายงานเรียบร้อยแล้ว');
      if (editingId === id) setEditingId(null);
      fetchHistory();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!building || !guardPost || !inspectorCode.trim() || !inspectorName.trim() || !shift || !batteryStatus || !ledStatus || !detectionTestStatus || !alarmStatus) {
      setMessage('กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(editingId ? `/api/metal-detector/handheld-checks/${editingId}` : '/api/metal-detector/handheld-checks', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          equipmentId: 1,
          checkDate: inspectionDate,
          status: batteryStatus === 'พร้อมใช้งาน' && ledStatus === 'ผ่านการทดสอบ' && detectionTestStatus === 'ผ่านการทดสอบ' && alarmStatus === 'ผ่านการทดสอบ' ? 'normal' : 'abnormal',
          remark: JSON.stringify({
            building,
            guard_post: guardPost,
            inspector_code: inspectorCode,
            inspector_name: inspectorName,
            shift,
            battery_status: batteryStatus,
            led_status: ledStatus,
            detection_test_status: detectionTestStatus,
            alarm_status: alarmStatus,
            remarks,
          }),
          inspector: `${inspectorCode} ${inspectorName}`,
        }),
      });
      setMessage(editingId ? 'แก้ไขรายงานเรียบร้อยแล้ว' : 'ส่งรายงานการตรวจเช็คเรียบร้อยแล้ว');
      setEditingId(null);
      fetchHistory();
    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="ตรวจ Hand Held"
          subtitle="Handheld Metal Detector"
          icon={<Shield className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-5">

          {/* 1. วันที่ตรวจเช็ค */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">1. วันที่ตรวจเช็ค <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            {/* 2. Building */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">2. Building <span className="text-rose-500">*</span></label>
              <select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="" disabled selected>เลือกอาคาร</option>
                <option value="B2">B2</option>
                <option value="B3">B3</option>
                <option value="B4">B4</option>
                <option value="B6">B6</option>
              </select>
            </div>
          </div>

          {/* 3. จุดรักษาการณ์ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">3. จุดรักษาการณ์ <span className="text-rose-500">*</span></label>
            <select
              value={guardPost}
              onChange={(e) => setGuardPost(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="" disabled selected>เลือกจุดรักษาการณ์</option>
              {GUARD_POSTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 4. รหัสพนักงาน PCS + 5. ชื่อ-นามสกุล */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">4. รหัสพนักงาน PCS <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="กรอกรหัสพนักงาน"
                value={inspectorCode}
                onChange={(e) => setInspectorCode(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">5. ชื่อ-นามสกุล <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  id="inspector_name"
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุล หรือใช้ไมโครโฟน"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full px-5 py-4 pr-12 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <button type="button" onClick={() => startSpeechRecognition('inspector_name')} className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-400 hover:text-blue-600">
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 6. Shift */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">6. Shift (กะที่ทำการตรวจเช็ค) <span className="text-rose-500">*</span></label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShift('กะเช้า')}
                className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${shift === 'กะเช้า' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
              >
                🌅 เช้า
              </button>
              <button
                type="button"
                onClick={() => setShift('กะดึก')}
                className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${shift === 'กะดึก' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50'}`}
              >
                🌙 ดึก
              </button>
            </div>
            <input type="hidden" value={shift} required />
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-5">
            {/* 7. ตรวจสอบแบตเตอรี่ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">7. ตรวจสอบแบตเตอรี่ก่อนใช้งาน <span className="text-rose-500">*</span></label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setBatteryStatus('พร้อมใช้งาน')}
                  className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${batteryStatus === 'พร้อมใช้งาน' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                >
                  <span className="text-lg">✓</span> พร้อมใช้งาน
                </button>
                <button
                  type="button"
                  onClick={() => setBatteryStatus('ไม่พร้อมใช้งาน')}
                  className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${batteryStatus === 'ไม่พร้อมใช้งาน' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50'}`}
                >
                  <span className="text-lg">✗</span> ไม่พร้อมใช้งาน
                </button>
              </div>
              <input type="hidden" value={batteryStatus} required />
            </div>

            {/* 8. LED */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">8. เปิดสวิตช์ไฟ LED สีเขียวจะติด <span className="text-rose-500">*</span></label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLedStatus('ผ่านการทดสอบ')}
                  className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${ledStatus === 'ผ่านการทดสอบ' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                >
                  <span className="text-lg">✓</span> ผ่านการทดสอบ
                </button>
                <button
                  type="button"
                  onClick={() => setLedStatus('ไม่ผ่านการทดสอบ')}
                  className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${ledStatus === 'ไม่ผ่านการทดสอบ' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50'}`}
                >
                  <span className="text-lg">✗</span> ไม่ผ่านการทดสอบ
                </button>
              </div>
              <input type="hidden" value={ledStatus} required />
            </div>

            {/* 9. Detection Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">9. ทดสอบระยะห่างของอุปกรณ์ในการตรวจจับโลหะ <span className="text-rose-500">*</span></label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDetectionTestStatus('ผ่านการทดสอบ')}
                  className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${detectionTestStatus === 'ผ่านการทดสอบ' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                >
                  <span className="text-lg">✓</span> ผ่านการทดสอบ
                </button>
                <button
                  type="button"
                  onClick={() => setDetectionTestStatus('ไม่ผ่านการทดสอบ')}
                  className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${detectionTestStatus === 'ไม่ผ่านการทดสอบ' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50'}`}
                >
                  <span className="text-lg">✗</span> ไม่ผ่านการทดสอบ
                </button>
              </div>
              <input type="hidden" value={detectionTestStatus} required />
            </div>

            {/* 10. Alarm */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">10. เมื่อตรวจพบอุปกรณ์ที่เป็นโลหะจะมีไฟ LEDสีแดงโชว์และมีสัญญาณดัง <span className="text-rose-500">*</span></label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAlarmStatus('ผ่านการทดสอบ')}
                  className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${alarmStatus === 'ผ่านการทดสอบ' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                >
                  <span className="text-lg">✓</span> ผ่านการทดสอบ
                </button>
                <button
                  type="button"
                  onClick={() => setAlarmStatus('ไม่ผ่านการทดสอบ')}
                  className={`flex-1 px-6 py-4 border-2 rounded-2xl font-medium transition-all ${alarmStatus === 'ไม่ผ่านการทดสอบ' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50'}`}
                >
                  <span className="text-lg">✗</span> ไม่ผ่านการทดสอบ
                </button>
              </div>
              <input type="hidden" value={alarmStatus} required />
            </div>
          </div>

          {/* 11. หมายเหตุ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">11. หมายเหตุ</label>
            <div className="relative">
              <textarea
                id="remarks"
                rows={3}
                placeholder="กรอกหมายเหตุ (ถ้ามี) หรือใช้ไมโครโฟน"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-5 py-4 pr-12 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
              <button type="button" onClick={() => startSpeechRecognition('remarks')} className="absolute top-4 right-4 text-slate-400 hover:text-blue-600">
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="text-center pt-4 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 px-8 rounded-xl sm:rounded-full text-base shadow transition-transform active:scale-95 min-h-[44px] flex items-center justify-center"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-12 rounded-xl sm:rounded-full text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50 min-h-[44px] flex items-center justify-center"
            >
              {loading ? 'กำลังบันทึก...' : editingId ? '💾 บันทึกการแก้ไข' : 'ส่งรายงาน'}
            </button>
          </div>

        </form>

        {/* History Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 md:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            รายงานย้อนหลัง Hand Held Checks
          </h2>

          {historyLoading ? (
            <div className="text-center py-8 text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">ไม่มีข้อมูลย้อนหลัง</div>
          ) : (
            <div className="overflow-x-auto mobile-table-scroll">
              <table className="w-full text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">วันที่</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">สถานะ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">ผู้ตรวจ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">หมายเหตุ</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedReport(item)}>
                      <td className="py-3 px-3 text-slate-700">
                        {item.checkDate ? new Date(item.checkDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isStatusPass(item.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {isStatusPass(item.status) ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{item.inspector || '-'}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-md truncate">{item.remark || '-'}</td>
                      <td className="py-3 px-3">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="แก้ไข"
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
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

          {/* Detail Modal */}
          {selectedReport && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReport(null)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">รายละเอียดรายงาน</h3>
                    <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedReport._legacy ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500">วันที่ตรวจเช็ค</p>
                            <p className="text-sm font-medium text-slate-800">
                              {selectedReport.legacy?.inspectionDate ? new Date(selectedReport.legacy.inspectionDate).toLocaleDateString('th-TH') : (selectedReport.checkDate ? new Date(selectedReport.checkDate).toLocaleDateString('th-TH') : '-')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">ผู้ตรวจ</p>
                            <p className="text-sm font-medium text-slate-800">{selectedReport.legacy?.inspectorName || selectedReport.inspector || '-'}</p>
                          </div>
                        </div>
                        {selectedReport.legacy && (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500">อาคาร</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.building || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">จุดรักษาการณ์</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.guardPost || '-'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500">รหัสพนักงาน</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.inspectorCode || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">สถานะแบตเตอรี่</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.batteryStatus || '-'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500">LED</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.ledStatus || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">การตรวจจับ</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.detectionTestStatus || '-'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500">เสียงเตือน</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.alarmStatus || '-'}</p>
                              </div>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-xs text-slate-500">สถานะ</p>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isStatusPass(selectedReport.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {isStatusPass(selectedReport.status) ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">หมายเหตุ</p>
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{selectedReport.legacy?.remarks || selectedReport.remark || '-'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500">วันที่ตรวจเช็ค</p>
                            <p className="text-sm font-medium text-slate-800">
                              {selectedReport.checkDate ? new Date(selectedReport.checkDate).toLocaleDateString('th-TH') : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">สถานะ</p>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isStatusPass(selectedReport.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {isStatusPass(selectedReport.status) ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">ผู้ตรวจ</p>
                          <p className="text-sm font-medium text-slate-800">{selectedReport.inspector || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">หมายเหตุ</p>
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{selectedReport.remark || '-'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
