'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import MicButton from '@/components/MicButton';
import { RefreshCw, Camera, Eye, Edit, Building2, Cctv } from 'lucide-react';
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
  const [viewReports, setViewReports] = useState<CameraCheckRecord[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
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
      const res = await apiFetch<{ success: boolean; data: CameraCheckRecord[] }>(`/api/cctv/camera-checks?limit=200`);
      setViewReports(res.data || []);
    } catch {
      setViewReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [mode]);

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
      const ch = getChannelFromRemark(r.remark);
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
          /* VIEW MODE */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6">
              <h3 className="text-base md:text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                📋 รายงานตรวจสอบมุมกล้องย้อนหลัง
              </h3>
              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                  <span className="text-slate-400 text-sm">กำลังโหลดรายงาน...</span>
                </div>
              ) : viewReports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">ไม่พบรายการตรวจสอบมุมกล้อง</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">วันที่</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">กล้อง</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">สถานะ</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">หมายเหตุ</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">ชื่อผู้ที่ส่งรายงาน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewReports.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-700">{new Date(r.checkDate).toLocaleDateString('th-TH')}</td>
                          <td className="py-2 px-3 text-slate-700">{r.camera.cameraName || `Camera ${r.camera.cameraNo}`}</td>
                          <td className="py-2 px-3">{getStatusBadge(r.status)}</td>
                          <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{r.remark}</td>
                          <td className="py-2 px-3 text-slate-700 font-medium">{r.checkedBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
              <div className="flex gap-3">
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
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
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
                <button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 md:py-3.5 px-6 md:px-10 rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50 text-sm md:text-base">
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

      </div>
    </div>
  );
}
