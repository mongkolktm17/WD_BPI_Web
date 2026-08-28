'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw, AlertTriangle, TrendingUp, Shield, Camera, Car, Radio } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

interface ApiStatsResponse {
  source: string;
  data: {
    timestamp: string;
    summary: {
      cctv: { total: number; normal: number; abnormal: number; uptimePercentage: string };
      parking: { activeParked: number };
      guards: { totalActive: number };
      equipment: { handheldNormal: number; walkthroughNormal: number };
    };
    recentActivityLogs: Array<{
      id: number;
      officerName: string;
      checkTime: string;
      location: string;
      status: string;
    }>;
  };
}

export default function StatsPage() {
  const [data, setData] = useState<ApiStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiFetch<ApiStatsResponse>('/api/stats');
      setData(result);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลสถิติได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">กำลังโหลดข้อมูลสถิติ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.data?.summary;
  const logs = data?.data?.recentActivityLogs || [];

  const cctvPie = summary ? [
    { name: 'ปกติ', value: summary.cctv.normal },
    { name: 'ผิดปกติ', value: summary.cctv.abnormal },
  ] : [];

  const equipmentPie = summary ? [
    { name: 'Handheld ปกติ', value: summary.equipment.handheldNormal },
    { name: 'Walkthrough ปกติ', value: summary.equipment.walkthroughNormal },
  ] : [];

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <PageHeader
          title="สถิติ"
          subtitle="Statistics"
          icon={<BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          backHref="/report-page"
          actions={
            <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-200">
              <RefreshCw className="w-4 h-4" />
              รีเฟรช
            </button>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 md:p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Camera className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">กล้องวงจรปิด</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-slate-800">{summary?.cctv.total || 0}</div>
            <div className="text-[10px] md:text-xs text-slate-500 mt-1">
              ปกติ <span className="text-emerald-600 font-semibold">{summary?.cctv.normal || 0}</span> / ผิดปกติ <span className="text-rose-600 font-semibold">{summary?.cctv.abnormal || 0}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 md:p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Car className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">ที่จอดรถ</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-slate-800">{summary?.parking.activeParked || 0}</div>
            <div className="text-[10px] md:text-xs text-slate-500 mt-1">คันที่จอดอยู่</div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 md:p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">เจ้าหน้าที่</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-slate-800">{summary?.guards.totalActive || 0}</div>
            <div className="text-[10px] md:text-xs text-slate-500 mt-1">เจ้าหน้าที่ปัจจุบัน</div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 md:p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                <Radio className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">เครื่องตรวจ</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-slate-800">
              {(summary?.equipment.handheldNormal || 0) + (summary?.equipment.walkthroughNormal || 0)}
            </div>
            <div className="text-[10px] md:text-xs text-slate-500 mt-1">
              Handheld <span className="text-violet-600 font-semibold">{summary?.equipment.handheldNormal || 0}</span> / Walkthrough <span className="text-violet-600 font-semibold">{summary?.equipment.walkthroughNormal || 0}</span>
            </div>
          </div>
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 md:p-6 shadow-lg">
            <h2 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-500" />
              สถานะกล้องวงจรปิด
            </h2>
            <div className="h-64 md:h-72">
              {cctvPie.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cctvPie} cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value" label={(props: any) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}>
                      {cctvPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">ไม่มีข้อมูล</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 md:p-6 shadow-lg">
            <h2 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-violet-500" />
              อุปกรณ์ตรวจจับโลหะ
            </h2>
            <div className="h-64 md:h-72">
              {equipmentPie.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={equipmentPie} cx="50%" cy="50%" outerRadius={85} paddingAngle={3} dataKey="value" label={(props: any) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}>
                      {equipmentPie.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">ไม่มีข้อมูล</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {logs.length > 0 && (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 md:p-6 shadow-lg">
            <h2 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              กิจกรรมล่าสุด
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">เจ้าหน้าที่</th>
                    <th className="px-4 py-3">เวลา</th>
                    <th className="px-4 py-3">สถานที่</th>
                    <th className="px-4 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{log.officerName}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(log.checkTime).toLocaleString('th-TH')}</td>
                      <td className="px-4 py-3 text-slate-600">{log.location}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          log.status === 'pass' || log.status === 'normal'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
