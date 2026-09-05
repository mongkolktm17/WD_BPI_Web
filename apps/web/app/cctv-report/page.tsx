'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import {
  Cctv,
  Building2,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Activity,
  FileSpreadsheet,
  Send,
  Check,
  X,
  SlidersHorizontal,
  User,
  History,
  ShieldCheck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Layers
} from 'lucide-react';

interface NvrItem {
  id: number;
  building: string;
  nvrName: string;
  area: string;
  channels: number;
  driveCapacity: string;
  totalCapacityTb: number;
  targetDays: number;
}

interface BuildingConfig {
  name: string;
  label: string;
  description: string;
  nvrs: NvrItem[];
}

interface NvrCol {
  building: string;
  nvrName: string;
  label: string;
  channels: number;
  area: string;
}

interface HistoryReport {
  id: number;
  report_time: string;
  building: string;
  username: string;
  total_channels: number;
  online_channels: number;
  offline_channels: number;
  online_percentage: number;
  details: Record<string, { online_channels: number; total_channels: number; channel_statuses?: Record<string, boolean> }>;
}

type ActiveTab = 'history' | 'monitor';

export default function CctvReportPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('history');
  const [currentBuilding, setCurrentBuilding] = useState<string>('B2');
  const [selectedNvrTab, setSelectedNvrTab] = useState<string>('all');
  const [buildingConfigs, setBuildingConfigs] = useState<Record<string, BuildingConfig>>({});
  const [allNvrs, setAllNvrs] = useState<NvrCol[]>([]);
  const [cameraNames, setCameraNames] = useState<Record<string, string>>({});
  const [channelStatus, setChannelStatus] = useState<Record<string, boolean>>({});
  const [reportHistory, setReportHistory] = useState<HistoryReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reporterName, setReporterName] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters for History Table
  const [historyBuildingFilter, setHistoryBuildingFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // 1. Fetch initial configuration and history
  const fetchConfigAndHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, matrixRes] = await Promise.allSettled([
        apiFetch<any>('/api/cctv/config'),
        apiFetch<any>('/api/cctv/reports/matrix?limit=60'),
      ]);

      let configs: Record<string, BuildingConfig> = {};
      let nvrsList: NvrCol[] = [];
      let camNames: Record<string, string> = {};

      if (configRes.status === 'fulfilled' && configRes.value) {
        const val = configRes.value.data ?? configRes.value;
        configs = val.buildingConfigs || {};
        nvrsList = val.allNvrs || [];
        camNames = val.cameraNames || {};
        setBuildingConfigs(configs);
        setAllNvrs(nvrsList);
        setCameraNames(camNames);
      }

      let history: HistoryReport[] = [];
      if (matrixRes.status === 'fulfilled' && matrixRes.value) {
        const val = matrixRes.value.data ?? matrixRes.value;
        history = val.reports || [];
        setReportHistory(history);
      }

      // Initialize channels for default building
      initializeChannelsForBuilding(currentBuilding, configs, history);
    } catch (err) {
      console.error('Failed to load CCTV data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentBuilding]);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setReporterName(u.fullName || u.username || 'System Admin');
      } else {
        setReporterName('System Admin');
      }
    } catch {
      setReporterName('System Admin');
    }
    fetchConfigAndHistory();
  }, []);

  // 2. Initialize Channels for a selected building
  const initializeChannelsForBuilding = (
    bldg: string,
    configs = buildingConfigs,
    history = reportHistory
  ) => {
    const config = configs[bldg];
    if (!config || !config.nvrs) return;

    const latestReportForBuilding = history.find((report) => report.building?.toUpperCase() === bldg.toUpperCase());
    const newStatus: Record<string, boolean> = {};

    config.nvrs.forEach((nvr) => {
      const nvrDetail = latestReportForBuilding?.details?.[nvr.nvrName];
      const savedStatuses = nvrDetail?.channel_statuses;

      for (let i = 1; i <= nvr.channels; i++) {
        const channelId = `${bldg}-nvr${nvr.id}-ch${i}`;
        if (savedStatuses && savedStatuses[i.toString()] !== undefined) {
          newStatus[channelId] = Boolean(savedStatuses[i.toString()]);
        } else {
          newStatus[channelId] = true;
        }
      }
    });

    setChannelStatus((prev) => ({ ...prev, ...newStatus }));
  };

  // Switch building tab
  const handleSelectBuilding = (bldg: string) => {
    setCurrentBuilding(bldg);
    setSelectedNvrTab('all');
    initializeChannelsForBuilding(bldg);
  };

  // Channel Toggle
  const handleToggleChannel = (channelId: string) => {
    setChannelStatus((prev) => ({
      ...prev,
      [channelId]: !prev[channelId],
    }));
  };

  // Quick Action: Set all channels in building to Online
  const handleSetAllOnline = () => {
    const config = buildingConfigs[currentBuilding];
    if (!config) return;
    const update: Record<string, boolean> = {};
    config.nvrs.forEach((nvr) => {
      for (let i = 1; i <= nvr.channels; i++) {
        update[`${currentBuilding}-nvr${nvr.id}-ch${i}`] = true;
      }
    });
    setChannelStatus((prev) => ({ ...prev, ...update }));
    showToast('success', `ตั้งค่ากล้องทั้งหมดในอาคาร ${currentBuilding} เป็น ออนไลน์`);
  };

  // Quick Action: Set all channels in building to Offline
  const handleSetAllOffline = () => {
    const config = buildingConfigs[currentBuilding];
    if (!config) return;
    const update: Record<string, boolean> = {};
    config.nvrs.forEach((nvr) => {
      for (let i = 1; i <= nvr.channels; i++) {
        update[`${currentBuilding}-nvr${nvr.id}-ch${i}`] = false;
      }
    });
    setChannelStatus((prev) => ({ ...prev, ...update }));
    showToast('error', `ตั้งค่ากล้องทั้งหมดในอาคาร ${currentBuilding} เป็น ออฟไลน์`);
  };

  // Quick Action: Set all channels in a specific NVR
  const handleSetNvrAll = (nvrId: number, channels: number, state: boolean) => {
    const update: Record<string, boolean> = {};
    for (let i = 1; i <= channels; i++) {
      update[`${currentBuilding}-nvr${nvrId}-ch${i}`] = state;
    }
    setChannelStatus((prev) => ({ ...prev, ...update }));
  };

  // Quick Action: Simulate Random statuses
  const handleSimulateRandom = () => {
    const config = buildingConfigs[currentBuilding];
    if (!config) return;
    const update: Record<string, boolean> = {};
    config.nvrs.forEach((nvr) => {
      for (let i = 1; i <= nvr.channels; i++) {
        update[`${currentBuilding}-nvr${nvr.id}-ch${i}`] = Math.random() > 0.04;
      }
    });
    setChannelStatus((prev) => ({ ...prev, ...update }));
    showToast('success', `จำลองสถานะกล้องอาคาร ${currentBuilding} เรียบร้อยแล้ว`);
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live Calculation for current building
  const currentStats = useMemo(() => {
    const config = buildingConfigs[currentBuilding];
    if (!config || !config.nvrs) {
      return { total: 0, online: 0, offline: 0, percentage: 100, nvrStats: {} as Record<string, { online_channels: number; total_channels: number; percentage: number }> };
    }

    let total = 0;
    let online = 0;
    const nvrStats: Record<string, { online_channels: number; total_channels: number; percentage: number }> = {};
    const fullChannelStatusByNVR: Record<string, Record<string, boolean>> = {};

    config.nvrs.forEach((nvr) => {
      let nvrOnline = 0;
      const nvrStatusMap: Record<string, boolean> = {};
      for (let i = 1; i <= nvr.channels; i++) {
        const chId = `${currentBuilding}-nvr${nvr.id}-ch${i}`;
        const isChOnline = channelStatus[chId] !== undefined ? channelStatus[chId] : true;
        if (isChOnline) nvrOnline++;
        nvrStatusMap[i.toString()] = isChOnline;
      }
      total += nvr.channels;
      online += nvrOnline;
      nvrStats[nvr.nvrName] = {
        online_channels: nvrOnline,
        total_channels: nvr.channels,
        percentage: parseFloat(((nvrOnline / nvr.channels) * 100).toFixed(1)),
      };
      fullChannelStatusByNVR[nvr.nvrName] = nvrStatusMap;
    });

    const offline = total - online;
    const percentage = total > 0 ? parseFloat(((online / total) * 100).toFixed(2)) : 100;

    return {
      total,
      online,
      offline,
      percentage,
      nvrStats,
      fullChannelStatusByNVR,
    };
  }, [buildingConfigs, currentBuilding, channelStatus]);

  // Submit Report
  const handleSubmitReport = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const payload = {
        building: currentBuilding,
        reporterName: reporterName.trim() || 'System Admin',
        stats: currentStats,
      };

      const res = await apiFetch<any>('/api/cctv/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res) {
        showToast('success', `บันทึกรายงานสถานะ NVR อาคาร ${currentBuilding} เรียบร้อยแล้ว`);
        const matrixRes = await apiFetch<any>('/api/cctv/reports/matrix?limit=60');
        if (matrixRes) {
          const val = matrixRes.data ?? matrixRes;
          setReportHistory(val.reports || []);
        }
        setActiveTab('history');
      }
    } catch (err: any) {
      console.error('Failed to submit CCTV report:', err);
      showToast('error', `เกิดข้อผิดพลาดในการบันทึก: ${err.message || 'Error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!reportHistory || reportHistory.length === 0) {
      showToast('error', 'ไม่พบข้อมูลประวัติสำหรับส่งออก');
      return;
    }

    const nvrHeaders = allNvrs.map((n) => `"${n.label}"`).join(',');
    let csv = `\uFEFF"วันที่","เวลา","อาคาร","ผู้รายงาน","ออนไลน์/ทั้งหมด","เปอร์เซ็นต์",${nvrHeaders}\n`;

    filteredHistory.forEach((row) => {
      const dt = new Date(row.report_time);
      const dateStr = dt.toLocaleDateString('th-TH');
      const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const bldg = row.building || '-';
      const user = row.username || 'N/A';
      const onTotal = `${row.online_channels}/${row.total_channels}`;
      const pct = `${row.online_percentage}%`;

      const nvrVals = allNvrs.map((nvr) => {
        if (nvr.building === row.building && row.details?.[nvr.nvrName]) {
          const det = row.details[nvr.nvrName];
          return `"${det.online_channels}/${det.total_channels}"`;
        }
        return `"-"`;
      });

      csv += `"${dateStr}","${timeStr}","${bldg}","${user}","${onTotal}","${pct}",${nvrVals.join(',')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cctv_report_history_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('success', 'ดาวน์โหลดไฟล์ CSV สำเร็จ');
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return reportHistory.filter((item) => {
      const matchBuilding =
        historyBuildingFilter === 'ALL' || item.building?.toUpperCase() === historyBuildingFilter.toUpperCase();
      const matchSearch =
        !searchQuery ||
        (item.username && item.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.building && item.building.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchBuilding && matchSearch;
    });
  }, [reportHistory, historyBuildingFilter, searchQuery]);

  // Paginated History
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage]);

  const currentConfig = buildingConfigs[currentBuilding];
  const activeNvrs = useMemo(() => {
    if (!currentConfig?.nvrs) return [];
    if (selectedNvrTab === 'all') return currentConfig.nvrs;
    return currentConfig.nvrs.filter((n) => n.nvrName === selectedNvrTab);
  }, [currentConfig, selectedNvrTab]);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800 shadow-slate-900/20'
                : 'bg-rose-900 text-white border-rose-800 shadow-rose-900/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
            {toastMessage.text}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto pt-5 px-4 sm:px-6 space-y-4">
        {/* Page Header */}
        <PageHeader
          title="รายงานสถานะกล้อง CCTV (NVR Report)"
          subtitle="ระบบตรวจสอบและบันทึกสถานะช่องสัญญาณกล้องวงจรปิดประจำอาคาร (Western Digital BPI)"
          icon={<Cctv className="w-6 h-6 text-white" />}
          backHref="/report-page"
          backLabel="กลับหน้ารายงาน"
          actions={
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                ประวัติการบันทึก
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('monitor')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'monitor'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cctv className="w-3.5 h-3.5" />
                บันทึกสถานะกล้อง
              </button>
            </div>
          }
        />

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: HISTORY MATRIX (Compact Single-Screen View)          */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
            {/* Filter & Action Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Building Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> อาคาร:
                </span>
                {['ALL', 'B2', 'B3', 'B4', 'B9'].map((bldg) => {
                  const isSelected = historyBuildingFilter === bldg;
                  return (
                    <button
                      key={bldg}
                      type="button"
                      onClick={() => {
                        setHistoryBuildingFilter(bldg);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {bldg === 'ALL' ? 'ทั้งหมด' : bldg}
                    </button>
                  );
                })}
              </div>

              {/* Search & Actions */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="ค้นหาผู้รายงาน..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none w-44"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchConfigAndHistory}
                  disabled={loading}
                  title="รีเฟรชประวัติ"
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  ส่งออก CSV
                </button>
              </div>
            </div>

            {/* Compact History Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse table-auto text-xs">
                <thead className="bg-slate-100/80 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">วันที่</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">เวลา</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">อาคาร</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ผู้รายงาน</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">ออนไลน์/ทั้งหมด</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">% ออนไลน์</th>
                    {allNvrs.map((nvr) => (
                      <th
                        key={`${nvr.building}-${nvr.nvrName}`}
                        className="py-2.5 px-1.5 text-center whitespace-nowrap text-[9px] text-slate-600 font-bold"
                        title={`${nvr.building} - ${nvr.nvrName} (${nvr.channels} CH)`}
                      >
                        {nvr.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map((row) => {
                      const dt = new Date(row.report_time);
                      const dateStr = dt.toLocaleDateString('th-TH');
                      const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 text-center whitespace-nowrap font-bold text-slate-900">
                            {dateStr}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap text-slate-500">
                            {timeStr}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                              {row.building}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-700 text-xs">
                            {row.username || 'N/A'}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap font-bold text-slate-800">
                            {row.online_channels}/{row.total_channels}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap font-bold text-slate-900">
                            {row.online_percentage}%
                          </td>
                          {allNvrs.map((nvr) => {
                            const isMatchBuilding = nvr.building.toUpperCase() === (row.building || '').toUpperCase();
                            const nvrData = row.details?.[nvr.nvrName];

                            let val = '-';
                            let colorClass = 'text-slate-300';

                            if (isMatchBuilding && nvrData) {
                              val = `${nvrData.online_channels}/${nvrData.total_channels}`;
                              colorClass =
                                nvrData.online_channels < nvrData.total_channels
                                  ? 'text-rose-600 font-bold bg-rose-50/60'
                                  : 'text-slate-800 font-semibold';
                            }

                            return (
                              <td
                                key={`${nvr.building}-${nvr.nvrName}`}
                                className={`py-2 px-1 text-center text-[10px] whitespace-nowrap ${colorClass}`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6 + allNvrs.length} className="py-10 text-center text-slate-400">
                        ไม่พบข้อมูลประวัติรายงานตามเงื่อนไข
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
              <span>
                แสดง {paginatedHistory.length} จากทั้งหมด {filteredHistory.length} รายการ (หน้า {currentPage}/{totalPages})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold text-slate-800">{currentPage}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 2: CAMERA STATUS MONITOR & SUBMISSION                   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'monitor' && (
          <div className="space-y-4">
            {/* Building Selector & Controls Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Building Segmented Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-xl">
                  {['B2', 'B3', 'B4', 'B9'].map((bldg) => {
                    const isSelected = currentBuilding === bldg;
                    const bConfig = buildingConfigs[bldg];
                    const nvrCount = bConfig?.nvrs?.length || 0;

                    return (
                      <button
                        key={bldg}
                        type="button"
                        onClick={() => handleSelectBuilding(bldg)}
                        className={`px-3 py-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                            <span className="text-xs font-bold">อาคาร {bldg}</span>
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {nvrCount} NVRs
                          </div>
                        </div>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSetAllOnline}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold text-xs transition-colors border border-slate-200/60"
                  >
                    <Check className="w-3.5 h-3.5 text-slate-600" />
                    ออนไลน์ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={handleSetAllOffline}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-800 text-slate-700 font-semibold text-xs transition-colors border border-slate-200/60"
                  >
                    <X className="w-3.5 h-3.5 text-slate-600" />
                    ออฟไลน์ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateRandom}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-200/60"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                    จำลองสถานะ
                  </button>
                </div>
              </div>
            </div>

            {/* 4 KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">ช่องทั้งหมด</p>
                  <p className="text-2xl font-extrabold text-slate-900">{currentStats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center">
                  <Cctv className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">ออนไลน์ (ปกติ)</p>
                  <p className="text-2xl font-extrabold text-slate-900">{currentStats.online}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">ออฟไลน์ (ขัดข้อง)</p>
                  <p className="text-2xl font-extrabold text-slate-900">{currentStats.offline}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-rose-600" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">ความพร้อมใช้งาน</p>
                  <p className="text-2xl font-extrabold text-slate-900">{currentStats.percentage}%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-slate-700" />
                </div>
              </div>
            </div>

            {/* NVR Filter Pill Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 flex-shrink-0">
                  <Layers className="w-3.5 h-3.5" /> เลือก NVR:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedNvrTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                    selectedNvrTab === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ทั้งหมด ({currentConfig?.nvrs?.length || 0} เครื่อง)
                </button>
                {currentConfig?.nvrs?.map((nvr) => {
                  const stat = currentStats.nvrStats[nvr.nvrName] || {
                    online_channels: nvr.channels,
                    total_channels: nvr.channels,
                  };
                  const isSelected = selectedNvrTab === nvr.nvrName;
                  const isAllOk = stat.online_channels === stat.total_channels;

                  return (
                    <button
                      key={nvr.id}
                      type="button"
                      onClick={() => setSelectedNvrTab(nvr.nvrName)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Server className="w-3 h-3 text-slate-400" />
                      {nvr.nvrName}
                      <span
                        className={`text-[10px] px-1 rounded ${
                          isAllOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {stat.online_channels}/{stat.total_channels}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NVR Camera Channel Grids */}
            <div className="space-y-4">
              {activeNvrs.map((nvr) => {
                const stat = currentStats.nvrStats[nvr.nvrName] || {
                  online_channels: nvr.channels,
                  total_channels: nvr.channels,
                  percentage: 100,
                };
                const isAllOk = stat.online_channels === stat.total_channels;

                return (
                  <div
                    key={nvr.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                          <Server className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{nvr.nvrName}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                          {nvr.channels} CH
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isAllOk
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {stat.online_channels}/{stat.total_channels} ช่อง ({stat.percentage}%)
                        </span>
                        <span className="text-xs text-slate-500 ml-2 hidden md:inline truncate max-w-sm" title={nvr.area}>
                          พื้นที่: {nvr.area}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleSetNvrAll(nvr.id, nvr.channels, true)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-slate-600" /> ออนไลน์ทั้งหมด
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetNvrAll(nvr.id, nvr.channels, false)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3 text-slate-600" /> ออฟไลน์ทั้งหมด
                        </button>
                      </div>
                    </div>

                    {/* Channels */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {Array.from({ length: nvr.channels }, (_, idx) => idx + 1).map((chNum) => {
                        const channelId = `${currentBuilding}-nvr${nvr.id}-ch${chNum}`;
                        const isOnline = channelStatus[channelId] !== undefined ? channelStatus[channelId] : true;
                        const cameraKey = `${currentBuilding}_${nvr.nvrName}_${chNum}`;
                        const camName = cameraNames[cameraKey] || `CH-${chNum.toString().padStart(2, '0')}`;

                        return (
                          <button
                            key={chNum}
                            type="button"
                            onClick={() => handleToggleChannel(channelId)}
                            title={`คลิกเพื่อสลับสถานะ: ${camName}`}
                            className={`p-2 rounded-xl text-left border transition-all duration-150 select-none flex flex-col justify-between h-[64px] ${
                              isOnline
                                ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-sm'
                                : 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-xs font-black ${isOnline ? 'text-slate-100' : 'text-rose-900'}`}>
                                #{chNum}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isOnline ? 'bg-emerald-400' : 'bg-rose-500 ring-2 ring-rose-300'
                                }`}
                              />
                            </div>
                            <div
                              className={`text-[10px] font-medium leading-tight line-clamp-2 mt-0.5 ${
                                isOnline ? 'text-slate-300' : 'text-rose-800'
                              }`}
                            >
                              {camName}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inline Submit Report Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-slate-800" />
                  <span className="text-xs font-bold text-slate-800">
                    บันทึกรายงานสถานะ NVR อาคาร {currentBuilding}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="ชื่อผู้ตรวจสอบ..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitReport}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'กำลังบันทึก...' : 'ส่งรายงาน'}
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
