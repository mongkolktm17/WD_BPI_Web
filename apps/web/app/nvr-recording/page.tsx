'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Radio, Eye, Trash2, Edit3, X, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface NvrDevice {
  id: number;
  buildingId: number;
  nvrName: string;
  ipAddress: string | null;
  totalChannels: number;
}

interface Building {
  id: number;
  buildingName?: string;
  buildingCode?: string;
  name?: string;
  code?: string;
  description?: string;
}

interface NvrRoundItem {
  id?: number;
  nvrId?: number;
  building: string;
  nvrName: string;
  daysRecorded: number;
  targetDays?: number;
  status: string;
}

interface NvrRoundReport {
  id: string;
  submissionId: string;
  reportTime: string;
  recordDate: string;
  submittedBy: string;
  submittedById?: number;
  totalNvrs: number;
  passedNvrs: number;
  failedNvrs: number;
  isAllPassed: boolean;
  nvrs: Record<string, NvrRoundItem>;
  _legacy?: boolean;
}

// Ordered list of all 19 NVRs across all buildings
const ALL_NVRS = [
  { building: 'B2', nvrName: 'NVR-1', key: 'B2_NVR-1', label: 'B2-N1' },
  { building: 'B2', nvrName: 'NVR-2', key: 'B2_NVR-2', label: 'B2-N2' },
  { building: 'B2', nvrName: 'NVR-3', key: 'B2_NVR-3', label: 'B2-N3' },
  { building: 'B2', nvrName: 'NVR-4', key: 'B2_NVR-4', label: 'B2-N4' },
  { building: 'B2', nvrName: 'NVR-5', key: 'B2_NVR-5', label: 'B2-N5' },
  { building: 'B2', nvrName: 'NVR-6', key: 'B2_NVR-6', label: 'B2-N6' },
  { building: 'B2', nvrName: 'NVR-7', key: 'B2_NVR-7', label: 'B2-N7' },
  { building: 'B2', nvrName: 'NVR-8', key: 'B2_NVR-8', label: 'B2-N8' },
  { building: 'B2', nvrName: 'NVR-9', key: 'B2_NVR-9', label: 'B2-N9' },
  { building: 'B2', nvrName: 'NVR-10', key: 'B2_NVR-10', label: 'B2-N10' },
  { building: 'B3', nvrName: 'NVR-1', key: 'B3_NVR-1', label: 'B3-N1' },
  { building: 'B3', nvrName: 'NVR-2', key: 'B3_NVR-2', label: 'B3-N2' },
  { building: 'B4', nvrName: 'NVR-1', key: 'B4_NVR-1', label: 'B4-N1' },
  { building: 'B4', nvrName: 'NVR-2', key: 'B4_NVR-2', label: 'B4-N2' },
  { building: 'B4', nvrName: 'NVR-3', key: 'B4_NVR-3', label: 'B4-N3' },
  { building: 'B4', nvrName: 'NVR-4', key: 'B4_NVR-4', label: 'B4-N4' },
  { building: 'B4', nvrName: 'NVR-5', key: 'B4_NVR-5', label: 'B4-N5' },
  { building: 'B4', nvrName: 'NVR-6', key: 'B4_NVR-6', label: 'B4-N6' },
  { building: 'B9', nvrName: 'NVR-1', key: 'B9_NVR-1', label: 'B9-N1' },
];

