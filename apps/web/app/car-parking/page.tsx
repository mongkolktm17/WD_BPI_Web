'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import { Clock, CheckCircle2, Car, Trash2, Eye, Pencil, ChevronLeft, ChevronRight, X, Save, FileSpreadsheet, Camera, Radio, Sparkles, RotateCcw, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { apiFetch } from '@/lib/api';
import { useSite } from '@/lib/SiteContext';
import { IncidentService } from '@/lib/incident-service';
import MicButton from '@/components/MicButton';
import CollapsibleHistory from '@/components/CollapsibleHistory';

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

const PARKING_QUICK_PRESETS = [
  'การจอดรถยนต์และจักรยานยนต์เป็นระเบียบเรียบร้อย',
  'พื้นที่จอดเพียงพอ ไม่พบรถจอดกีดขวางทางสัญจร',
  'พบรถจอดไม่ตรงช่อง / ล้ำเส้น 1 คัน',
  'พบรถเปิดไฟหน้ารถหรือกระจกทิ้งไว้',
  'ลานจอด 4 แน่นหนามากกว่า 90%',
];

const DRAFT_KEY = 'wd_pwa_draft_car_parking';

export default function CarParkingPage() {
  const { currentSite } = useSite();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectorCode, setInspectorCode] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [shift, setShift] = useState('กะเช้า (07.00 - 19.00)');
  const [spareTireStatus, setSpareTireStatus] = useState('ครบถ้วน');
  const [licensePlates, setLicensePlates] = useState(['']);
  const [parkingNotes, setParkingNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notifySoc, setNotifySoc] = useState(false);

  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);

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
  const [editingId, setEditingId] = useState<number | null>(null);

  // Compare mode (uses loaded history only, no extra API)
  const [compareMode, setCompareMode] = useState(false);
  const [compareAId, setCompareAId] = useState<number | null>(null);
  const [compareBId, setCompareBId] = useState<number | null>(null);

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

    // Check for draft in localStorage
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.carLotCounts || p.motoLotCounts || p.parkingNotes || (p.licensePlates && p.licensePlates.some((l: string) => l.trim()))) {
          setHasDraftNotice(true);
          setLastSavedDraftTime(p._savedAt || 'ก่อนหน้านี้');
        }
      }
    } catch {}
  }, []);

  // Debounced auto-save draft
  useEffect(() => {
    if (editingId !== null) return;
    const timer = setTimeout(() => {
      const hasData = Object.values(carLotCounts).some(v => v) || Object.values(motoLotCounts).some(v => v) || parkingNotes.trim() || licensePlates.some(p => p.trim());
      if (hasData) {
        try {
          const toSave = {
            carLotCounts,
            motoLotCounts,
            spareTireStatus,
            licensePlates,
            parkingNotes,
            _savedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
          setLastSavedDraftTime(toSave._savedAt);
        } catch {}
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [carLotCounts, motoLotCounts, spareTireStatus, licensePlates, parkingNotes, editingId]);

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.carLotCounts) setCarLotCounts(p.carLotCounts);
        if (p.motoLotCounts) setMotoLotCounts(p.motoLotCounts);
        if (p.spareTireStatus) setSpareTireStatus(p.spareTireStatus);
        if (p.licensePlates) setLicensePlates(p.licensePlates);
        if (p.parkingNotes) setParkingNotes(p.parkingNotes);
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
      if (editingId === id) handleCancelEdit();
      fetchHistory(historyPage);
    } catch { setMessage('ลบไม่สำเร็จ'); }
  };

  const handleEdit = (h: any) => {
    setEditingId(h.id);
    setInspectionDate(h.recordDate ? new Date(h.recordDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setInspectorCode(h.inspectorCode || '');
    setInspectorName(h.inspectorName || '');
    if (h.shift?.includes('ดึก') || h.shift?.includes('PM')) setShift('กะดึก (19.00 - 07.00)');
    else setShift('กะเช้า (07.00 - 19.00)');
    setSpareTireStatus(h.spareTireStatus && !h.spareTireStatus.includes('?') ? h.spareTireStatus : 'ครบถ้วน');
    const carCounts: Record<string, string> = {};
    const motoCounts: Record<string, string> = {};
    if (h.lotCounts && typeof h.lotCounts === 'object') {
      for (const [k, v] of Object.entries(h.lotCounts) as any[]) {
        const num = typeof v === 'object' && v !== null ? v.vehicleCount : v;
        if (num === undefined || num === null || num === '') continue;
        const isMoto = typeof v === 'object' && v !== null ? v.vehicleType === 'moto' : String(k).includes('จอด');
        if (isMoto) motoCounts[k] = String(num);
        else carCounts[k] = String(num);
      }
    }
    setCarLotCounts(carCounts);
    setMotoLotCounts(motoCounts);
    const platesStr = h.licensePlates || h.carLicense || '';
    setLicensePlates(platesStr && platesStr !== '-' ? platesStr.split(',').map((s: string) => s.trim()).filter(Boolean) : ['']);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCarLotCounts({});
    setMotoLotCounts({});
    setLicensePlates(['']);
    setSpareTireStatus('ครบถ้วน');
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

      if (editingId !== null) {
        const lotCounts: Record<string, any> = {};
        Object.entries(carCounts).forEach(([lot, count]) => { lotCounts[lot] = { vehicleType: 'car', vehicleCount: String(count) }; });
        Object.entries(motoCounts).forEach(([lot, count]) => { lotCounts[lot] = { vehicleType: 'moto', vehicleCount: String(count) }; });
        const motoVals = Object.values(motoCounts);
        await apiFetch(`/api/parking/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            recordDate: inspectionDate,
            inspectorCode,
            inspectorName,
            shift: shift.includes('เช้า') ? 'กะเช้า' : 'กะดึก',
            spareTireStatus,
            licensePlates: plates.join(', ') || undefined,
            totalCars: Object.values(carCounts).reduce((s, v) => s + v, 0),
            motorcycleCount1: motoVals[0] ?? 0,
            motorcycleCount2: motoVals[1] ?? 0,
            motorcycleCount3: motoVals[2] ?? 0,
            lotCounts,
          }),
        });
        setMessage('แก้ไขรายงานเรียบร้อย');
        handleCancelEdit();
        fetchHistory(historyPage);
        return;
      }
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

      // Real-time SOC Emergency Bridge
      if (notifySoc) {
        try {
          IncidentService.createIncident({
            siteCode: currentSite?.code || 'BPI',
            location: 'พื้นที่ลานจอดรถ',
            incidentType: 'ยานพาหนะ / ลานจอดรถ',
            severity: 'medium',
            reportedBy: inspectorName || 'รปภ. ประจำลานจอด',
            description: `[ตรวจลานจอด] สถานะยาง: ${spareTireStatus} | ${parkingNotes || 'พบสิ่งผิดปกติในพื้นที่ลานจอด'}`,
          });
        } catch {}
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraftNotice(false);
        setLastSavedDraftTime(null);
      } catch {}

      setMessage(`บันทึกรายงานเรียบร้อย` + (plates.length>0? ` (${plates.length} ป้ายทะเบียน)` : ''));
      setLicensePlates(['']);
      setParkingNotes('');
      setPhotoPreview(null);
      setNotifySoc(false);
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

  // Default A/B = 2 latest records from loaded history
  useEffect(() => {
    if (history.length >= 1 && compareAId === null) setCompareAId(history[0].id);
    if (history.length >= 2 && compareBId === null) setCompareBId(history[1].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const formatCompareLabel = (h: any) => {
    const d = h.recordDate ? new Date(h.recordDate).toLocaleDateString('th-TH') : (h.createdAt ? new Date(h.createdAt).toLocaleDateString('th-TH') : '-');
    const s = h.shift && !String(h.shift).includes('?') ? h.shift.replace('กะ', '').trim() || h.shift : 'เช้า';
    return `${d} • ${s} • ${h.inspectorName || h.inspectorCode || '#' + h.id}`;
  };

  // Same fuzzy logic as history table getCount, but returns number (0 when missing)
  const getCompareNum = (h: any, lotName: string, isMoto = false, motoIdx?: number): number => {
    if (!h) return 0;
    // Prefer motorcycleCount1-3 for moto lots when present
    if (isMoto && motoIdx !== undefined) {
      const k = `motorcycleCount${motoIdx + 1}`;
      if (h[k] !== undefined && h[k] !== null && h[k] !== '') {
        const n = Number(h[k]);
        if (!Number.isNaN(n)) return n;
      }
    }
    if (h.lotCounts && typeof h.lotCounts === 'object') {
      if (h.lotCounts[lotName] !== undefined && h.lotCounts[lotName] !== null) {
        const v = h.lotCounts[lotName];
        const num = typeof v === 'object' && v !== null ? v.vehicleCount : v;
        if (num !== undefined && num !== null && num !== '') {
          const n = Number(num);
          return Number.isNaN(n) ? 0 : n;
        }
      }
      const targetNum = lotName.match(/(\d+(\/\d+)?|B\.?\d+)/i)?.[0];
      for (const [key, rawVal] of Object.entries(h.lotCounts)) {
        const val: any = rawVal;
        const curNum = key.match(/(\d+(\/\d+)?|B\.?\d+)/i)?.[0];
        if (targetNum && curNum && targetNum.toLowerCase() === curNum.toLowerCase()) {
          const isCurMoto = typeof val === 'object' && val !== null ? val.vehicleType === 'moto' : String(key).includes('จอด');
          if (!!isMoto === !!isCurMoto) {
            const num = typeof val === 'object' && val !== null ? val.vehicleCount : val;
            if (num !== undefined && num !== null && num !== '') {
              const n = Number(num);
              return Number.isNaN(n) ? 0 : n;
            }
          }
        }
      }
    }
    return 0;
  };

  const compareA = history.find((h: any) => h.id === compareAId) ?? null;
  const compareB = history.find((h: any) => h.id === compareBId) ?? null;
  const CAR_CAP = CAR_LOTS.reduce((s, l) => s + l.capacity, 0);
  const MOTO_CAP = MOTORCYCLE_LOTS.reduce((s, l) => s + l.capacity, 0);
  const sumCar = (h: any) => (h ? CAR_LOTS.reduce((s, lot) => s + getCompareNum(h, lot.name, false), 0) : 0);
  const sumMoto = (h: any) => (h ? MOTORCYCLE_LOTS.reduce((s, lot, i) => s + getCompareNum(h, lot.name, true, i), 0) : 0);
  const totalCarA = compareA ? (Number(compareA.totalCars) > 0 ? Number(compareA.totalCars) : sumCar(compareA)) || sumCar(compareA) : 0;
  const totalCarB = compareB ? (Number(compareB.totalCars) > 0 ? Number(compareB.totalCars) : sumCar(compareB)) || sumCar(compareB) : 0;
  // Prefer lot-sum for consistency; fall back to totalCars only when lot-sum is 0 handled above
  const totalMotoA = sumMoto(compareA);
  const totalMotoB = sumMoto(compareB);
  const occCarA = CAR_CAP ? (totalCarA / CAR_CAP) * 100 : 0;
  const occCarB = CAR_CAP ? (totalCarB / CAR_CAP) * 100 : 0;
  const occMotoA = MOTO_CAP ? (totalMotoA / MOTO_CAP) * 100 : 0;
  const occMotoB = MOTO_CAP ? (totalMotoB / MOTO_CAP) * 100 : 0;
  const diffClass = (d: number) => d > 0 ? 'text-emerald-600 font-bold' : d < 0 ? 'text-rose-600 font-bold' : 'text-slate-400';
  const fmtDiff = (d: number) => d > 0 ? `+${d}` : `${d}`;

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans pb-28">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="ตรวจลานจอดรถ"
          subtitle={editingId !== null ? `กำลังแก้ไขรายงาน #${editingId}` : 'Car Parking Inspection'}
          icon={<Car className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Auto-save Draft Notice Banner */}
        {hasDraftNotice && (
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
                  คุณต้องการกู้คืนข้อมูลการตรวจลานจอดที่กรอกค้างไว้หรือไม่?
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
                <div className="relative">
                  <input
                    type="text"
                    placeholder="เช่น 100892"
                    value={inspectorCode}
                    onChange={(e) => setInspectorCode(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                  <MicButton onResult={(v) => setInspectorCode(v)} currentValue={inspectorCode} mode="replace" label="พูดรหัสพนักงาน" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อ-นามสกุล ผู้ตรวจ <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="เช่น นายสมชาย ใจดี"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                  <MicButton onResult={(v) => setInspectorName(v)} currentValue={inspectorName} mode="replace" label="พูดชื่อ-นามสกุล" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Car Parking Lots */}
          <div className="space-y-3 md:space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base md:text-lg font-bold text-slate-800">ลานจอดรถยนต์ (จำนวนรถที่จอด)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
              {CAR_LOTS.map((lot) => (
                <div key={lot.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-700 flex justify-between items-center">
                    <span>{lot.name}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">{lot.short}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="จำนวนคัน"
                    value={carLotCounts[lot.name] || ''}
                    onChange={(e) => setCarLotCounts({ ...carLotCounts, [lot.name]: e.target.value })}
                    className="w-full px-3 py-2.5 sm:py-1.5 rounded-lg border border-slate-200 text-base sm:text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Motorcycle Parking Lots */}
          <div className="space-y-3 md:space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base md:text-lg font-bold text-slate-800">ลานจอดรถจักรยานยนต์ (จำนวนรถที่จอด)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
              {MOTORCYCLE_LOTS.map((lot) => (
                <div key={lot.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-700 flex justify-between items-center">
                    <span>{lot.name}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">{lot.short}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="จำนวนคัน"
                    value={motoLotCounts[lot.name] || ''}
                    onChange={(e) => setMotoLotCounts({ ...motoLotCounts, [lot.name]: e.target.value })}
                    className="w-full px-3 py-2.5 sm:py-1.5 rounded-lg border border-slate-200 text-base sm:text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
              className="max-w-md w-full"
            />

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ทะเบียนรถที่พบสิ่งผิดปกติ (ถ้ามี)</label>
              {licensePlates.map((plate, idx) => (
                <div key={idx} className="flex gap-2 mb-2 relative">
                  <input
                    type="text"
                    placeholder={`ป้ายทะเบียนคันที่ ${idx + 1}`}
                    value={plate}
                    onChange={(e) => handlePlateChange(idx, e.target.value)}
                    className="flex-1 pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <MicButton
                    onResult={(v) => handlePlateChange(idx, v)}
                    currentValue={plate}
                    mode="replace"
                    label="พูดป้ายทะเบียน"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPlate}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline mt-1 py-1 inline-block cursor-pointer"
              >
                + เพิ่มป้ายทะเบียน
              </button>
            </div>
            {/* Quick Presets & Notes */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                ข้อสังเกตและสภาพลานจอด (Quick Presets)
              </label>

              {/* 1-Click Preset Chips */}
              <div className="flex flex-wrap gap-1.5 py-1">
                {PARKING_QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setParkingNotes((prev) => {
                        const cur = prev.trim();
                        if (!cur) return preset;
                        if (cur.includes(preset)) return prev;
                        return `${cur}\n- ${preset}`;
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 text-xs font-medium transition-all active:scale-95 text-left cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="relative">
                <textarea
                  rows={2}
                  placeholder="ระบุข้อสังเกตเพิ่มเติม เช่น สภาพการจอดรถ กีดขวาง หรือความผิดปกติ (ถ้ามี)..."
                  value={parkingNotes}
                  onChange={(e) => setParkingNotes(e.target.value)}
                  className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <MicButton
                  onResult={(v) => setParkingNotes(v)}
                  currentValue={parkingNotes}
                  mode="append"
                  className="top-2.5 right-2.5"
                  label="พูดข้อสังเกตและสภาพลานจอด"
                />
              </div>
            </div>

            {/* Photo Capture & Real-time SOC Bridge */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    ถ่ายภาพหลักฐานหน้างาน (ถ้ามี)
                  </label>
                  <p className="text-[11px] text-slate-500">กรณีพบรถชน/เฉี่ยว, จอดกีดขวาง, หรือยางแบน</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setPhotoPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{photoPreview ? 'ถ่ายรูปใหม่' : 'เปิดกล้อง / แนบรูป'}</span>
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="ลบรูปภาพ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {photoPreview && (
                <div className="relative w-32 h-24 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="หลักฐาน" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Real-time SOC Bridge Switch */}
              <label className="flex items-center gap-2.5 cursor-pointer bg-rose-50 hover:bg-rose-100/80 p-2.5 rounded-xl border border-rose-200 text-rose-900 text-xs font-bold transition-all shadow-2xs">
                <input
                  type="checkbox"
                  checked={notifySoc}
                  onChange={(e) => setNotifySoc(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <Radio className="w-4 h-4 text-rose-600 animate-pulse flex-shrink-0" />
                <span>แจ้งเตือนศูนย์ SOC Command Center ทันที (กรณีพบเหตุฉุกเฉิน / เฉี่ยวชนแล้วหนี)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 hidden md:flex justify-center gap-2.5 sm:gap-3">
            {editingId !== null && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 md:py-3.5 px-6 md:px-10 rounded-xl sm:rounded-full shadow transition-transform active:scale-95 text-sm md:text-base min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>ยกเลิกการแก้ไข</span>
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 md:py-3.5 px-6 md:px-10 rounded-xl sm:rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'กำลังบันทึก...' : editingId !== null ? 'บันทึกการแก้ไข' : 'บันทึกรายงานการตรวจเช็ค'}</span>
            </button>
          </div>

        </form>

        {/* Collapsible History Table */}
        <CollapsibleHistory
          title="ประวัติการรายงาน 20 รายการล่าสุด"
          count={history.length}
          defaultOpen={false}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
            <div className="text-xs text-slate-500">
              แตะแถวในตารางเพื่อดูรายละเอียดหรือเปรียบเทียบ
            </div>
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs md:text-sm shadow-md transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ส่งออกเป็น CSV</span>
            </button>
          </div>

          {/* Compare mode toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setCompareMode((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${compareMode ? 'bg-blue-600' : 'bg-slate-300'}`}
              title="โหมดเปรียบเทียบ"
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${compareMode ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm font-semibold text-slate-700">โหมดเปรียบเทียบ</span>
            {compareMode && <span className="text-xs text-slate-400">(ใช้ข้อมูล history ที่โหลดไว้ ไม่ยิง API เพิ่ม)</span>}
          </div>

          {compareMode && (
            <div className="mb-4 p-3 md:p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Record A (เก่า)</label>
                  <select
                    value={compareAId ?? ''}
                    onChange={(e) => setCompareAId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {history.map((h: any) => (
                      <option key={h.id} value={h.id}>A: {formatCompareLabel(h)}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => { const a = compareAId; setCompareAId(compareBId); setCompareBId(a); }}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                  title="สลับ A/B"
                >
                  ⇄ สลับ A/B
                </button>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Record B (ใหม่)</label>
                  <select
                    value={compareBId ?? ''}
                    onChange={(e) => setCompareBId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {history.map((h: any) => (
                      <option key={h.id} value={h.id}>B: {formatCompareLabel(h)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!compareA || !compareB ? (
                <div className="text-center text-xs text-slate-500 py-2">ต้องมี history อย่างน้อย 2 รายการเพื่อเปรียบเทียบ</div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2 text-left whitespace-nowrap">ลาน</th>
                          <th className="py-2 px-2 text-center whitespace-nowrap">A</th>
                          <th className="py-2 px-2 text-center whitespace-nowrap">B</th>
                          <th className="py-2 px-2 text-center whitespace-nowrap">Diff (B−A)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {CAR_LOTS.map((lot) => {
                          const a = getCompareNum(compareA, lot.name, false);
                          const b = getCompareNum(compareB, lot.name, false);
                          const d = b - a;
                          return (
                            <tr key={lot.name} className="hover:bg-slate-50">
                              <td className="py-2 px-2 whitespace-nowrap font-medium text-slate-700">{lot.short} <span className="text-slate-400 font-normal hidden sm:inline">{lot.name}</span></td>
                              <td className="py-2 px-2 text-center">{a}</td>
                              <td className="py-2 px-2 text-center">{b}</td>
                              <td className={`py-2 px-2 text-center ${diffClass(d)}`}>{fmtDiff(d)}</td>
                            </tr>
                          );
                        })}
                        {MOTORCYCLE_LOTS.map((lot, i) => {
                          const a = getCompareNum(compareA, lot.name, true, i);
                          const b = getCompareNum(compareB, lot.name, true, i);
                          const d = b - a;
                          return (
                            <tr key={lot.name} className="hover:bg-emerald-50/40">
                              <td className="py-2 px-2 whitespace-nowrap font-medium text-emerald-900">{lot.short} <span className="text-slate-400 font-normal hidden sm:inline">{lot.name}</span></td>
                              <td className="py-2 px-2 text-center">{a}</td>
                              <td className="py-2 px-2 text-center">{b}</td>
                              <td className={`py-2 px-2 text-center ${diffClass(d)}`}>{fmtDiff(d)}</td>
                            </tr>
                          );
                        })}
                        {/* Summary rows */}
                        <tr className="bg-slate-50 font-semibold">
                          <td className="py-2 px-2">รวมรถยนต์</td>
                          <td className="py-2 px-2 text-center">{totalCarA}</td>
                          <td className="py-2 px-2 text-center">{totalCarB}</td>
                          <td className={`py-2 px-2 text-center ${diffClass(totalCarB - totalCarA)}`}>{fmtDiff(totalCarB - totalCarA)}</td>
                        </tr>
                        <tr className="bg-emerald-50/60 font-semibold">
                          <td className="py-2 px-2">รวมมอไซค์</td>
                          <td className="py-2 px-2 text-center">{totalMotoA}</td>
                          <td className="py-2 px-2 text-center">{totalMotoB}</td>
                          <td className={`py-2 px-2 text-center ${diffClass(totalMotoB - totalMotoA)}`}>{fmtDiff(totalMotoB - totalMotoA)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2">Occupancy รถยนต์ ({CAR_CAP} slot)</td>
                          <td className="py-2 px-2 text-center">{occCarA.toFixed(1)}%</td>
                          <td className="py-2 px-2 text-center">{occCarB.toFixed(1)}%</td>
                          <td className={`py-2 px-2 text-center ${diffClass(totalCarB - totalCarA)}`}>{(occCarB - occCarA) >= 0 ? '+' : ''}{(occCarB - occCarA).toFixed(1)}%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2">Occupancy มอไซค์ ({MOTO_CAP} slot)</td>
                          <td className="py-2 px-2 text-center">{occMotoA.toFixed(1)}%</td>
                          <td className="py-2 px-2 text-center">{occMotoB.toFixed(1)}%</td>
                          <td className={`py-2 px-2 text-center ${diffClass(totalMotoB - totalMotoA)}`}>{(occMotoB - occMotoA) >= 0 ? '+' : ''}{(occMotoB - occMotoA).toFixed(1)}%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2">ยางอะไหล่</td>
                          <td className="py-2 px-2 text-center">{compareA.spareTireStatus || '-'}</td>
                          <td className="py-2 px-2 text-center">{compareB.spareTireStatus || '-'}</td>
                          <td className={`py-2 px-2 text-center ${compareA.spareTireStatus === compareB.spareTireStatus ? 'text-slate-400' : 'text-amber-600 font-bold'}`}>{compareA.spareTireStatus === compareB.spareTireStatus ? '=' : '≠'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2">ผู้ตรวจ</td>
                          <td className="py-2 px-2 text-center">{compareA.inspectorName || compareA.inspectorCode || '-'}</td>
                          <td className="py-2 px-2 text-center">{compareB.inspectorName || compareB.inspectorCode || '-'}</td>
                          <td className="py-2 px-2 text-center text-slate-400">{compareA.inspectorCode === compareB.inspectorCode ? '=' : '≠'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Simple div bars: car A vs B, moto A vs B */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="text-xs font-bold text-slate-700">กราฟเปรียบเทียบ (แท่ง)</div>
                    {(() => {
                      const max = Math.max(totalCarA, totalCarB, totalMotoA, totalMotoB, 1);
                      const bar = (val: number, color: string) => (
                        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, (val / max) * 100))}%` }} />
                        </div>
                      );
                      return (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-16 shrink-0 font-semibold text-blue-800">รถยนต์ A</span>
                            {bar(totalCarA, 'bg-blue-500')}
                            <span className="w-10 text-right font-bold">{totalCarA}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-16 shrink-0 font-semibold text-blue-800">รถยนต์ B</span>
                            {bar(totalCarB, 'bg-blue-700')}
                            <span className="w-10 text-right font-bold">{totalCarB}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-16 shrink-0 font-semibold text-emerald-800">มอไซค์ A</span>
                            {bar(totalMotoA, 'bg-emerald-400')}
                            <span className="w-10 text-right font-bold">{totalMotoA}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-16 shrink-0 font-semibold text-emerald-800">มอไซค์ B</span>
                            {bar(totalMotoB, 'bg-emerald-600')}
                            <span className="w-10 text-right font-bold">{totalMotoB}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {historyLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">กำลังโหลด...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">ไม่พบข้อมูลประวัติการรายงาน</div>
          ) : (
            <>
            <div className="overflow-x-auto mobile-table-scroll rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse bg-white text-xs min-w-[700px]">
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
                              onClick={() => handleEdit(h)}
                              className="p-1 hover:bg-amber-50 text-amber-600 rounded"
                              title="แก้ไข"
                            >
                              <Pencil className="w-3.5 h-3.5" />
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
                  <button onClick={()=>setSelectedReport(null)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
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
        </CollapsibleHistory>
      </div>

      {/* Mobile PWA Sticky Bottom Action Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="truncate">
              {lastSavedDraftTime ? `ร่างอัตโนมัติ: ${lastSavedDraftTime}` : 'พร้อมส่งตรวจลานจอด'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 min-h-[42px]"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'กำลังบันทึก...' : editingId !== null ? 'บันทึกแก้ไข' : 'ส่งรายงาน'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
