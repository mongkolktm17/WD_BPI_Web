'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import { Clock, CheckCircle2, Car, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { apiFetch } from '@/lib/api';

const CAR_LOTS = [
  { name: 'ลานรถยนต์ 1 (97 Slot)', capacity: 97, short: 'C1' },
  { name: 'ลานรถยนต์ 2 (114 Slot)', capacity: 114, short: 'C2' },
  { name: 'ลานรถยนต์ 3/1 (100 Slot)', capacity: 100, short: 'C3/1' },
  { name: 'ลานรถยนต์ 3/2 (264 Slot)', capacity: 264, short: 'C3/2' },
  { name: 'ลานรถยนต์ 4 (415 Slot)', capacity: 415, short: 'C4' },
  { name: 'ลานรถยนต์ 5 (53 Slot)', capacity: 53, short: 'C5' },
  { name: 'ลานรถยนต์ B.9 (129 Slot)', capacity: 129, short: 'CB.9' },
];

const MOTORCYCLE_LOTS = [
  { name: 'ลานจอด 1 (296 Slot)', capacity: 296, short: 'M1' },
  { name: 'ลานจอด 2 (210 Slot)', capacity: 210, short: 'M2' },
  { name: 'ลานจอด 3/1 (251 Slot)', capacity: 251, short: 'M3/1' },
];