export default function NvrRecordingPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [nvrDevices, setNvrDevices] = useState<NvrDevice[]>([]);
  const [rounds, setRounds] = useState<NvrRoundReport[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [historyBuildingFilter, setHistoryBuildingFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [recordingDays, setRecordingDays] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Detail / Edit State
  const [activeModalRound, setActiveModalRound] = useState<NvrRoundReport | null>(null);
  const [editRoundData, setEditRoundData] = useState<Record<string, number>>({});
  const [isUpdatingRound, setIsUpdatingRound] = useState(false);

  const fetchRounds = async () => {
    try {
      const res = await apiFetch<any>('/api/cctv/nvr-recordings/rounds?limit=100');
      const data = res?.data ?? res ?? [];
      setRounds(Array.isArray(data) ? data : []);
    } catch {
      setRounds([]);
    }
  };

  useEffect(() => {
    Promise.all([
      apiFetch<any>('/api/cctv/buildings'),
      apiFetch<any>('/api/cctv/nvr-devices'),
      apiFetch<any>('/api/cctv/nvr-recordings/rounds?limit=100'),
    ])
      .then(([bRes, nRes, rRes]) => {
        const bldgs = bRes.data || [];
        setBuildings(bldgs);
        setNvrDevices(nRes.data || []);
        const rData = rRes?.data ?? rRes ?? [];
        setRounds(Array.isArray(rData) ? rData : []);
        if (bldgs.length > 0) setSelectedBuilding(String(bldgs[0].id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredNvrs = nvrDevices.filter((n) => String(n.buildingId) === selectedBuilding);

  const getLatestRecordingDays = (nvr: NvrDevice): number | null => {
    const bldg = buildings.find((b) => b.id === nvr.buildingId);
    const bCode = (bldg?.buildingCode || bldg?.code || 'B2').toUpperCase();
    const key = `${bCode}_${nvr.nvrName}`;
    for (const rnd of rounds) {
      if (rnd.nvrs && rnd.nvrs[key] && rnd.nvrs[key].daysRecorded !== undefined) {
        return rnd.nvrs[key].daysRecorded;
      }
    }
    return null;
  };

  const handleDaysChange = (nvrId: number, val: string) => {
    setRecordingDays({ ...recordingDays, [nvrId]: val });
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!confirm(`ยืนยันการลบรายงานรอบ ${roundId} ทั้งหมด?`)) return;
    try {
      await apiFetch(`/api/cctv/nvr-recordings/rounds/${roundId}`, { method: 'DELETE' });
      setMessage('✅ ลบรายงานรอบเรียบร้อยแล้ว');
      await fetchRounds();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการลบข้อมูลรอบ');
    }
  };

  const openDetailModal = (rnd: NvrRoundReport) => {
    setActiveModalRound(rnd);
    const initialEdits: Record<string, number> = {};
    ALL_NVRS.forEach((col) => {
      if (rnd.nvrs && rnd.nvrs[col.key]) {
        initialEdits[col.key] = rnd.nvrs[col.key].daysRecorded;
      }
    });
    setEditRoundData(initialEdits);
  };

  const handleSaveModalRound = async () => {
    if (!activeModalRound) return;
    setIsUpdatingRound(true);
    try {
      await apiFetch(`/api/cctv/nvr-recordings/rounds/${activeModalRound.id}`, {
        method: 'PUT',
        body: JSON.stringify(editRoundData),
      });
      setMessage('✅ อัปเดตข้อมูลรอบบันทึกเรียบร้อยแล้ว');
      setActiveModalRound(null);
      await fetchRounds();
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsUpdatingRound(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const batch = filteredNvrs.map((nvr) => {
        const days = Number(recordingDays[nvr.id] || 0);
        return apiFetch('/api/cctv/nvr-recordings', {
          method: 'POST',
          body: JSON.stringify({
            nvrId: nvr.id,
            recordDate: today,
            daysRecorded: days,
            status: days >= 62 ? 'pass' : 'fail',
          }),
        });
      });
      await Promise.all(batch);
      setMessage(`บันทึกรายงาน NVR อาคาร ${buildings.find((b) => String(b.id) === selectedBuilding)?.buildingCode || buildings.find((b) => String(b.id) === selectedBuilding)?.code || ''} เรียบร้อยแล้ว`);
      await fetchRounds();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  // Filter columns based on historyBuildingFilter
  const displayColumns = ALL_NVRS.filter(
    (col) => historyBuildingFilter === 'ALL' || col.building === historyBuildingFilter
  );

  const exportCsv = () => {
    const header = ['วันที่', 'เวลา', 'ผู้รายงาน', 'ผลรวม', ...displayColumns.map((c) => c.key)];
    const rows = rounds.map((rnd) => {
      const d = new Date(rnd.reportTime || rnd.recordDate);
      const dateStr = rnd.recordDate || d.toLocaleDateString('th-TH');
      const timeStr = isNaN(d.getTime()) ? '-' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const summaryStr = `${rnd.passedNvrs}/${rnd.totalNvrs} ผ่าน`;
      const cellValues = displayColumns.map((col) => {
        const item = rnd.nvrs?.[col.key];
        return item ? String(item.daysRecorded) : '-';
      });
      return [dateStr, timeStr, rnd.submittedBy || '-', summaryStr, ...cellValues];
    });

    const csvContent = '\uFEFF' + [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nvr_recording_matrix_${historyBuildingFilter.toLowerCase()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
        <div className="max-w-6xl mx-auto text-center py-20 text-slate-400">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <PageHeader
          title="บันทึกวันบันทึก NVR"
          subtitle="NVR Recording Days"
          icon={<Radio className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {message && (
          <div
            className={`p-4 rounded-xl text-center font-medium shadow ${
              message.includes('เรียบร้อย')
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {message}
          </div>
        )}

        {/* Building Tabs (For Creation) */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
          <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
            {buildings.map((bldg) => {
              const bCode = bldg.buildingCode || bldg.code || '';
              const bName = bldg.buildingName || bldg.name || `อาคาร ${bCode}`;
              const displayText = bName.includes(bCode) ? bName : `${bName} (${bCode})`;

              return (
                <button
                  key={bldg.id}
                  onClick={() => setSelectedBuilding(String(bldg.id))}
                  className={`px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-bold transition-all text-sm md:text-base flex items-center gap-2 shadow-sm ${
                    selectedBuilding === String(bldg.id)
                      ? 'bg-blue-600 text-white shadow-lg scale-105 ring-2 ring-blue-400/50'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-lg">🏢</span>
                  <span>{displayText}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* NVR Entry Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4 md:space-y-6"
        >
          <h3 className="text-base md:text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 md:pb-3 flex items-center gap-2">
            <span>📋 บันทึกจำนวนวันย้อนหลัง -</span>
            <span className="text-blue-600">
              {(() => {
                const currentBldg = buildings.find((b) => String(b.id) === selectedBuilding);
                if (!currentBldg) return '';
                const code = currentBldg.buildingCode || currentBldg.code || '';
                const name = currentBldg.buildingName || currentBldg.name || `อาคาร ${code}`;
                return name.includes(code) ? name : `${name} (${code})`;
              })()}
            </span>
            <span className="text-slate-500 font-normal text-xs md:text-sm">(เกณฑ์มาตรฐาน ≥62 วัน)</span>
          </h3>

          {filteredNvrs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">ไม่พบข้อมูล NVR ในอาคารนี้</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNvrs.map((nvr) => {
                const latestDays = getLatestRecordingDays(nvr);
                const valStr = recordingDays[nvr.id] ?? (latestDays !== null ? String(latestDays) : '');
                const valNum = Number(valStr);
                const isPassed = valStr !== '' && valNum >= 62;

                return (
                  <div key={nvr.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-base">{nvr.nvrName}</span>
                      <span className="text-xs text-slate-500">
                        เกณฑ์มาตรฐาน: <strong className="text-blue-600">62 วัน</strong>
                      </span>
                    </div>
                    {nvr.ipAddress && (
                      <div className="text-xs text-slate-400">
                        IP: {nvr.ipAddress} | Channels: {nvr.totalChannels}
                      </div>
                    )}
                    {latestDays !== null && (
                      <div className="text-xs text-slate-500">
                        ล่าสุด:{' '}
                        <span className={latestDays >= 62 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {latestDays} วัน ({latestDays >= 62 ? 'pass' : 'fail'})
                        </span>
                      </div>
                    )}

                    <div className="flex gap-3 items-center pt-1">
                      <input
                        type="number"
                        placeholder="จำนวนวันที่บันทึกได้"
                        value={valStr}
                        onChange={(e) => handleDaysChange(nvr.id, e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {valStr !== '' && (
                        <span
                          className={`text-xs px-2.5 py-1.5 rounded-full font-bold whitespace-nowrap ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isPassed ? '✓ ผ่าน' : '✕ ต่ำกว่า'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              disabled={saving || filteredNvrs.length === 0}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 md:px-12 rounded-xl sm:rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base disabled:opacity-50 min-h-[44px] flex items-center justify-center"
            >
              {saving ? 'กำลังบันทึก...' : '💾 บันทึกรายงาน NVR Recording Days'}
            </button>
          </div>
        </form>

        {/* History Table (Round-Grouped Matrix) */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base md:text-lg font-bold text-slate-800">
                📊 ประวัติบันทึก NVR ย้อนหลัง (สรุปรวมตามรอบรายงาน)
              </h3>
              <p className="text-xs text-slate-500">
                แสดงผล 1 แถวต่อ 1 รอบการตรวจ และกระจายคอลัมน์ NVR แต่ละตัว (ช่องสีแดงคือ &lt; 62 วัน)
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Building Filter for History */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                {['ALL', 'B2', 'B3', 'B4', 'B9'].map((b) => (
                  <button
                    key={b}
                    onClick={() => setHistoryBuildingFilter(b)}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      historyBuildingFilter === b ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'
                    }`}
                  >
                    {b === 'ALL' ? 'ทุกอาคาร' : b}
                  </button>
                ))}
              </div>

              <button
                onClick={exportCsv}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl transition-colors shadow-md flex items-center gap-1.5 text-xs md:text-sm"
              >
                📥 ส่งออก CSV
              </button>
            </div>
          </div>

          {rounds.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีประวัติการบันทึก NVR</div>
          ) : (
            <div className="overflow-x-auto mobile-table-scroll rounded-xl border border-slate-200 shadow-inner">
              <table className="w-full text-xs md:text-sm text-left text-slate-700 border-collapse min-w-[700px]">
                <thead className="text-[11px] md:text-xs uppercase bg-slate-100 text-slate-600 sticky top-0">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2.5 whitespace-nowrap">วันที่ตรวจ</th>
                    <th className="px-2 py-2.5 whitespace-nowrap">เวลา</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">ผู้รายงาน</th>
                    <th className="px-2 py-2.5 text-center whitespace-nowrap">ผลภาพรวม</th>
                    {displayColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-2 py-2.5 text-center border-l border-slate-200 whitespace-nowrap font-semibold"
                        title={`${col.building} - ${col.nvrName}`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rounds.map((rnd) => {
                    const d = new Date(rnd.reportTime || rnd.recordDate);
                    const dateStr = rnd.recordDate || (!isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '-');
                    const timeStr = !isNaN(d.getTime())
                      ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                      : '-';

                    return (
                      <tr key={rnd.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{dateStr}</td>
                        <td className="px-2 py-2.5 text-slate-500 whitespace-nowrap">{timeStr}</td>
                        <td className="px-3 py-2.5 text-slate-700 font-medium whitespace-nowrap">
                          {rnd.submittedBy || 'เจ้าหน้าที่'}
                        </td>
                        <td className="px-2 py-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              rnd.isAllPassed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {rnd.passedNvrs}/{rnd.totalNvrs} {rnd.isAllPassed ? '✓ ผ่าน' : 'ต่ำกว่า'}
                          </span>
                        </td>

                        {displayColumns.map((col) => {
                          const item = rnd.nvrs?.[col.key];
                          if (!item || item.daysRecorded === undefined) {
                            return (
                              <td key={col.key} className="px-2 py-2.5 text-center text-slate-300 border-l border-slate-100">
                                -
                              </td>
                            );
                          }
                          const isPass = item.daysRecorded >= 62;
                          return (
                            <td
                              key={col.key}
                              className={`px-2 py-2.5 text-center font-bold border-l border-slate-100 ${
                                isPass
                                  ? 'text-emerald-700 bg-emerald-50/30'
                                  : 'text-rose-600 bg-rose-50 font-extrabold'
                              }`}
                              title={`${col.label}: ${item.daysRecorded} วัน (${isPass ? 'ผ่าน' : 'ต่ำกว่าเกณฑ์ 62 วัน'})`}
                            >
                              {item.daysRecorded}
                            </td>
                          );
                        })}

                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openDetailModal(rnd)}
                              title="ดูรายละเอียดและแก้ไข"
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRound(rnd.id)}
                              title="ลบทั้งรอบรายงาน"
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

        {/* Modal: View & Edit Round Detail */}
        {activeModalRound && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 md:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-base md:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                    รายละเอียดรอบบันทึก: {activeModalRound.recordDate} ({activeModalRound.submittedBy})
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    รหัสรอบ: <span className="font-mono">{activeModalRound.id}</span> | สรุป:{' '}
                    <span className="font-bold text-blue-600">
                      {activeModalRound.passedNvrs}/{activeModalRound.totalNvrs} เครื่องผ่านเกณฑ์ (≥62 วัน)
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setActiveModalRound(null)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Matrix / Form */}
              <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_NVRS.map((nvrCol) => {
                    const existing = activeModalRound.nvrs?.[nvrCol.key];
                    const currentDays = editRoundData[nvrCol.key] ?? existing?.daysRecorded ?? 0;
                    const isPass = currentDays >= 62;

                    return (
                      <div
                        key={nvrCol.key}
                        className={`p-3 rounded-xl border transition-all ${
                          isPass
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-xs md:text-sm text-slate-800">
                            {nvrCol.building} - {nvrCol.nvrName}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPass ? '✓ ≥62 วัน' : '✕ ต่ำกว่า'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={currentDays}
                            onChange={(e) =>
                              setEditRoundData({
                                ...editRoundData,
                                [nvrCol.key]: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <span className="text-xs text-slate-500 whitespace-nowrap">วัน</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 md:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteRound(activeModalRound.id).then(() => setActiveModalRound(null))}
                  className="text-rose-600 hover:text-rose-700 font-bold text-xs md:text-sm flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" /> ลบรอบนี้
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalRound(null)}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs md:text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingRound}
                    onClick={handleSaveModalRound}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {isUpdatingRound ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

