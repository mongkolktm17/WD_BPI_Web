'use client';

import React, { useState, useEffect } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import { Clock, MapPin, X, Shield, Pencil, Trash2, Check, Save, RotateCcw, Sparkles, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import MicButton from '@/components/MicButton';
import CollapsibleHistory from '@/components/CollapsibleHistory';
import { apiFetch } from '@/lib/api';

const DRAFT_KEY = 'wd_pwa_draft_walkthrough_detector';

interface WalkthroughDetector {
  id: number;
  detectorCode: string;
  location: string;
  status: string;
}

const isStatusPass = (status: any) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'normal' || s === 'pass' || s === 'ปกติ' || s === 'พร้อมใช้งาน' || s === 'ผ่าน';
};

export default function WalkthroughDetectorPage() {
  const [detectorList, setDetectorList] = useState<WalkthroughDetector[]>([]);
  const [selectedDetectorId, setSelectedDetectorId] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [shift, setShift] = useState('กะเช้า (07.00 - 19.00)');
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [building, setBuilding] = useState('B2');
  const [guardPost, setGuardPost] = useState('');
  const [scannerBrand, setScannerBrand] = useState('Garrett');

  const [zoneStatuses, setZoneStatuses] = useState<Record<string, string>>({
    zone1: 'Pass',
    zone2: 'Pass',
    zone3: 'Pass',
    zone4: 'Pass',
    zone5: 'Pass',
    zone6: 'Pass',
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw && !editingId) {
        const d = JSON.parse(raw);
        if (d.guardPost || d.selectedDetectorId || d.scannerBrand) {
          setHasDraftNotice(true);
        }
      }
    } catch {}
  }, [editingId]);

  useEffect(() => {
    if (editingId) return;
    const timer = setTimeout(() => {
      try {
        const payload = {
          inspectionDate,
          shift,
          building,
          selectedDetectorId,
          guardPost,
          scannerBrand,
          zoneStatuses,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setLastSavedDraftTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
      } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, [inspectionDate, shift, building, selectedDetectorId, guardPost, scannerBrand, zoneStatuses, editingId]);

  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.inspectionDate) setInspectionDate(d.inspectionDate);
        if (d.shift) setShift(d.shift);
        if (d.building) setBuilding(d.building);
        if (d.selectedDetectorId) setSelectedDetectorId(d.selectedDetectorId);
        if (d.guardPost) setGuardPost(d.guardPost);
        if (d.scannerBrand) setScannerBrand(d.scannerBrand);
        if (d.zoneStatuses) setZoneStatuses(d.zoneStatuses);
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

  const handlePassAllZones = () => {
    setZoneStatuses({
      zone1: 'Pass',
      zone2: 'Pass',
      zone3: 'Pass',
      zone4: 'Pass',
      zone5: 'Pass',
      zone6: 'Pass',
    });
  };

  // Default fallback detectors if DB empty
  const FALLBACK_DETECTORS: WalkthroughDetector[] = [
    { id: 1, detectorCode: 'WT-B2-01', location: 'B2 Main Entrance', status: 'normal' },
    { id: 2, detectorCode: 'WT-B3-01', location: 'B3 Main Entrance', status: 'normal' },
    { id: 3, detectorCode: 'WT-B4-01', location: 'B4 Main Entrance', status: 'normal' },
    { id: 4, detectorCode: 'WT-B9-01', location: 'B9 Main Entrance', status: 'normal' },
  ];

  useEffect(() => {
    setInspectionDate(new Date().toISOString().split('T')[0]);
    apiFetch<any>('/api/metal-detector/walkthrough')
      .then((res) => {
        const list = res.data ?? res;
        if (Array.isArray(list) && list.length > 0) setDetectorList(list);
        else setDetectorList(FALLBACK_DETECTORS);
      })
      .catch(() => setDetectorList(FALLBACK_DETECTORS));
    // Auto-fill from session
    apiFetch<any>('/api/auth/me').then((res)=>{
      const u = res.user ?? res.data ?? res;
      if (u.username) setEmployeeId(u.username);
      if (u.fullName) setEmployeeName(u.fullName);
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    apiFetch<any>('/api/metal-detector/walkthrough-checks?limit=50')
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

  const safeParseRemark = (remark: any) => {
    if (remark == null) return null;
    if (typeof remark === 'object') return remark;
    if (typeof remark !== 'string') return null;
    try { return JSON.parse(remark); } catch { return null; }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setMessage('');
    setZoneStatuses({ zone1: 'Pass', zone2: 'Pass', zone3: 'Pass', zone4: 'Pass', zone5: 'Pass', zone6: 'Pass' });
    setGuardPost('');
  };

  const handleEdit = (item: any) => {
    setSelectedReport(null);
    setEditingId(item.id);
    setMessage('');
    const legacy = item.legacy;
    if (item._legacy && legacy) {
      setInspectionDate(toInputDate(legacy.inspectionDate || item.checkDate) || new Date().toISOString().split('T')[0]);
      setEmployeeId(legacy.employeeId || '');
      setEmployeeName(legacy.employeeName || item.inspector || '');
      setBuilding(legacy.building || 'B2');
      setGuardPost(legacy.guardPost || '');
      setScannerBrand(legacy.scannerBrand || 'Garrett');
      setShift(legacy.shift || 'กะเช้า (07.00 - 19.00)');
      setZoneStatuses({
        zone1: legacy.zone1Status || 'Pass',
        zone2: legacy.zone2Status || 'Pass',
        zone3: legacy.zone3Status || 'Pass',
        zone4: legacy.zone4Status || 'Pass',
        zone5: legacy.zone5Status || 'Pass',
        zone6: legacy.zone6Status || 'Pass',
      });
      setSelectedDetectorId('');
    } else {
      setInspectionDate(toInputDate(item.checkDate) || new Date().toISOString().split('T')[0]);
      // inspector: "code name..."
      const insp: string = item.inspector || '';
      const parts = insp.split(' ');
      setEmployeeId(parts[0] || '');
      setEmployeeName(parts.slice(1).join(' ') || '');
      setSelectedDetectorId(item.detectorId ? String(item.detectorId) : (item.detector?.id ? String(item.detector.id) : ''));
      const parsed = safeParseRemark(item.remark);
      if (parsed && typeof parsed === 'object') {
        if (parsed.building) setBuilding(parsed.building);
        if (parsed.guardPost || parsed.guard_post) setGuardPost(parsed.guardPost || parsed.guard_post);
        if (parsed.scannerBrand || parsed.brand) setScannerBrand(parsed.scannerBrand || parsed.brand);
        if (parsed.shift) setShift(parsed.shift);
        const zs: Record<string, string> = {};
        for (let i = 1; i <= 6; i++) {
          zs[`zone${i}`] = parsed[`zone${i}`] || parsed[`zone${i}Status`] || 'Pass';
        }
        setZoneStatuses((prev) => ({ ...prev, ...zs }));
      } else {
        const remarkStr: string = typeof item.remark === 'string' ? item.remark : '';
        const locStr: string = item.location || '';
        // building from [B2] or location prefix
        const bMatch = remarkStr.match(/\[([^\]]+)\]/);
        let b = bMatch?.[1] || locStr.split(' ')[0] || 'B2';
        if (!['B2','B3','B4','B9'].includes(b)) b = 'B2';
        setBuilding(b);
        // guardPost: remark part before first | minus [B..], fallback location minus building
        const beforePipe = remarkStr.split('|')[0] || '';
        const gp = beforePipe.replace(/^\[.*?\]\s*/, '').trim() || locStr.replace(/^[A-Z0-9]+\s*/, '').trim();
        setGuardPost(gp);
        const brandPart = remarkStr.split('|')[1]?.trim();
        if (brandPart) setScannerBrand(brandPart);
        // zones: match zone1:Pass / Z1:Pass / zone1=Pass
        const zones: Record<string, string> = { zone1: 'Pass', zone2: 'Pass', zone3: 'Pass', zone4: 'Pass', zone5: 'Pass', zone6: 'Pass' };
        const zoneSummary = remarkStr.split('|')[2] || remarkStr;
        const re = /(?:zone|z)\s*([1-6])\s*[:=]\s*([A-Za-z]+)/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(zoneSummary)) !== null) {
          const v = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
          zones[`zone${m[1]}`] = ['Pass','Fail','Other'].includes(v) ? v : 'Pass';
        }
        setZoneStatuses(zones);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบรายงานนี้?')) return;
    try {
      await apiFetch(`/api/metal-detector/walkthrough-checks/${id}`, { method: 'DELETE' });
      setMessage('ลบรายงานเรียบร้อยแล้ว');
      if (editingId === id) { setEditingId(null); }
      fetchHistory();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!employeeId.trim() || !employeeName.trim() || !guardPost.trim()) {
      setMessage('กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const allPass = Object.values(zoneStatuses).every((s) => s === 'Pass');
      const zoneSummary = Object.entries(zoneStatuses)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');

      // Determine detector: use selected or fallback auto by building
      let detId = selectedDetectorId ? Number(selectedDetectorId) : 0;
      let detCode: string | undefined;
      if (!detId) {
        const fallback = FALLBACK_DETECTORS.find(f=>f.detectorCode.includes(building)) || FALLBACK_DETECTORS[0];
        detId = fallback.id;
        detCode = fallback.detectorCode;
      }

      await apiFetch(editingId ? `/api/metal-detector/walkthrough-checks/${editingId}` : '/api/metal-detector/walkthrough-checks', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          detectorId: detId,
          detectorCode: detCode,
          location: `${building} ${guardPost}`,
          checkDate: inspectionDate,
          status: allPass ? 'normal' : 'abnormal',
          remark: `[${building}] ${guardPost} | ${scannerBrand} | ${zoneSummary}`,
          inspector: `${employeeId} ${employeeName}`,
        }),
      });
      setMessage(editingId ? 'แก้ไขรายงานเรียบร้อยแล้ว' : 'ส่งรายงานการตรวจเช็คเรียบร้อยแล้ว');
      if (!editingId) {
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
      }
      setEditingId(null);
      // Refresh history
      fetchHistory();
    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const buildingOptions = [
    { value: 'B2', label: 'อาคาร B2', icon: <MapPin className="w-4 h-4 text-blue-500" /> },
    { value: 'B3', label: 'อาคาร B3', icon: <MapPin className="w-4 h-4 text-emerald-500" /> },
    { value: 'B4', label: 'อาคาร B4', icon: <MapPin className="w-4 h-4 text-amber-500" /> },
    { value: 'B9', label: 'อาคาร B9', icon: <MapPin className="w-4 h-4 text-rose-500" /> },
  ];

  const shiftOptions = [
    { value: 'กะเช้า (07.00 - 19.00)', label: 'กะเช้า (07.00 - 19.00)', icon: <Clock className="w-4 h-4 text-amber-500" /> },
    { value: 'กะดึก (19.00 - 07.00)', label: 'กะดึก (19.00 - 07.00)', icon: <Clock className="w-4 h-4 text-indigo-500" /> },
  ];

  const zoneOptions = [
    { value: 'Pass', label: 'Pass (ผ่าน)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
    { value: 'Fail', label: 'Fail (ไม่ผ่าน)', icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
    { value: 'Other', label: 'Other (อื่นๆ)', icon: <span className="w-2 h-2 rounded-full bg-amber-500" /> },
  ];

  const detectorOptions = detectorList.map((d) => ({
    value: String(d.id),
    label: `${d.detectorCode} - ${d.location}`,
    icon: <MapPin className="w-4 h-4 text-emerald-500" />,
  }));

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans pb-28 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="ตรวจ Walkthrough"
          subtitle="Walkthrough Metal Detector"
          icon={<Shield className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {hasDraftNotice && !editingId && (
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

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <MicButton
                  onResult={setEmployeeId}
                  currentValue={employeeId}
                  mode="replace"
                  className="top-1/2 -translate-y-1/2 right-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อผู้ตรวจ <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <MicButton
                  onResult={setEmployeeName}
                  currentValue={employeeName}
                  mode="replace"
                  className="top-1/2 -translate-y-1/2 right-2.5"
                />
              </div>
            </div>

            <AnimatedDropdown
              options={buildingOptions}
              value={building}
              onChange={setBuilding}
              label="อาคาร *"
            />

            <AnimatedDropdown
              options={detectorOptions.length>0?detectorOptions:FALLBACK_DETECTORS.map(d=>({ value:String(d.id), label:`${d.detectorCode} - ${d.location}`, icon:<MapPin className="w-4 h-4 text-emerald-500" /> }))}
              value={selectedDetectorId}
              onChange={setSelectedDetectorId}
              label="เครื่องตรวจจับ (เลือกหรือเว้นว่างเพื่อสร้างอัตโนมัติ)"
            />

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">จุดรักษาการณ์ <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="เช่น ประตูทางเข้าหลัก B2"
                  value={guardPost}
                  onChange={(e) => setGuardPost(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <MicButton
                  onResult={setGuardPost}
                  currentValue={guardPost}
                  mode="replace"
                  className="top-1/2 -translate-y-1/2 right-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ยี่ห้อ/รุ่น เครื่องตรวจจับ <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="เช่น Garrett PD 6500i"
                  value={scannerBrand}
                  onChange={(e) => setScannerBrand(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <MicButton
                  onResult={setScannerBrand}
                  currentValue={scannerBrand}
                  mode="replace"
                  className="top-1/2 -translate-y-1/2 right-2.5"
                />
              </div>
            </div>
          </div>

          {/* Zones Grid (1-6) */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-800">ผลการทดสอบแต่ละโซน (Zones 1-6)</h3>
                {lastSavedDraftTime && !editingId && (
                  <span className="text-xs text-slate-400">บันทึกร่างอัตโนมัติ {lastSavedDraftTime} น.</span>
                )}
              </div>
              <button
                type="button"
                onClick={handlePassAllZones}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-all active:scale-95 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                ตั้งค่าผ่านทุกโซน (Pass All Zones 1-6)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((zNum) => (
                <AnimatedDropdown
                  key={zNum}
                  options={zoneOptions}
                  value={zoneStatuses[`zone${zNum}`] || 'Pass'}
                  onChange={(val) => setZoneStatuses({ ...zoneStatuses, [`zone${zNum}`]: val })}
                  label={`Zone ${zNum} Status`}
                />
              ))}
            </div>
          </div>

           <div className="pt-4 hidden md:flex justify-center gap-2.5 sm:gap-3">
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
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-10 rounded-xl sm:rounded-full text-base shadow-lg transition-transform active:scale-95 min-h-[44px] flex items-center justify-center gap-2"
            >
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
                  <span>ส่งรายงานสถานะ Walkthrough</span>
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
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {editingId ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'บันทึก...' : editingId ? 'บันทึกแก้ไข' : 'ส่งรายงาน'}</span>
          </button>
        </div>

        {/* History Section */}
        <CollapsibleHistory title="รายงานย้อนหลัง Walkthrough Checks" count={history.length} defaultOpen={false}>
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
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">อาคาร</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">จุด</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">สถานะ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">ผู้ตรวจ</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedReport(item)}>
                      <td className="py-3 px-3 text-slate-700">
                        {item.checkDate ? new Date(item.checkDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{item.remark?.split(' ')[0] || '-'}</td>
                      <td className="py-3 px-3 text-slate-700">{item.remark?.split('|')[0]?.replace(/^\[.*?\]\s*/, '') || '-'}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isStatusPass(item.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {isStatusPass(item.status) ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>ผ่าน</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              <span>ไม่ผ่าน</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{item.inspector || '-'}</td>
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
                            <p className="text-sm font-medium text-slate-800">{selectedReport.legacy?.employeeName || selectedReport.inspector || '-'}</p>
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
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.employeeId || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">ยี่ห้อ/รุ่น</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.scannerBrand || '-'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500">Zone 1</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.zone1Status || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Zone 2</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.zone2Status || '-'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500">Zone 3</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.zone3Status || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Zone 4</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.zone4Status || '-'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500">Zone 5</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.zone5Status || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Zone 6</p>
                                <p className="text-sm font-medium text-slate-800">{selectedReport.legacy.zone6Status || '-'}</p>
                              </div>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-xs text-slate-500">สถานะ</p>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isStatusPass(selectedReport.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {isStatusPass(selectedReport.status) ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>ผ่าน</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5" />
                                <span>ไม่ผ่าน</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">หมายเหตุ</p>
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{selectedReport.remark || '-'}</p>
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
                              {isStatusPass(selectedReport.status) ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>ผ่าน</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>ไม่ผ่าน</span>
                                </>
                              )}
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
        </CollapsibleHistory>

      </div>
    </div>
  );
}
