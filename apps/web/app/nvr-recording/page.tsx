'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Radio } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface NvrDevice {
  id: number;
  buildingId: number;
  nvrName: string;
  ipAddress: string | null;
  totalChannels: number;
}

interface NvrRecording {
  id: number;
  nvrId: number;
  recordDate: string;
  daysRecorded: number;
  status: string;
  remark: string | null;
}

interface Building {
  id: number;
  name: string;
  code: string;
}

export default function NvrRecordingPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [nvrDevices, setNvrDevices] = useState<NvrDevice[]>([]);
  const [recordings, setRecordings] = useState<NvrRecording[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [loading, setLoading] = useState(true);
  const [recordingDays, setRecordingDays] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<any>('/api/cctv/buildings'),
      apiFetch<any>('/api/cctv/nvr-devices'),
      apiFetch<any>('/api/cctv/nvr-recordings'),
    ]).then(([bRes, nRes, rRes]) => {
      const bldgs = bRes.data || [];
      setBuildings(bldgs);
      setNvrDevices(nRes.data || []);
      setRecordings(rRes.data || []);
      if (bldgs.length > 0) setSelectedBuilding(String(bldgs[0].id));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredNvrs = nvrDevices.filter((n) => String(n.buildingId) === selectedBuilding);

  const getLatestRecording = (nvrId: number): NvrRecording | undefined => {
    return recordings
      .filter((r) => r.nvrId === nvrId)
      .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())[0];
  };

  const handleDaysChange = (nvrId: number, val: string) => {
    setRecordingDays({ ...recordingDays, [nvrId]: val });
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
      setMessage(`บันทึกรายงาน NVR อาคาร ${buildings.find((b) => String(b.id) === selectedBuilding)?.code || ''} เรียบร้อยแล้ว`);
      const rRes = await apiFetch<any>('/api/cctv/nvr-recordings');
      setRecordings(rRes.data || []);
    } catch (e) {
      setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
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
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="บันทึกวันบันทึก NVR"
          subtitle="NVR Recording Days"
          icon={<Radio className="w-5 h-5 md:w-6 h-6 text-white" />}
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Building Tabs */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
          <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
            {buildings.map((bldg) => (
              <button
                key={bldg.id}
                onClick={() => setSelectedBuilding(String(bldg.id))}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-bold transition-all text-sm md:text-base ${selectedBuilding === String(bldg.id) ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                🏢 อาคาร {bldg.code || bldg.name}
              </button>
            ))}
          </div>
        </div>

        {/* NVR Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4 md:space-y-6">
          <h3 className="text-base md:text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 md:pb-3">
            📋 บันทึกจำนวนวันย้อนหลัง - อาคาร {buildings.find((b) => String(b.id) === selectedBuilding)?.code || ''} (เกณฑ์มาตรฐาน ≥62 วัน)
          </h3>

          {filteredNvrs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">ไม่พบข้อมูล NVR ในอาคารนี้</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNvrs.map((nvr) => {
                const latest = getLatestRecording(nvr.id);
                const valStr = recordingDays[nvr.id] || (latest ? String(latest.daysRecorded) : '');
                const valNum = Number(valStr);
                const isPassed = valStr !== '' && valNum >= 62;

                return (
                  <div key={nvr.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-base">{nvr.nvrName}</span>
                      <span className="text-xs text-slate-500">เกณฑ์มาตรฐาน: <strong className="text-blue-600">62 วัน</strong></span>
                    </div>
                    {nvr.ipAddress && (
                      <div className="text-xs text-slate-400">IP: {nvr.ipAddress} | Channels: {nvr.totalChannels}</div>
                    )}
                    {latest && (
                      <div className="text-xs text-slate-500">
                        ล่าสุด: {latest.recordDate} - <span className={latest.status === 'pass' ? 'text-emerald-600' : 'text-rose-600'}>{latest.daysRecorded} วัน ({latest.status})</span>
                      </div>
                    )}

                    <div className="flex gap-3 items-center">
                      <input
                        type="number"
                        placeholder="จำนวนวันที่บันทึกได้"
                        value={valStr}
                        onChange={(e) => handleDaysChange(nvr.id, e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {valStr !== '' && (
                        <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                          {isPassed ? '✓ ผ่านเกณฑ์' : '✕ ต่ำกว่าเกณฑ์'}
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 md:py-3.5 px-6 md:px-10 rounded-full shadow-lg transition-transform active:scale-95 text-sm md:text-base disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : '💾 บันทึกรายงาน NVR Recording Days'}
            </button>
          </div>
        </form>

        {/* History Table */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base md:text-lg font-bold text-slate-800">📊 ประวัติบันทึก NVR</h3>
            <button onClick={() => {
              const rows: string[][] = [['วันที่', 'เวลา', 'NVR', 'วันบันทึก', 'สถานะ']];
              recordings.filter(r => {
                const nvr = nvrDevices.find(n => n.id === r.nvrId);
                const bId = nvr?.buildingId;
                const bCode = buildings.find(b => String(b.id) === String(bId))?.code || '';
                return String(bId) === selectedBuilding;
              }).forEach(r => {
                const nvr = nvrDevices.find(n => n.id === r.nvrId);
                const d = new Date(r.recordDate);
                const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                rows.push([
                  r.recordDate, time, nvr?.nvrName || '', String(r.daysRecorded), r.status === 'pass' ? 'ผ่าน' : 'ต่ำกว่าเกณฑ์',
                ]);
              });
              const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = 'nvr_recording_history.csv';
              link.click();
            }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl transition-colors shadow-md flex items-center gap-2 text-sm"
            >
              📥 ส่งออก CSV
            </button>
          </div>

          {recordings.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">ยังไม่มีประวัติ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="text-xs uppercase bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">วันที่</th>
                    <th className="px-4 py-3">เวลา</th>
                    <th className="px-4 py-3">NVR</th>
                    <th className="px-4 py-3 text-center">วันบันทึก</th>
                    <th className="px-4 py-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {recordings
                    .filter(r => {
                      const nvr = nvrDevices.find(n => n.id === r.nvrId);
                      return nvr && String(nvr.buildingId) === selectedBuilding;
                    })
                    .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
                    .slice(0, 50)
                    .map(rec => {
                      const nvr = nvrDevices.find(n => n.id === rec.nvrId);
                      const d = new Date(rec.recordDate);
                      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                      const isPass = rec.daysRecorded >= 62;
                      return (
                        <tr key={rec.id} className="bg-white border-b hover:bg-slate-50">
                          <td className="px-4 py-3">{rec.recordDate}</td>
                          <td className="px-4 py-3 text-slate-500">{time}</td>
                          <td className="px-4 py-3 font-medium">{nvr?.nvrName || '-'}</td>
                          <td className={`px-4 py-3 text-center font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>{rec.daysRecorded}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isPass ? '✓ ผ่านเกณฑ์' : '✕ ต่ำกว่าเกณฑ์'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