export default function CarParkingPage() {
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectorCode, setInspectorCode] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [shift, setShift] = useState('กะเช้า (07.00 - 19.00)');
  const [spareTireStatus, setSpareTireStatus] = useState('ครบถ้วน');
  const [licensePlates, setLicensePlates] = useState(['']);

  const [carLotCounts, setCarLotCounts] = useState<Record<string, string>>({});
  const [motoLotCounts, setMotoLotCounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // History
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const historyLimit = 20;
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const offset = (page - 1) * historyLimit;
      const res = await apiFetch<any>(`/api/parking/history?limit=${historyLimit}&offset=${offset}`);
      const data = res.data ?? res;
      setHistory(data.data || []);
      setHistoryTotal(data.total || 0);
    } catch {
      // fallback to old endpoint
      try {
        const res2 = await apiFetch<any>(`/api/parking?limit=${historyLimit}`);
        const arr = res2.data ?? res2;
        setHistory(Array.isArray(arr) ? arr.slice(0, historyLimit) : []);
        setHistoryTotal(Array.isArray(arr) ? arr.length : 0);
      } catch { setHistory([]); }
    } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    setInspectionDate(new Date().toISOString().split('T')[0]);
    // Auto-fill from auth/me
    apiFetch<any>('/api/auth/me').then((res)=>{
      const u = res.user ?? res.data ?? res;
      if (u.username) setInspectorCode(u.username);
      if (u.fullName) setInspectorName(u.fullName);
      else if (u.username) setInspectorName(u.username);
    }).catch(()=>{});
  }, []);

  useEffect(()=>{ fetchHistory(historyPage); }, [fetchHistory, historyPage]);

  const handleAddPlate = () => {
    setLicensePlates([...licensePlates, '']);
  };

  const handlePlateChange = (index: number, val: string) => {
    const next = [...licensePlates];
    next[index] = val;
    setLicensePlates(next);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบรายงานนี้?')) return;
    try {
      await apiFetch(`/api/parking/${id}`, { method: 'DELETE' });
      setMessage('ลบรายงานเรียบร้อยแล้ว');
      fetchHistory(historyPage);
    } catch { setMessage('ลบไม่สำเร็จ'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!inspectorCode.trim() || !inspectorName.trim()) {
      setMessage('กรุณากรอกข้อมูลรหัสและชื่อผู้ตรวจให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const plates = licensePlates.filter((p) => p.trim());
      // Build carLotCounts numeric
      const carCounts: Record<string, number> = {};
      Object.entries(carLotCounts).forEach(([k,v])=>{ if(v && parseInt(v)>0) carCounts[k]=parseInt(v); });
      const motoCounts: Record<string, number> = {};
      Object.entries(motoLotCounts).forEach(([k,v])=>{ if(v && parseInt(v)>0) motoCounts[k]=parseInt(v); });

      const vehicles = plates.map((plate)=>({
        plateNumber: plate,
        vehicleType: 'car',
        lot: undefined,
        reason: spareTireStatus !== 'ครบถ้วน' ? 'ยางอะไหล่/อุปกรณ์ไม่ครบ' : undefined,
        spareTireStatus,
      }));

      // Single transaction: POST /api/parking/batch
      await apiFetch('/api/parking/batch', {
        method: 'POST',
        body: JSON.stringify({
          recordDate: inspectionDate,
          inspectorCode,
          inspectorName,
          shift: shift.includes('เช้า') ? 'กะเช้า' : 'กะดึก',
          spareTireStatus,
          carLotCounts: carCounts,
          motorcycleLotCounts: motoCounts,
          vehicles,
        }),
      });
      setMessage(`บันทึกรายงานเรียบร้อย` + (plates.length>0? ` (${plates.length} ป้ายทะเบียน)` : ''));
      setLicensePlates(['']);
      fetchHistory(1);
      setHistoryPage(1);
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการส่งรายงาน');
    } finally {
      setLoading(false);
    }
  };

  const shiftOptions = [
    { value: 'กะเช้า (07.00 - 19.00)', label: 'กะเช้า (07.00 - 19.00)', icon: <Clock className="w-4 h-4 text-amber-500" /> },
    { value: 'กะดึก (19.00 - 07.00)', label: 'กะดึก (19.00 - 07.00)', icon: <Clock className="w-4 h-4 text-indigo-500" /> },
  ];

  const spareTireOptions = [
    { value: 'ครบถ้วน', label: 'ครบถ้วน', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
    { value: 'ไม่ครบถ้วน', label: 'ไม่ครบถ้วน / มีสิ่งผิดปกติ', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
  ];

  const totalPages = Math.max(1, Math.ceil(historyTotal / historyLimit));

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="ตรวจลานจอดรถ"
          subtitle="Car Parking Inspection"
          icon={<Car className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4 md:space-y-6">

          {/* Section 1: Inspector Info */}
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">ข้อมูลการตรวจเช็ค</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">วันที่ตรวจเช็ค <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <AnimatedDropdown
                options={shiftOptions}
                value={shift}
                onChange={setShift}
                label="กะการทำงาน *"
              />

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">รหัสพนักงานผู้ตรวจ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="เช่น 100892"
                  value={inspectorCode}
                  onChange={(e) => setInspectorCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อ-นามสกุล ผู้ตรวจ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Car Parking Lots */}
          <div className="space-y-3 md:space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base md:text-lg font-bold text-slate-800">ลานจอดรถยนต์ (จำนวนรถที่จอด)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {CAR_LOTS.map((lot) => (
                <div key={lot.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-xs font-semibold text-slate-700">{lot.name}</div>
                  <input
                    type="number"
                    placeholder="จำนวนคัน"
                    value={carLotCounts[lot.name] || ''}
                    onChange={(e) => setCarLotCounts({ ...carLotCounts, [lot.name]: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Motorcycle Parking Lots */}
          <div className="space-y-3 md:space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base md:text-lg font-bold text-slate-800">ลานจอดรถจักรยานยนต์ (จำนวนรถที่จอด)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              {MOTORCYCLE_LOTS.map((lot) => (
                <div key={lot.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-xs font-semibold text-slate-700">{lot.name}</div>
                  <input
                    type="number"
                    placeholder="จำนวนคัน"
                    value={motoLotCounts[lot.name] || ''}
                    onChange={(e) => setMotoLotCounts({ ...motoLotCounts, [lot.name]: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Spare Tire & License Plates */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <AnimatedDropdown
              options={spareTireOptions}
              value={spareTireStatus}
              onChange={setSpareTireStatus}
              label="การตรวจเช็คยางอะไหล่ / อุปกรณ์ *"
              className="max-w-md"
            />

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ทะเบียนรถที่พบสิ่งผิดปกติ (ถ้ามี)</label>
              {licensePlates.map((plate, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder={`ป้ายทะเบียนคันที่ ${idx + 1}`}
                    value={plate}
                    onChange={(e) => handlePlateChange(idx, e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPlate}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline mt-1"
              >
                + เพิ่มป้ายทะเบียน
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 md:py-3.5 px-6 md:px-10 rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : '💾 บันทึกรายงานการตรวจเช็ค'}
            </button>
          </div>

        </form>

        {/* History Table - Exact Legacy Parity */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" /> ประวัติการรายงาน 20 รายการล่าสุด
            </h3>
            <button
              onClick={() => {
                const headers = ['วันที่', 'เวลา', 'กะ', 'รหัส', 'ผู้ตรวจ', 'C1 (97)', 'C2 (114)', 'C3/1 (100)', 'C3/2 (264)', 'C4 (415)', 'C5 (53)', 'CB.9 (129)', 'M1 (296)', 'M2 (210)', 'M3/1 (251)', 'ยางอะไหล่', 'ทะเบียนรถ'];
                const rows = history.map((h: any) => {
                  const d = h.recordDate ? new Date(h.recordDate) : (h.createdAt ? new Date(h.createdAt) : new Date());
                  const c = h.createdAt ? new Date(h.createdAt) : d;
                  const getVal = (lotName: string) => {
                    if (h.lotCounts && h.lotCounts[lotName]) {
                      const v = h.lotCounts[lotName];
                      return typeof v === 'object' ? v.vehicleCount : v;
                    }
                    return '-';
                  };
                  return [
                    d.toLocaleDateString('th-TH'),
                    c.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                    h.shift && !h.shift.includes('?') ? h.shift : 'เช้า',
                    h.inspectorCode || '-',
                    h.inspectorName || '-',
                    getVal('ลานรถยนต์ 1 (97 Slot)'),
                    getVal('ลานรถยนต์ 2 (114 Slot)'),
                    getVal('ลานรถยนต์ 3/1 (100 Slot)'),
                    getVal('ลานรถยนต์ 3/2 (264 Slot)'),
                    getVal('ลานรถยนต์ 4 (415 Slot)'),
                    getVal('ลานรถยนต์ 5 (53 Slot)'),
                    getVal('ลานรถยนต์ B.9 (129 Slot)'),
                    h.motorcycleCount1 ?? getVal('ลานจอด 1 (296 Slot)'),
                    h.motorcycleCount2 ?? getVal('ลานจอด 2 (210 Slot)'),
                    h.motorcycleCount3 ?? getVal('ลานจอด 3/1 (251 Slot)'),
                    h.spareTireStatus && !h.spareTireStatus.includes('?') ? h.spareTireStatus : 'ครบถ้วน',
                    `"${(h.licensePlates || h.carLicense || '-').replace(/"/g, '""')}"`
                  ].join(',');
                });
                const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'car_parking_report_history.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs md:text-sm shadow-md transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              📥 ส่งออกเป็น CSV
            </button>
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">กำลังโหลด...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">ไม่พบข้อมูลประวัติการรายงาน</div>
          ) : (
            <>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse bg-white text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-2 text-center whitespace-nowrap">วันที่</th>
                    <th className="py-3 px-2 text-center whitespace-nowrap">เวลา</th>
                    <th className="py-3 px-2 text-center whitespace-nowrap">กะ</th>
                    <th className="py-3 px-2 text-center whitespace-nowrap">รหัส</th>
                    <th className="py-3 px-2 whitespace-nowrap">ผู้ตรวจ</th>
                    {CAR_LOTS.map((lot) => (
                      <th
                        key={lot.name}
                        className="py-3 px-1.5 text-center whitespace-nowrap text-[10px] bg-blue-50/50 text-blue-900 border-l border-slate-200"
                        title={lot.name}
                      >
                        {lot.short}
                      </th>
                    ))}
                    {MOTORCYCLE_LOTS.map((lot) => (
                      <th
                        key={lot.name}
                        className="py-3 px-1.5 text-center whitespace-nowrap text-[10px] bg-emerald-50/50 text-emerald-900 border-l border-slate-200"
                        title={lot.name}
                      >
                        {lot.short}
                      </th>
                    ))}
                    <th className="py-3 px-2 text-center whitespace-nowrap border-l border-slate-200">ยาง</th>
                    <th className="py-3 px-2 whitespace-nowrap">ทะเบียน</th>
                    <th className="py-3 px-2 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 divide-y divide-slate-100">
                  {history.map((h: any) => {
                    const d = h.recordDate ? new Date(h.recordDate) : (h.createdAt ? new Date(h.createdAt) : null);
                    const c = h.createdAt ? new Date(h.createdAt) : d;
                    const isMorning = h.shift?.includes('เช้า') || h.shift?.includes('Day');
                    
                    const getCount = (lotName: string, isMoto = false) => {
                      if (!h.lotCounts) return '-';
                      // Direct match
                      if (h.lotCounts[lotName] !== undefined && h.lotCounts[lotName] !== null) {
                        const val = h.lotCounts[lotName];
                        const num = typeof val === 'object' && val !== null ? val.vehicleCount : val;
                        return num !== undefined && num !== null && num !== '' ? num : '-';
                      }
                      // Fuzzy key match (e.g. garbled thai ?????? 1 or ลานรถยนต์ 1)
                      const entries = Object.entries(h.lotCounts);
                      for (const [key, rawVal] of entries) {
                        const val: any = rawVal;
                        const targetKeyNum = lotName.match(/(\d+(\/\d+)?|B\.?\d+)/i)?.[0];
                        const curKeyNum = key.match(/(\d+(\/\d+)?|B\.?\d+)/i)?.[0];
                        if (targetKeyNum && curKeyNum && targetKeyNum.toLowerCase() === curKeyNum.toLowerCase()) {
                          const isCurMoto = typeof val === 'object' && val !== null ? val.vehicleType === 'moto' : key.includes('จอด');
                          if (!!isMoto === !!isCurMoto) {
                            const num = typeof val === 'object' && val !== null ? val.vehicleCount : val;
                            return num !== undefined && num !== null && num !== '' ? num : '-';
                          }
                        }
                      }
                      return '-';
                    };

                    return (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-2 text-center whitespace-nowrap font-medium text-slate-800">
                          {d ? d.toLocaleDateString('th-TH') : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap text-slate-500">
                          {c ? c.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className={`inline-block py-0.5 px-2 rounded-full text-[10px] font-bold ${
                            isMorning ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {h.shift && !h.shift.includes('?') ? (isMorning ? 'เช้า' : 'ดึก') : 'เช้า'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap font-medium text-slate-600">
                          {h.inspectorCode || '-'}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap font-medium text-slate-700">
                          {h.inspectorName || '-'}
                        </td>
                        {/* Car Lots C1 through CB.9 */}
                        {CAR_LOTS.map((lot) => {
                          const count = getCount(lot.name);
                          return (
                            <td
                              key={lot.name}
                              className={`py-2.5 px-1.5 text-center font-bold text-xs border-l border-slate-100 ${
                                count !== '-' && Number(count) > 0 ? 'text-blue-700 bg-blue-50/20' : 'text-slate-400'
                              }`}
                            >
                              {count}
                            </td>
                          );
                        })}
                        {/* Motorcycle Lots M1 through M3/1 */}
                        <td className="py-2.5 px-1.5 text-center font-bold text-xs border-l border-slate-100 text-emerald-700 bg-emerald-50/20">
                          {h.motorcycleCount1 ?? getCount(MOTORCYCLE_LOTS[0].name)}
                        </td>
                        <td className="py-2.5 px-1.5 text-center font-bold text-xs border-l border-slate-100 text-emerald-700 bg-emerald-50/20">
                          {h.motorcycleCount2 ?? getCount(MOTORCYCLE_LOTS[1].name)}
                        </td>
                        <td className="py-2.5 px-1.5 text-center font-bold text-xs border-l border-slate-100 text-emerald-700 bg-emerald-50/20">
                          {h.motorcycleCount3 ?? getCount(MOTORCYCLE_LOTS[2].name)}
                        </td>
                        {/* Spare Tire */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap border-l border-slate-100">
                          <span className={`inline-block py-0.5 px-2 rounded-full text-[10px] font-bold ${
                            h.spareTireStatus === 'ครบถ้วน' || h.spareTireStatus === 'มี' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {h.spareTireStatus && !h.spareTireStatus.includes('?') ? (h.spareTireStatus === 'ครบถ้วน' ? 'มี' : h.spareTireStatus) : 'มี'}
                          </span>
                        </td>
                        {/* License Plate */}
                        <td className="py-2.5 px-2 max-w-[130px] truncate text-slate-500" title={h.licensePlates || h.carLicense}>
                          {h.licensePlates || h.carLicense || '-'}
                        </td>
                        {/* Action buttons */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedReport(h)}
                              className="p-1 hover:bg-blue-50 text-blue-600 rounded"
                              title="ดูรายละเอียด"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(h.id)}
                              className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-slate-400">หน้า {historyPage} / {totalPages} (ทั้งหมด {historyTotal})</div>
              <div className="flex gap-2">
                <button disabled={historyPage<=1} onClick={()=>setHistoryPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> ก่อนหน้า</button>
                <button disabled={historyPage>=totalPages} onClick={()=>setHistoryPage(p=>p+1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 flex items-center gap-1">ถัดไป <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            </>
          )}
          {selectedReport && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setSelectedReport(null)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e)=>e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Car className="w-5 h-5 text-blue-600" />
                    รายละเอียดการตรวจเช็คลานจอดรถ
                  </h3>
                  <button onClick={()=>setSelectedReport(null)} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg">✕</button>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                    <p><span className="text-slate-400 text-xs block">วันที่ตรวจ:</span> <strong className="text-slate-700">{selectedReport.recordDate ? new Date(selectedReport.recordDate).toLocaleDateString('th-TH') : '-'}</strong></p>
                    <p><span className="text-slate-400 text-xs block">กะการทำงาน:</span> <strong className="text-slate-700">{selectedReport.shift && !selectedReport.shift.includes('?') ? selectedReport.shift : 'กะเช้า'}</strong></p>
                    <p><span className="text-slate-400 text-xs block">ผู้ตรวจ:</span> <strong className="text-slate-700">{selectedReport.inspectorName} ({selectedReport.inspectorCode})</strong></p>
                    <p><span className="text-slate-400 text-xs block">ยางอะไหล่/อุปกรณ์:</span> <strong className={selectedReport.spareTireStatus?.includes('ไม่') ? 'text-rose-600' : 'text-emerald-600'}>{selectedReport.spareTireStatus && !selectedReport.spareTireStatus.includes('?') ? selectedReport.spareTireStatus : 'ครบถ้วน'}</strong></p>
                  </div>

                  {/* Car Lot Counts Breakdown */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between text-xs tracking-wider uppercase">
                      <span>ยอดรถยนต์แยกตามลานจอด (7 ลาน)</span>
                      <span className="text-blue-600 font-semibold">รวม {selectedReport.totalCars || 0} คัน</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CAR_LOTS.map((lot) => {
                        let count = '-';
                        if (selectedReport.lotCounts) {
                          if (selectedReport.lotCounts[lot.name] !== undefined) {
                            const val = selectedReport.lotCounts[lot.name];
                            count = typeof val === 'object' && val !== null ? val.vehicleCount : val;
                          } else {
                            // fuzzy key match
                            for (const [k, val] of Object.entries(selectedReport.lotCounts)) {
                              const tNum = lot.name.match(/(\d+(\/\d+)?|B\.?\d+)/i)?.[0];
                              const cNum = k.match(/(\d+(\/\d+)?|B\.?\d+)/i)?.[0];
                              if (tNum && cNum && tNum.toLowerCase() === cNum.toLowerCase()) {
                                const isCurMoto = typeof val === 'object' && val !== null ? (val as any).vehicleType === 'moto' : k.includes('จอด');
                                if (!isCurMoto) {
                                  count = typeof val === 'object' && val !== null ? (val as any).vehicleCount : val;
                                  break;
                                }
                              }
                            }
                          }
                        }
                        // Fallback from single parkingLot string (e.g. legacy report where lot was saved in parkingLot column)
                        if ((count === '-' || count === undefined) && selectedReport.parkingLot) {
                          const tNum = lot.name.match(/(\d+(\/\d+)?|B\.?\d+)/i)?.[0];
                          const pNum = selectedReport.parkingLot.match(/(\d+(\/\d+)?|B\.?\d+)/i)?.[0];
                          if (tNum && pNum && tNum.toLowerCase() === pNum.toLowerCase()) {
                            count = String(selectedReport.totalCars || 0);
                          }
                        }
                        const numVal = count !== '-' && count !== null && count !== undefined ? Number(count) : 0;
                        return (
                          <div key={lot.name} className={`p-2.5 rounded-lg border flex flex-col justify-between text-xs ${numVal > 0 ? 'bg-blue-50/70 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200/60'}`}>
                            <span className="text-slate-600 font-medium text-[11px] truncate" title={lot.name}>{lot.name}</span>
                            <span className={`font-bold text-sm mt-1 ${numVal > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                              {count !== '-' && count !== undefined ? `${count} คัน` : '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Motorcycles breakdown */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between text-xs tracking-wider uppercase">
                      <span>ยอดรถจักรยานยนต์แยกตามลาน (3 ลาน)</span>
                      <span className="text-emerald-600 font-semibold">
                        รวม {(selectedReport.motorcycleCount1 || 0) + (selectedReport.motorcycleCount2 || 0) + (selectedReport.motorcycleCount3 || 0)} คัน
                      </span>
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/70 rounded-lg text-center">
                        <span className="text-[11px] text-slate-600 font-medium block">ลาน 1 (296 Slot)</span>
                        <strong className="text-emerald-700 text-sm mt-1 block">
                          {selectedReport.motorcycleCount1 ?? '-'} คัน
                        </strong>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/70 rounded-lg text-center">
                        <span className="text-[11px] text-slate-600 font-medium block">ลาน 2 (210 Slot)</span>
                        <strong className="text-emerald-700 text-sm mt-1 block">
                          {selectedReport.motorcycleCount2 ?? '-'} คัน
                        </strong>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/70 rounded-lg text-center">
                        <span className="text-[11px] text-slate-600 font-medium block">ลาน 3/1 (251 Slot)</span>
                        <strong className="text-emerald-700 text-sm mt-1 block">
                          {selectedReport.motorcycleCount3 ?? '-'} คัน
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* License Plates */}
                  {(selectedReport.licensePlates || selectedReport.carLicense) && (
                    <div>
                      <span className="text-slate-400 text-xs block mb-1">ทะเบียนรถที่พบสิ่งผิดปกติ:</span>
                      <div className="p-2.5 bg-amber-50 border border-amber-200/60 rounded-lg text-xs font-mono text-amber-900">
                        {selectedReport.licensePlates || selectedReport.carLicense}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
