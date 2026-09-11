'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import MicButton from '@/components/MicButton';
import { RefreshCw, Camera, Eye, Edit, Building2, Cctv, ChevronDown, Upload, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface ImageMapResponse {
  imageMap: Record<string, string>;
  total: number;
}

interface CameraRecord {
  id: number;
  buildingId: number;
  cameraNo: string;
  cameraName: string;
}

interface CameraCheckRecord {
  id: number;
  cameraId: number;
  checkDate: string;
  status: string;
  remark: string;
  checkedBy: string | null;
  createdAt: string;
  camera: CameraRecord;
}

interface CameraCheckRoundCamera {
  id: number;
  cameraId: number;
  cameraName: string;
  cameraNo: string;
  status: string;
  isPass: boolean;
  remark: string;
}

interface CameraCheckRoundReport {
  id: string;
  roundKey: string;
  checkDate: string;
  building: string;
  nvr: string;
  checkedBy: string;
  createdAt: string;
  totalCameras: number;
  passedCameras: number;
  failedCameras: number;
  status: string;
  cameras: CameraCheckRoundCamera[];
}

const BUILDING_META: Record<string, { label: string; color: string; gradient: string; shadow: string }> = {
  B2: { label: 'อาคาร B2', color: 'blue', gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/25' },
  B3: { label: 'อาคาร B3', color: 'violet', gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/25' },
  B4: { label: 'อาคาร B4', color: 'amber', gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/25' },
  B9: { label: 'อาคาร B9', color: 'emerald', gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25' },
};

const NVR_CAMERA_CONFIG: Record<string, number[]> = {
  B2: [32, 32, 32, 32, 32, 32, 32, 32, 32, 32],
  B3: [32, 60],
  B4: [16, 16],
  B9: [16],
};

type PageMode = 'create' | 'view';

// ─── Import panel: นำเข้าชื่อกล้อง (CSV) ─────────────────────────────
// CSV 4 คอลัมน์: buildingCode (เช่น 2/3/4/9 หรือ B2/B3/B4/B9), cameraNo, cameraName, location
function normalizeBuildingCode(input: string): string {
  const t = (input || '').trim().toUpperCase().replace(/^อาคาร\s*/, '');
  if (!t) return '';
  if (/^\d+[A-Z]?$/.test(t)) return `B${t}`; // "2" -> "B2"
  return t; // "B2", "B3" ฯลฯ ใช้ตรง ๆ
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ''));
}

function CameraImportPanel({ buildings: buildingsProp, onImported }: { buildings: any[]; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [localBuildings, setLocalBuildings] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  // ถ้าหา buildings state จากหน้าหลักไม่เจอ (ว่าง) ให้ fetch เองใน panel
  useEffect(() => {
    if (buildingsProp && buildingsProp.length > 0) return;
    apiFetch<any>('/api/cctv/buildings')
      .then((res) => {
        const list = res?.data ?? res;
        if (Array.isArray(list)) setLocalBuildings(list);
      })
      .catch(() => {});
  }, [buildingsProp]);

  const buildings = buildingsProp && buildingsProp.length > 0 ? buildingsProp : localBuildings;

  const resolveBuildingId = useCallback((code: string): number | undefined => {
    const norm = normalizeBuildingCode(code);
    if (!norm || buildings.length === 0) return undefined;
    const found = buildings.find((b: any) => {
      const bc = (b.buildingCode || '').toString().toUpperCase().trim();
      const bn = (b.buildingName || '').toString().toUpperCase().trim();
      return bc === norm || bc === code.trim().toUpperCase() || bn === norm || bn.includes(norm);
    });
    return found?.id;
  }, [buildings]);

  const rows = React.useMemo(() => {
    return csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((line) => parseCsvLine(line));
  }, [csvText]);

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    setCsvText(text);
  };

  const handleImport = async () => {
    setError('');
    setResult(null);
    const payload: { buildingId: number; cameraNo: string; cameraName: string; location?: string; status?: string }[] = [];
    const clientErrors: string[] = [];
    rows.forEach((cols, idx) => {
      const [code = '', cameraNo = '', cameraName = '', location = ''] = cols;
      if (!code || !cameraNo || !cameraName) {
        clientErrors.push(`บรรทัด ${idx + 1}: ข้อมูลไม่ครบ (ต้องมี buildingCode, cameraNo, cameraName)`);
        return;
      }
      const buildingId = resolveBuildingId(code);
      if (!buildingId) {
        clientErrors.push(`บรรทัด ${idx + 1}: ไม่พบอาคาร "${code}" ในระบบ`);
        return;
      }
      payload.push({ buildingId, cameraNo, cameraName, location: location || undefined, status: 'normal' });
    });
    if (payload.length === 0) {
      setError(clientErrors.length > 0 ? clientErrors.join('\n') : 'ไม่มีข้อมูลที่นำเข้าได้');
      if (clientErrors.length > 0) setResult({ created: 0, skipped: rows.length, errors: clientErrors });
      return;
    }
    setImporting(true);
    try {
      const res = await apiFetch<any>('/api/cctv/cameras/import', { method: 'POST', body: JSON.stringify(payload) });
      const out = res?.data ?? res;
      setResult({
        created: out?.created ?? 0,
        skipped: (out?.skipped ?? 0) + clientErrors.length,
        errors: [...clientErrors, ...((out?.errors as string[]) || [])],
      });
      onImported();
    } catch (e: any) {
      setError(e?.message || 'นำเข้าไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm md:text-base font-bold text-slate-800">
          <Upload className="w-4 h-4 text-slate-500" />
          นำเข้าชื่อกล้อง (CSV)
          <span className="text-[10px] md:text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            buildingCode, cameraNo, cameraName, location
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            วาง CSV 4 คอลัมน์: <code className="bg-slate-100 px-1 rounded">buildingCode, cameraNo, cameraName, location</code> เช่น{' '}
            <code className="bg-slate-100 px-1 rounded">2,B2-NVR1-CH01,หน้าทางเข้า B2,โถงชั้น 1</code> (buildingCode ใส่ 2/3/4/9 หรือ B2/B3/B4/B9 ได้)
          </p>
          {/* lookup แปลง buildingCode -> buildingId */}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="text-slate-400 self-center">อาคารในระบบ:</span>
            {buildings.length === 0 ? (
              <span className="text-slate-400">กำลังโหลด...</span>
            ) : (
              buildings.map((b: any) => (
                <span key={b.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                  {b.buildingCode} → id {b.id}
                </span>
              ))
            )}
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'2,B2-NVR1-CH01,หน้าทางเข้า B2,โถงชั้น 1\n3,B3-NVR1-CH01,ลานจอดรถ B3,ชั้น G'}
            rows={5}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer font-medium text-slate-600">
              📁 เลือกไฟล์ .csv
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <span className="text-[11px] text-slate-400">{rows.length > 0 ? `${rows.length} แถว` : ''}</span>
            <button
              onClick={handleImport}
              disabled={importing || rows.length === 0}
              className="ml-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-bold disabled:opacity-50"
            >
              {importing ? 'กำลังนำเข้า...' : `นำเข้า ${rows.length} แถว`}
            </button>
          </div>
          {/* preview */}
          {rows.length > 0 && (
            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1 text-slate-500">#</th>
                    <th className="text-left px-2 py-1 text-slate-500">buildingCode</th>
                    <th className="text-left px-2 py-1 text-slate-500">→ buildingId</th>
                    <th className="text-left px-2 py-1 text-slate-500">cameraNo</th>
                    <th className="text-left px-2 py-1 text-slate-500">cameraName</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((cols, i) => {
                    const bId = resolveBuildingId(cols[0] || '');
                    return (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                        <td className="px-2 py-1">{cols[0]}</td>
                        <td className="px-2 py-1 font-bold">
                          {bId ? <span className="text-emerald-600">{bId}</span> : <span className="text-rose-500">ไม่พบ</span>}
                        </td>
                        <td className="px-2 py-1">{cols[1]}</td>
                        <td className="px-2 py-1">{cols[2]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > 50 && <div className="text-center text-[11px] text-slate-400 py-1">แสดง 50 แถวแรก</div>}
            </div>
          )}
          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs whitespace-pre-line">{error}</div>}
          {result && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-700">
                นำเข้าแล้ว: <span className="text-emerald-600">{result.created}</span> · ข้าม: <span className="text-amber-600">{result.skipped}</span>
              </div>
              {result.errors.length > 0 && (
                <ul className="list-disc list-inside text-rose-600 max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 30).map((er, i) => <li key={i}>{er}</li>)}
                  {result.errors.length > 30 && <li>...และอีก {result.errors.length - 30} รายการ</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CctvAngleCheckPage() {
  const [mode, setMode] = useState<PageMode>('create');
  const [selectedBuilding, setSelectedBuilding] = useState('B2');
  const [selectedNvr, setSelectedNvr] = useState('NVR-1');
  const [checkerName, setCheckerName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [channelStatuses, setChannelStatuses] = useState<Record<number, 'correct' | 'incorrect'>>({});
  const [viewReports, setViewReports] = useState<CameraCheckRoundReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [activeViewRound, setActiveViewRound] = useState<CameraCheckRoundReport | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [channelRemarks, setChannelRemarks] = useState<Record<number, string>>({});
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);

  const nvrNum = parseInt(selectedNvr.replace('NVR-', ''), 10);
  const nvrCount = (NVR_CAMERA_CONFIG[selectedBuilding] || []).length;
  const channelCount = (NVR_CAMERA_CONFIG[selectedBuilding] || [])[nvrNum - 1] || 16;

  const fetchImageMap = useCallback(async () => {
    try {
      setLoadingImages(true);
      const res = await apiFetch<{ success: boolean; data: ImageMapResponse }>(`/api/cctv/image-map?building=${selectedBuilding}&nvr=NVR${nvrNum}`);
      setImageMap(res.data?.imageMap || {});
    } catch {
      setImageMap({});
    } finally {
      setLoadingImages(false);
    }
  }, [selectedBuilding, nvrNum]);

  // Dynamic building list
  const fetchBuildings = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/api/cctv/buildings');
      const list = res.data ?? res;
      if (Array.isArray(list)) setBuildings(list);
      // If selectedBuilding not in list, keep B2 but allow new buildings dynamically
    } catch {}
  }, []);

  const fetchCameras = useCallback(async () => {
    try {
      // Dynamic buildingId resolution from /api/cctv/buildings
      let bId: number | undefined;
      if (buildings.length > 0) {
        const found = buildings.find((b:any)=> (b.buildingCode?.toUpperCase() === selectedBuilding.toUpperCase()) || (b.buildingName?.toUpperCase() === selectedBuilding.toUpperCase()));
        if (found) bId = found.id;
      }
      // Fallback to hardcoded only if buildings not loaded yet
      if (!bId) {
        const fallback: Record<string, number> = { B2: 26, B3: 24 };
        bId = fallback[selectedBuilding];
      }
      if (!bId) { setCameras([]); return; }
      const res = await apiFetch<{ success: boolean; data: CameraRecord[] }>(`/api/cctv/cameras?buildingId=${bId}`);
      setCameras(res.data || []);
    } catch {
      setCameras([]);
    }
  }, [selectedBuilding, buildings]);

  const fetchReports = useCallback(async () => {
    if (mode !== 'view') return;
    setLoadingReports(true);
    try {
      const res = await apiFetch<any>(`/api/cctv/camera-checks/rounds?limit=100`);
      const data = res?.data ?? res ?? [];
      setViewReports(Array.isArray(data) ? data : []);
    } catch {
      setViewReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [mode]);

  const handleDeleteRound = async (roundKey: string) => {
    if (!confirm('ยืนยันการลบผลการตรวจสอบมุมกล้องรอบนี้ทั้งหมด?')) return;
    try {
      await apiFetch(`/api/cctv/camera-checks/rounds/${encodeURIComponent(roundKey)}`, { method: 'DELETE' });
      setMessage('✅ ลบรายการรอบเรียบร้อยแล้ว');
      fetchReports();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);
  useEffect(() => { fetchImageMap(); setChannelStatuses({}); }, [fetchImageMap]);
  useEffect(() => { fetchCameras(); }, [fetchCameras]);
  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { setSelectedNvr('NVR-1'); }, [selectedBuilding]);
  // Auto-fill checkerName from auth session
  useEffect(()=>{
    apiFetch<any>('/api/auth/me').then((res)=>{
      const u = res.user ?? res.data ?? res;
      const name = u.fullName || u.username || '';
      if (name && !checkerName) setCheckerName(name);
    }).catch(()=>{});
  }, []);

  const toggleStatus = (ch: number) => {
    if (mode === 'view') return;
    setChannelStatuses(prev => ({
      ...prev,
      [ch]: (prev[ch] || 'correct') === 'correct' ? 'incorrect' : 'correct',
    }));
  };

  const openChannelModal = (ch: number) => {
    setSelectedChannel(ch);
  };

  const saveSingleChannel = async () => {
    if (selectedChannel === null) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const channelCameraMap: Record<number, CameraRecord> = {};
      cameras.forEach(c => {
        const chMatch = c.cameraNo.match(/(\d+)$/);
        if (chMatch) {
          const ch = parseInt(chMatch[1], 10);
          if (ch >= 1 && ch <= channelCount && !channelCameraMap[ch]) channelCameraMap[ch] = c;
        }
      });
      const cam = channelCameraMap[selectedChannel];
      const payload = {
        cameraId: cam ? cam.id : 1,
        checkDate: today,
        status: (channelStatuses[selectedChannel] || 'correct') === 'correct' ? 'pass' : 'fail',
        remark: channelRemarks[selectedChannel] || `Building ${selectedBuilding} ${selectedNvr} CH-${selectedChannel < 10 ? `0${selectedChannel}` : selectedChannel}`,
        checkedBy: checkerName || undefined,
      };
      await apiFetch('/api/cctv/camera-checks', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(`บันทึกกล้อง CH-${selectedChannel} เรียบร้อย`);
      setSelectedChannel(null);
    } catch (e:any) { setMessage(e?.message || 'บันทึกไม่สำเร็จ'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const channelCameraMap: Record<number, CameraRecord> = {};
      cameras.forEach(c => {
        const chMatch = c.cameraNo.match(/(\d+)$/);
        if (chMatch) {
          const ch = parseInt(chMatch[1], 10);
          if (ch >= 1 && ch <= channelCount && !channelCameraMap[ch]) {
            channelCameraMap[ch] = c;
          }
        }
      });

      const checks = Array.from({ length: channelCount }, (_, i) => i + 1).map(ch => {
        const cam = channelCameraMap[ch];
        return {
          cameraId: cam ? cam.id : 1,
          checkDate: today,
          status: (channelStatuses[ch] || 'correct') === 'correct' ? 'pass' : 'fail',
          remark: `Building ${selectedBuilding} ${selectedNvr} CH-${ch < 10 ? `0${ch}` : ch}`,
          checkedBy: checkerName || undefined,
        };
      });

      await apiFetch('/api/cctv/camera-checks/batch', {
        method: 'POST',
        body: JSON.stringify(checks),
      });
      setMessage('บันทึกการตรวจสอบมุมกล้องเรียบร้อยแล้ว');
    } catch (e: any) {
      setMessage(e?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pass' || status === 'normal' || status === 'correct') {
      return <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">✓ ปกติ</span>;
    }
    return <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700">✕ ผิดปกติ</span>;
  };

  const getChannelFromRemark = (remark: string) => {
    const match = remark.match(/CH-(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  };

  const buildViewChannelStatuses = () => {
    const statuses: Record<number, 'correct' | 'incorrect'> = {};
    const imageMapLocal: Record<string, string> = {};
    viewReports.forEach(r => {
      const ch = getChannelFromRemark((r as any).remark || '');
      if (ch) {
        statuses[ch] = r.status === 'pass' || r.status === 'normal' || r.status === 'correct' ? 'correct' : 'incorrect';
        const imgKey = `${selectedBuilding}-${nvrNum}-${ch}`;
        imageMapLocal[imgKey] = imageMap[imgKey] || '';
      }
    });
    return { statuses, imageMapLocal };
  };

  const viewChannelStatuses = mode === 'view' ? buildViewChannelStatuses().statuses : channelStatuses;
  const displayImageMap = mode === 'view' ? buildViewChannelStatuses().imageMapLocal : imageMap;

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <PageHeader
          title="ตรวจมุมกล้องวงจรปิด"
          subtitle="CCTV Angle Check"
          icon={<Camera className="w-5 h-5 md:w-6 h-6 text-white" />}
          actions={
            <button
              onClick={() => setMode(mode === 'create' ? 'view' : 'create')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${mode === 'view' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
            >
              {mode === 'view' ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {mode === 'view' ? 'ดูรายงาน' : 'สร้างรายงาน'}
            </button>
          }
        />

        {message && (
          <div className={`p-3 md:p-4 rounded-xl text-center font-medium text-sm ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {mode === 'view' ? (
          /* VIEW MODE - ROUND BASED */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-800">
                    📋 รายงานตรวจสอบมุมกล้องย้อนหลัง (สรุปรวมตามรอบรายงาน)
                  </h3>
                  <p className="text-xs text-slate-500">
                    แสดงผล 1 แถวต่อ 1 รอบตรวจมุมกล้อง สามารถคลิกไอคอนดวงตาเพื่อดูและตรวจเช็คภาพกล้องรายตัวได้
                  </p>
                </div>
              </div>

              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                  <span className="text-slate-400 text-sm">กำลังโหลดรายงาน...</span>
                </div>
              ) : viewReports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">ไม่พบรายการตรวจสอบมุมกล้อง</div>
              ) : (
                <div className="overflow-x-auto mobile-table-scroll rounded-xl border border-slate-200">
                  <table className="w-full text-sm min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold">วันที่</th>
                        <th className="text-left py-3 px-3 font-semibold">อาคาร</th>
                        <th className="text-left py-3 px-3 font-semibold">NVR</th>
                        <th className="text-center py-3 px-3 font-semibold">ผลการตรวจ</th>
                        <th className="text-left py-3 px-4 font-semibold">ผู้ตรวจ</th>
                        <th className="text-center py-3 px-3 font-semibold">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewReports.map((rnd) => {
                        const isAllPass = rnd.failedCameras === 0;
                        return (
                          <tr key={rnd.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {rnd.checkDate ? new Date(rnd.checkDate).toLocaleDateString('th-TH') : '-'}
                            </td>
                            <td className="py-3 px-3 font-bold text-blue-600">{rnd.building}</td>
                            <td className="py-3 px-3 font-semibold text-slate-700">{rnd.nvr}</td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  isAllPass
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {isAllPass ? '✓' : '✕'} ถูกต้อง {rnd.passedCameras}/{rnd.totalCameras} กล้อง
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{rnd.checkedBy || '-'}</td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveViewRound(rnd)}
                                  title="ดูรายละเอียดกล้องทุกตัวในรอบนี้"
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRound(rnd.roundKey)}
                                  title="ลบทั้งรอบนี้"
                                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal: View Cameras for Round */}
            {activeViewRound && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 md:p-4 animate-fade-in">
                <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div>
                      <h3 className="text-base md:text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-blue-600" />
                        ผลการตรวจมุมกล้อง: อาคาร {activeViewRound.building} {activeViewRound.nvr}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        วันที่: {new Date(activeViewRound.checkDate).toLocaleDateString('th-TH')} | ผู้ตรวจ:{' '}
                        <span className="font-semibold text-slate-700">{activeViewRound.checkedBy}</span> | ผ่าน{' '}
                        <span className="font-bold text-emerald-600">
                          {activeViewRound.passedCameras}/{activeViewRound.totalCameras}
                        </span>{' '}
                        กล้อง
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveViewRound(null)}
                      className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {activeViewRound.cameras.map((cam, idx) => {
                        const chMatch = cam.remark?.match(/CH-(\d+)/i) || cam.cameraNo?.match(/(\d+)$/);
                        const ch = chMatch ? parseInt(chMatch[1], 10) : idx + 1;
                        const nvrDigits = activeViewRound.nvr.replace(/\D/g, '');
                        const imgKey = `${activeViewRound.building}-${nvrDigits}-${ch}`;
                        const imgSrc = imageMap[imgKey];

                        return (
                          <div
                            key={cam.id}
                            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-between gap-1.5 ${
                              cam.isPass ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-300 shadow-sm'
                            }`}
                          >
                            <div className="w-full flex justify-between items-center text-[11px]">
                              <span className="font-bold text-slate-800">CH-{ch < 10 ? `0${ch}` : ch}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold ${
                                  cam.isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {cam.isPass ? '✓ ปกติ' : '✕ ผิดมุม'}
                              </span>
                            </div>

                            <div className="w-full aspect-video bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center relative">
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={`CH-${ch}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Camera className="w-6 h-6 text-slate-400" />
                              )}
                            </div>

                            <div className="w-full text-[10px] text-slate-500 truncate text-center" title={cam.cameraName}>
                              {cam.cameraName || `Camera ${ch}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 md:p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                      onClick={() => setActiveViewRound(null)}
                      className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs md:text-sm"
                    >
                      ปิดหน้าต่าง
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CREATE MODE */
          <>
            {/* Checker Name */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อผู้ที่ส่งรายงาน</label>
              <div className="relative">
                <input type="text" placeholder="ชื่อ-นามสกุล" value={checkerName} onChange={e => setCheckerName(e.target.value)} className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                <MicButton onResult={(t) => setCheckerName(prev => prev ? prev + ' ' + t : t)} />
              </div>
            </div>

            {/* Building Selector — Segmented Control Style */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">เลือกอาคาร</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {Object.entries(BUILDING_META).map(([bldg, meta]) => {
                  const isActive = selectedBuilding === bldg;
                  const totalCameras = (NVR_CAMERA_CONFIG[bldg] || []).reduce((a, b) => a + b, 0);
                  return (
                    <button
                      key={bldg}
                      onClick={() => setSelectedBuilding(bldg)}
                      className={`flex-1 relative rounded-xl p-4 text-left transition-all duration-200 border-2 ${
                        isActive
                          ? `bg-gradient-to-br ${meta.gradient} text-white border-transparent shadow-lg ${meta.shadow}`
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-lg md:text-xl font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}>
                            {bldg}
                          </div>
                          <div className={`text-[10px] md:text-xs ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                            {NVR_CAMERA_CONFIG[bldg]?.length || 0} NVRs · {totalCameras} กล้อง
                          </div>
                        </div>
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-slate-100'
                        }`}>
                          <Cctv className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NVR Selector — Scrollable Grid */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cctv className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    เลือก NVR — อาคาร {selectedBuilding}
                  </span>
                </div>
                <span className="text-[10px] md:text-xs text-slate-400">
                  {nvrCount} NVRs · {channelCount} ช่อง/กล้อง
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-10 gap-2">
                {Array.from({ length: nvrCount }, (_, i) => {
                  const nvrNumLocal = i + 1;
                  const nvrLabel = `NVR-${nvrNumLocal}`;
                  const isActive = selectedNvr === nvrLabel;
                  const camCount = (NVR_CAMERA_CONFIG[selectedBuilding] || [])[i] || 0;
                  return (
                    <button
                      key={nvrLabel}
                      onClick={() => setSelectedNvr(nvrLabel)}
                      className={`relative rounded-xl py-3 px-2 text-center transition-all duration-200 border-2 ${
                        isActive
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-500/25 scale-[1.02]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md'
                      }`}
                    >
                      <div className={`text-xs md:text-sm font-bold ${isActive ? 'text-white' : 'text-slate-700'}`}>
                        NVR-{nvrNumLocal}
                      </div>
                      <div className={`text-[9px] md:text-[10px] mt-0.5 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                        {camCount} กล้อง
                      </div>
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-md flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Channel Grid */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-800">
                    📷 อาคาร {selectedBuilding} — {selectedNvr}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">คลิกการ์ดเพื่อสลับสถานะ · {channelCount} กล้อง</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-semibold">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    {Object.values(channelStatuses).filter(s => s === 'correct').length || channelCount}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg font-semibold">
                    <span className="w-2 h-2 bg-rose-500 rounded-full" />
                    {Object.values(channelStatuses).filter(s => s === 'incorrect').length}
                  </span>
                </div>
              </div>

              {loadingImages ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                  <span className="text-slate-400 text-sm">กำลังโหลดภาพ...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-3">
                  {Array.from({ length: channelCount }, (_, i) => i + 1).map((ch) => {
                    const isCorrect = (channelStatuses[ch] || 'correct') === 'correct';
                    const imgKey = `${selectedBuilding}-${nvrNum}-${ch}`;
                    const imgSrc = displayImageMap[imgKey];
                    return (
                      <div
                        key={ch}
                        className={`group relative rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                          isCorrect
                            ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/10'
                            : 'border-rose-200 bg-rose-50/50 hover:border-rose-400 hover:shadow-md hover:shadow-rose-500/10'
                        }`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-0.5 ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div className="p-2 md:p-2.5">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-[10px] md:text-xs text-slate-700">
                              CH-{ch < 10 ? `0${ch}` : ch}
                            </span>
                            <span className={`text-[8px] md:text-[9px] px-1 py-0.5 rounded font-bold ${
                              isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {isCorrect ? '✓' : '✕'}
                            </span>
                          </div>
                          <div onClick={() => toggleStatus(ch)} className="w-full aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer">
                            {imgSrc ? (
                              <img src={imgSrc} alt={`CH-${ch}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            ) : (
                              <Camera className="w-5 h-5 md:w-6 md:h-6 text-slate-300" />
                            )}
                          </div>
                          <button onClick={()=>openChannelModal(ch)} className="mt-1.5 w-full text-[9px] md:text-[10px] py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-medium text-slate-600">🔍 ดูภาพอ้างอิง</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 md:pt-6 flex justify-center">
                <button onClick={handleSave} disabled={loading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 md:px-12 rounded-xl sm:rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50 text-sm md:text-base min-h-[44px] flex items-center justify-center">
                  {loading ? 'กำลังบันทึก...' : '💾 บันทึกผลการตรวจมุมกล้อง'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Image Reference Modal */}
        {selectedChannel !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setSelectedChannel(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
              <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-bold text-slate-800">อาคาร {selectedBuilding} {selectedNvr} — CH-{selectedChannel < 10 ? `0${selectedChannel}` : selectedChannel}</h3>
                  <button onClick={()=>setSelectedChannel(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">✕</button>
                </div>
                <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden mb-3">
                  {(() => {
                    const imgKey = `${selectedBuilding}-${nvrNum}-${selectedChannel}`;
                    const src = imageMap[imgKey];
                    return src ? <img src={src} alt={`CH-${selectedChannel}`} className="w-full h-full object-contain" /> : <Camera className="w-10 h-10 text-slate-300" />;
                  })()}
                </div>
                {/* Toggle */}
                <div className="flex gap-2 mb-3">
                  <button onClick={()=>setChannelStatuses(prev=>({...prev,[selectedChannel]:'correct'}))} className={`flex-1 py-2 rounded-xl font-bold text-sm border-2 ${(channelStatuses[selectedChannel]||'correct')==='correct'?'bg-emerald-500 text-white border-emerald-500':'bg-white text-emerald-600 border-emerald-200'}`}>✓ มุมถูกต้อง</button>
                  <button onClick={()=>setChannelStatuses(prev=>({...prev,[selectedChannel]:'incorrect'}))} className={`flex-1 py-2 rounded-xl font-bold text-sm border-2 ${(channelStatuses[selectedChannel]||'correct')==='incorrect'?'bg-rose-500 text-white border-rose-500':'bg-white text-rose-600 border-rose-200'}`}>✕ ไม่ถูกต้อง</button>
                </div>
                <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุ</label>
                <div className="relative mb-3">
                  <textarea value={channelRemarks[selectedChannel]||''} onChange={e=>setChannelRemarks(prev=>({...prev,[selectedChannel]:e.target.value}))} placeholder="พิมพ์หมายเหตุ..." className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[60px]" />
                  <MicButton onResult={(t)=>setChannelRemarks(prev=>({...prev,[selectedChannel]:(prev[selectedChannel] ? prev[selectedChannel]+' '+t : t)}))} />
                </div>
                <button onClick={saveSingleChannel} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-50">💾 บันทึกเฉพาะกล้องนี้</button>
              </div>
            </div>
          </div>
        )}

        {/* นำเข้าชื่อกล้อง (CSV) — collapsible, อยู่ล่างสุด ไม่บัง flow หลัก */}
        <CameraImportPanel buildings={buildings} onImported={fetchCameras} />

      </div>
    </div>
  );
}
