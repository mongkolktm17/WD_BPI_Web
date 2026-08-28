'use client';

import React, { useState, useEffect } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import { Clock, MapPin, X, Shield } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { apiFetch } from '@/lib/api';

interface WalkthroughDetector {
  id: number;
  detectorCode: string;
  location: string;
  status: string;
}

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
    apiFetch<any>('/api/metal-detector/walkthrough-checks?limit=50')
      .then((data) => setHistory(data.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

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

      await apiFetch('/api/metal-detector/walkthrough-checks', {
        method: 'POST',
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
      setMessage('ส่งรายงานการตรวจเช็คเรียบร้อยแล้ว');
      // Refresh history
      apiFetch<any>('/api/metal-detector/walkthrough-checks?limit=50').then((data)=>setHistory(data.data || [])).catch(()=>{});
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
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="ตรวจ Walkthrough"
          subtitle="Walkthrough Metal Detector"
          icon={<Shield className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

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
              <input
                type="text"
                placeholder="เช่น 100892"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อผู้ตรวจ <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="เช่น นายสมชาย ใจดี"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
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
              <input
                type="text"
                placeholder="เช่น ประตูทางเข้าหลัก B2"
                value={guardPost}
                onChange={(e) => setGuardPost(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ยี่ห้อ/รุ่น เครื่องตรวจจับ <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="เช่น Garrett PD 6500i"
                value={scannerBrand}
                onChange={(e) => setScannerBrand(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Zones Grid (1-6) */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800">ผลการทดสอบแต่ละโซน (Zones 1-6)</h3>

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

           <div className="pt-4 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 md:py-3.5 px-6 md:px-10 rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base"
            >
              {loading ? 'กำลังบันทึก...' : '📊 ส่งรายงานสถานะ Walkthrough'}
            </button>
          </div>
        </form>

        {/* History Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 md:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            รายงานย้อนหลัง Walkthrough Checks
          </h2>

          {historyLoading ? (
            <div className="text-center py-8 text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">ไม่มีข้อมูลย้อนหลัง</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">วันที่</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">อาคาร</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">จุด</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">สถานะ</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600">ผู้ตรวจ</th>
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'normal' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {item.status === 'normal' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{item.inspector || '-'}</td>
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
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${selectedReport.status === 'normal' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {selectedReport.status === 'normal' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
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
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${selectedReport.status === 'normal' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {selectedReport.status === 'normal' ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
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
