'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useSite } from '@/lib/SiteContext';
import PageHeader from '@/components/PageHeader';
import MicButton from '@/components/MicButton';
import CollapsibleHistory from '@/components/CollapsibleHistory';
import ReportIncidentModal from '@/components/incidents/ReportIncidentModal';
import { type IncidentSeverity } from '@/lib/incident-service';
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
  ChevronDown,
  ChevronUp,
  Layers,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  MapPin,
  Clock,
  Radio,
  Eye,
  Camera,
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

type ActiveTab = 'monitor' | 'history';
type ViewMode = 'offline_only' | 'all';

const CCTV_REMARK_PRESETS = [
  'ระบบกล้องและ NVR ทำงานปกติ 100%',
  'พบสัญญาณภาพขาดหาย/กล้องดับ รอช่างไอทีตรวจสอบ',
  'สาย LAN ขาด / สวิตช์ POE ดับบางจุด',
  'มุมกล้องเคลื่อน / มีสิ่งบดบังทัศนวิสัย',
  'ตรวจสอบรอบเวรเรียบร้อย ไม่พบสิ่งผิดปกติ',
];

const DRAFT_KEY_PREFIX = 'wd_pwa_draft_cctv_report_';

export default function CctvReportPage() {
  const { currentSite } = useSite();

  const [activeTab, setActiveTab] = useState<ActiveTab>('monitor');
  const [currentBuilding, setCurrentBuilding] = useState<string>('B2');
  const [viewMode, setViewMode] = useState<ViewMode>('offline_only');
  const [selectedNvrTab, setSelectedNvrTab] = useState<string>('all');
  const [buildingConfigs, setBuildingConfigs] = useState<Record<string, BuildingConfig>>({});
  const [allNvrs, setAllNvrs] = useState<NvrCol[]>([]);
  const [cameraNames, setCameraNames] = useState<Record<string, string>>({});
  const [channelStatus, setChannelStatus] = useState<Record<string, boolean>>({});
  const [reportHistory, setReportHistory] = useState<HistoryReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reporterName, setReporterName] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedNvrs, setCollapsedNvrs] = useState<Record<string, boolean>>({});

  // Draft State
  const [hasDraftNotice, setHasDraftNotice] = useState<boolean>(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);

  // Incident Modal State
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [incidentPrefill, setIncidentPrefill] = useState<{
    type?: string;
    severity?: IncidentSeverity;
    location?: string;
    customLocation?: string;
    description?: string;
  }>({});

  // Filters for History Table
  const [historyBuildingFilter, setHistoryBuildingFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const draftKey = `${DRAFT_KEY_PREFIX}${currentBuilding}`;

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

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

      if (configs[currentBuilding]) {
        initializeChannelsForBuilding(currentBuilding, configs, history);
      }
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
  }, [fetchConfigAndHistory]);

  // Check for local draft on building change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.channelStatus || parsed.remarks)) {
          setHasDraftNotice(true);
          setLastSavedDraftTime(parsed._savedAt || 'ก่อนหน้านี้');
        }
      } else {
        setHasDraftNotice(false);
      }
    } catch {
      setHasDraftNotice(false);
    }
  }, [draftKey]);

  // Debounced auto-save draft
  useEffect(() => {
    if (Object.keys(channelStatus).length === 0) return;
    const timer = setTimeout(() => {
      try {
        const toSave = {
          channelStatus,
          remarks,
          _savedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        };
        localStorage.setItem(draftKey, JSON.stringify(toSave));
        setLastSavedDraftTime(toSave._savedAt);
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [channelStatus, remarks, draftKey]);

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.channelStatus) setChannelStatus(parsed.channelStatus);
        if (parsed.remarks) setRemarks(parsed.remarks);
        showToast('success', 'กู้คืนข้อมูลร่างล่าสุดเรียบร้อยแล้ว');
      }
    } catch {}
    setHasDraftNotice(false);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setHasDraftNotice(false);
    setLastSavedDraftTime(null);
    showToast('error', 'ลบข้อมูลร่างเรียบร้อยแล้ว');
  };

  // When switching to 'monitor' tab or buildingConfigs loaded, initialize channels
  useEffect(() => {
    if (activeTab === 'monitor' && Object.keys(buildingConfigs).length > 0) {
      initializeChannelsForBuilding(currentBuilding, buildingConfigs, reportHistory);
    }
  }, [activeTab, currentBuilding, buildingConfigs, reportHistory]);

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
        if (channelStatus[channelId] !== undefined) {
          newStatus[channelId] = channelStatus[channelId];
        } else if (savedStatuses && savedStatuses[i.toString()] !== undefined) {
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
    setSearchQuery('');
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
    showToast('success', `ตั้งค่ากล้องทั้งหมดในอาคาร ${currentBuilding} เป็น ปกติ (ออนไลน์)`);
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
    showToast('error', `ตั้งค่ากล้องทั้งหมดในอาคาร ${currentBuilding} เป็น ขัดข้อง (ออฟไลน์)`);
  };

  // Quick Action: Set all channels in a specific NVR
  const handleSetNvrAll = (nvrId: number, channels: number, state: boolean) => {
    const update: Record<string, boolean> = {};
    for (let i = 1; i <= channels; i++) {
      update[`${currentBuilding}-nvr${nvrId}-ch${i}`] = state;
    }
    setChannelStatus((prev) => ({ ...prev, ...update }));
    showToast(state ? 'success' : 'error', `ปรับสถานะกล้อง NVR-${nvrId} เป็น ${state ? 'ปกติทั้งหมด' : 'ขัดข้องทั้งหมด'}`);
  };

  // Quick Action: Simulate Random statuses
  const handleSimulateRandom = () => {
    const config = buildingConfigs[currentBuilding];
    if (!config) return;
    const update: Record<string, boolean> = {};
    config.nvrs.forEach((nvr) => {
      for (let i = 1; i <= nvr.channels; i++) {
        update[`${currentBuilding}-nvr${nvr.id}-ch${i}`] = Math.random() > 0.03;
      }
    });
    setChannelStatus((prev) => ({ ...prev, ...update }));
    showToast('success', `จำลองสถานะกล้องอาคาร ${currentBuilding} เรียบร้อยแล้ว`);
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

  // List of only Offline Channels in the current building
  const offlineChannelsList = useMemo(() => {
    const config = buildingConfigs[currentBuilding];
    if (!config || !config.nvrs) return [];
    const list: Array<{
      channelId: string;
      chNum: number;
      nvr: NvrItem;
      camName: string;
      area: string;
    }> = [];

    config.nvrs.forEach((nvr) => {
      for (let i = 1; i <= nvr.channels; i++) {
        const chId = `${currentBuilding}-nvr${nvr.id}-ch${i}`;
        const isOnline = channelStatus[chId] !== undefined ? channelStatus[chId] : true;
        if (!isOnline) {
          const cameraKey = `${currentBuilding}_${nvr.nvrName}_${i}`;
          const camName = cameraNames[cameraKey] || `CH-${i.toString().padStart(2, '0')}`;
          list.push({
            channelId: chId,
            chNum: i,
            nvr,
            camName,
            area: nvr.area,
          });
        }
      }
    });

    return list;
  }, [buildingConfigs, currentBuilding, channelStatus, cameraNames]);

  // Submit Report
  const handleSubmitReport = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const payload = {
        siteId: currentSite?.id || 1,
        building: currentBuilding,
        reporterName: reporterName.trim() || 'System Admin',
        reportDate: new Date().toISOString(),
        totalNormal: currentStats.online,
        totalAbnormal: currentStats.offline,
        remark: remarks.trim() ? `Building ${currentBuilding} - ${remarks.trim()}` : `Building ${currentBuilding}`,
        stats: currentStats,
      };

      const res = await apiFetch<any>('/api/cctv/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res) {
        showToast('success', `บันทึกรายงานสถานะ CCTV อาคาร ${currentBuilding} เรียบร้อยแล้ว`);
        try {
          localStorage.removeItem(draftKey);
          setHasDraftNotice(false);
        } catch {}
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

  // Launch Incident Reporting for a specific camera fault
  const handleReportCameraFault = (item: { chNum: number; nvr: NvrItem; camName: string; area: string }) => {
    setIncidentPrefill({
      type: 'อุปกรณ์รักษาความปลอดภัยขัดข้อง',
      severity: 'medium',
      location: `อาคาร ${currentBuilding}`,
      customLocation: `${item.nvr.nvrName} ช่อง #${item.chNum} (${item.camName}) - ${item.area}`,
      description: `ตรวจพบกล้องวงจรปิดดับ/สัญญาณขัดข้อง ที่ ${item.nvr.nvrName} ช่อง #${item.chNum} (${item.camName}) พื้นที่: ${item.area}`,
    });
    setIsIncidentModalOpen(true);
  };

  // Launch General Emergency Incident Reporting
  const handleOpenGeneralIncident = () => {
    setIncidentPrefill({
      type: 'อุปกรณ์รักษาความปลอดภัยขัดข้อง',
      severity: 'medium',
      location: `อาคาร ${currentBuilding}`,
      customLocation: `ห้องควบคุม CCTV อาคาร ${currentBuilding}`,
      description: `รายงานเหตุการณ์ผิดปกติผ่านระบบมอนิเตอร์ CCTV อาคาร ${currentBuilding}`,
    });
    setIsIncidentModalOpen(true);
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
        !historySearchQuery ||
        (item.username && item.username.toLowerCase().includes(historySearchQuery.toLowerCase())) ||
        (item.building && item.building.toLowerCase().includes(historySearchQuery.toLowerCase()));
      return matchBuilding && matchSearch;
    });
  }, [reportHistory, historyBuildingFilter, historySearchQuery]);

  // Paginated History
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage]);

  const currentConfig = buildingConfigs[currentBuilding];
  const availableBuildings = useMemo(() => {
    const keys = Object.keys(buildingConfigs);
    return keys.length > 0 ? keys : ['B2', 'B3', 'B4', 'B9'];
  }, [buildingConfigs]);

  const activeNvrs = useMemo(() => {
    if (!currentConfig?.nvrs) return [];
    if (selectedNvrTab === 'all') return currentConfig.nvrs;
    return currentConfig.nvrs.filter((n) => n.nvrName === selectedNvrTab);
  }, [currentConfig, selectedNvrTab]);

  const toggleNvrCollapse = (nvrName: string) => {
    setCollapsedNvrs((prev) => ({
      ...prev,
      [nvrName]: !prev[nvrName],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-32 md:pb-16 text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800 shadow-slate-900/20'
                : 'bg-rose-900 text-white border-rose-800 shadow-rose-900/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Incident Reporting Modal Bridge */}
      <ReportIncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        siteCode={currentSite?.code || 'BPI'}
        siteName={currentSite?.name || 'บางปะอิน'}
        userName={reporterName}
        initialType={incidentPrefill.type}
        initialSeverity={incidentPrefill.severity}
        initialLocation={incidentPrefill.location}
        initialCustomLocation={incidentPrefill.customLocation}
        initialDescription={incidentPrefill.description}
        onSubmitted={() => {
          showToast('success', 'ส่งรายงานเหตุการณ์เข้าสู่ศูนย์ SOC Command Center เรียบร้อยแล้ว');
        }}
      />

      <div className="max-w-7xl mx-auto pt-3 sm:pt-5 px-3 sm:px-6 space-y-3 sm:space-y-4">
        {/* Page Header */}
        <PageHeader
          title="รายงานสถานะกล้อง CCTV"
          subtitle={`ศูนย์ปฏิบัติการรักษาความปลอดภัย (${currentSite?.name || 'บางปะอิน'} - ${currentSite?.code || 'BPI'})`}
          icon={<Cctv className="w-5 h-5 text-blue-600" />}
          backHref="/report-page"
          backLabel="กลับ"
          badge={currentSite?.code || 'BPI'}
          actions={
            <div className="flex items-center gap-1.5">
              {/* Emergency Report Action Button */}
              <button
                type="button"
                onClick={handleOpenGeneralIncident}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden xxs:inline">แจ้งเหตุฉุกเฉิน</span>
                <span className="xxs:hidden">แจ้งเหตุ</span>
              </button>
            </div>
          }
        />

        {/* Primary View Tabs: บันทึกสถานะ vs ประวัติการบันทึก */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-1 flex items-center justify-between gap-1.5">
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'monitor'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Cctv className="w-3.5 h-3.5 text-blue-400" />
              <span>บันทึกสถานะกล้อง</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>ประวัติการบันทึก ({reportHistory.length})</span>
            </button>
          </div>
        </div>

        {/* Draft Notice Banner */}
        {hasDraftNotice && activeTab === 'monitor' && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                พบข้อมูลร่างล่าสุดอาคาร {currentBuilding} ที่ยังไม่ได้ส่ง (บันทึกล่าสุดเมื่อ: {lastSavedDraftTime})
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                กู้คืนร่าง
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                ละทิ้ง
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: HISTORY MATRIX (Compact Single-Screen View)          */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <CollapsibleHistory
            title="ประวัติการบันทึกสถานะ CCTV (NVR Matrix)"
            count={filteredHistory.length}
            defaultOpen={true}
          >
            {/* Filter & Action Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              {/* Building Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> อาคาร:
                </span>
                {['ALL', ...availableBuildings].map((bldg) => {
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
                          ? 'bg-slate-900 text-white shadow-2xs'
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
                    value={historySearchQuery}
                    onChange={(e) => {
                      setHistorySearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="ค้นหาผู้รายงาน..."
                    className="pl-8 pr-8 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none w-44"
                  />
                  <MicButton
                    onResult={(t) => {
                      setHistorySearchQuery(t);
                      setCurrentPage(1);
                    }}
                    currentValue={historySearchQuery}
                    mode="replace"
                    className="top-1/2 -translate-y-1/2 right-1.5"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  ส่งออก CSV
                </button>
              </div>
            </div>

            {/* Compact History Table */}
            <div className="overflow-x-auto mobile-table-scroll rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse table-auto text-xs min-w-[750px]">
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
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} className="animate-pulse">
                        <td className="py-2.5 px-3 text-center"><div className="h-3.5 bg-slate-200 rounded w-16 mx-auto"></div></td>
                        <td className="py-2.5 px-2 text-center"><div className="h-3.5 bg-slate-100 rounded w-10 mx-auto"></div></td>
                        <td className="py-2.5 px-2 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                        <td className="py-2.5 px-3"><div className="h-3.5 bg-slate-200 rounded w-24"></div></td>
                        <td className="py-2.5 px-3 text-center"><div className="h-3.5 bg-slate-200 rounded w-14 mx-auto"></div></td>
                        <td className="py-2.5 px-2 text-center"><div className="h-3.5 bg-slate-200 rounded w-10 mx-auto"></div></td>
                        {allNvrs.map((nvr) => (
                          <td key={`sk-${nvr.building}-${nvr.nvrName}`} className="py-2 px-1 text-center">
                            <div className="h-3 bg-slate-100 rounded w-6 mx-auto"></div>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginatedHistory.length > 0 ? (
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
          </CollapsibleHistory>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 2: CAMERA STATUS MONITOR & SUBMISSION                   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'monitor' && (
          <div className="space-y-3">
            {/* 1. การ์ดสรุปภาพรวม (Overview Summary Card / Streamlined Operational KPI Strip) - ย้ายมาไว้บนสุด */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                {/* Normal Count */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs text-emerald-900 font-semibold">ปกติ:</span>
                  <span className="text-xs font-mono font-black text-emerald-800">{currentStats.online}</span>
                </div>

                {/* Offline Count */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-colors ${
                    currentStats.offline > 0
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <XCircle className={`w-3.5 h-3.5 ${currentStats.offline > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold">ขัดข้อง:</span>
                  <span className={`text-xs font-mono font-black ${currentStats.offline > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    {currentStats.offline}
                  </span>
                </div>

                {/* Total Channels */}
                <div className="hidden xxs:flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Cctv className="w-3.5 h-3.5 text-slate-400" />
                  <span>รวมทั้งหมด:</span>
                  <strong className="text-slate-800 font-mono">{currentStats.total}</strong>
                </div>

                {/* % Available */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-500 hidden sm:inline">ความพร้อม:</span>
                  <span
                    className={`font-mono font-black ${
                      currentStats.percentage >= 98
                        ? 'text-emerald-700'
                        : currentStats.percentage >= 90
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {currentStats.percentage}%
                  </span>
                </div>
              </div>

              {/* View Mode Toggle: Zero-Scroll Feature */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 ml-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('offline_only')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'offline_only'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>เฉพาะที่ขัดข้อง</span>
                  {offlineChannelsList.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px]">
                      {offlineChannelsList.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'all'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>แสดงทั้งหมด</span>
                </button>
              </div>
            </div>

            {/* 2. รายการอาคาร (Building Selector & Tools Bar) - อยู่ถัดลงมาจากการ์ดสรุป */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3 sm:p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Building Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5" /> อาคาร:
                  </span>
                  {availableBuildings.map((bldg) => {
                    const isSelected = currentBuilding === bldg;
                    const bConfig = buildingConfigs[bldg];
                    const nvrCount = bConfig?.nvrs?.length || 0;

                    return (
                      <button
                        key={bldg}
                        type="button"
                        onClick={() => handleSelectBuilding(bldg)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{bldg}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                          {nvrCount} NVR
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Simulation / Tools */}
                <div className="flex items-center gap-1.5 self-end md:self-center">
                  <button
                    type="button"
                    onClick={handleSetAllOnline}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold text-xs transition-colors border border-slate-200/80"
                    title="ตั้งค่าทุกกล้องในอาคารเป็นปกติ"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden xxs:inline">ปกติทั้งหมด</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateRandom}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors border border-slate-200/80"
                    title="สุ่มจำลองสถานะเพื่อทดสอบ"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">จำลองสถานะ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* VIEW MODE 1: OFFLINE-ONLY (Zero Scroll on PWA)              */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {viewMode === 'offline_only' && (
              <div className="space-y-3">
                {offlineChannelsList.length === 0 ? (
                  /* 100% Operational Banner: No Scrolling Needed! */
                  <div className="bg-white rounded-2xl shadow-xs border border-emerald-200/90 p-6 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        กล้องวงจรปิดทุกช่องสัญญาณในอาคาร {currentBuilding} ทำงานปกติ 100%
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        ตรวจสอบสถานะ NVR ครบทั้ง {currentConfig?.nvrs?.length || 0} เครื่อง รวม {currentStats.total} ช่องสัญญาณ ไม่พบสัญญาณภาพดับหรืออุปกรณ์ขัดข้อง
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleSubmitReport}
                        disabled={submitting}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4 text-emerald-400" />
                        <span>{submitting ? 'กำลังบันทึก...' : 'บันทึกรายงานสถานะปกติทันที (1-Tap Submit)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewMode('all')}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                      >
                        ดูรายการกล้องทั้งหมด ({currentStats.total} ช่อง)
                      </button>
                    </div>
                  </div>
                ) : (
                  /* List of Offline Cameras (Focus view - No endless scrolling past normal cameras) */
                  <div className="space-y-2.5">
                    <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span className="text-xs font-bold">
                          พบกล้องขัดข้อง {offlineChannelsList.length} ช่องสัญญาณในอาคาร {currentBuilding}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSetAllOnline}
                        className="text-xs text-rose-700 hover:text-rose-900 font-semibold underline self-end sm:self-center"
                      >
                        ปรับเป็นปกติทั้งหมด
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {offlineChannelsList.map((item) => (
                        <div
                          key={item.channelId}
                          className="bg-white rounded-xl border border-rose-200 p-2.5 shadow-2xs flex flex-col justify-between gap-2 relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />
                          <div className="space-y-1 pl-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-mono font-bold truncate">
                                {currentBuilding} · {item.nvr.nvrName} · #{item.chNum}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                ขัดข้อง
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight truncate" title={item.camName}>
                              {item.camName}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate" title={item.area}>
                              {item.area}
                            </p>
                          </div>

                          {/* Action Buttons for this Offline Camera */}
                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 pl-1">
                            <button
                              type="button"
                              onClick={() => handleToggleChannel(item.channelId)}
                              className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                              title="สลับสถานะเป็นปกติ"
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>ปกติ</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReportCameraFault(item)}
                              className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-2xs transition-colors flex items-center justify-center gap-1 active:scale-95 flex-shrink-0"
                              title="ส่งรายงานเหตุการณ์เข้าศูนย์ SOC"
                            >
                              <AlertTriangle className="w-3 h-3 text-white" />
                              <span>แจ้ง SOC</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* VIEW MODE 2: ALL CHANNELS (Collapsible NVR Accordions)      */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {viewMode === 'all' && (
              <div className="space-y-3">
                {/* Search & NVR Tab Filter Strip */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3 space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    {/* Search Camera */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาชื่อกล้อง, พื้นที่, หรือเลขช่อง..."
                        className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 text-xs font-medium focus:bg-white focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                      <MicButton
                        onResult={setSearchQuery}
                        currentValue={searchQuery}
                        mode="replace"
                        className="top-1/2 -translate-y-1/2 right-1.5"
                      />
                    </div>

                    {/* NVR Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      <button
                        type="button"
                        onClick={() => setSelectedNvrTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                          selectedNvrTab === 'all'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        ทุก NVR ({currentConfig?.nvrs?.length || 0})
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
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{nvr.nvrName}</span>
                            <span
                              className={`text-[10px] px-1 rounded font-mono ${
                                isAllOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 font-bold'
                              }`}
                            >
                              {stat.online_channels}/{stat.total_channels}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* NVR Cards (Collapsible Accordion by Default for Clean Screens) */}
                <div className="space-y-3">
                  {activeNvrs.map((nvr) => {
                    const stat = currentStats.nvrStats[nvr.nvrName] || {
                      online_channels: nvr.channels,
                      total_channels: nvr.channels,
                      percentage: 100,
                    };
                    const isAllOk = stat.online_channels === stat.total_channels;
                    const hasOffline = !isAllOk;
                    // Auto-expand if has offline cameras, otherwise follow user collapse state
                    const isCollapsed = collapsedNvrs[nvr.nvrName] ?? false;

                    // Filter channels if searchQuery is active
                    const channelItems = Array.from({ length: nvr.channels }, (_, idx) => idx + 1).filter((chNum) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      const cameraKey = `${currentBuilding}_${nvr.nvrName}_${chNum}`;
                      const camName = (cameraNames[cameraKey] || '').toLowerCase();
                      const area = (nvr.area || '').toLowerCase();
                      return (
                        chNum.toString().includes(q) ||
                        camName.includes(q) ||
                        area.includes(q)
                      );
                    });

                    if (searchQuery.trim() && channelItems.length === 0) return null;

                    return (
                      <div
                        key={nvr.id}
                        className={`bg-white rounded-2xl shadow-xs border transition-all ${
                          hasOffline ? 'border-rose-300 ring-1 ring-rose-200/50' : 'border-slate-200/90'
                        }`}
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() => toggleNvrCollapse(nvr.nvrName)}
                          className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-50/70 transition-colors rounded-2xl"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isAllOk
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              <Server className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900">{nvr.nvrName}</h4>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono font-semibold">
                                  {nvr.channels} CH
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                    isAllOk
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-300'
                                  }`}
                                >
                                  {stat.online_channels}/{stat.total_channels} ช่อง ({stat.percentage}%)
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5" title={nvr.area}>
                                พื้นที่: {nvr.area}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleSetNvrAll(nvr.id, nvr.channels, true)}
                                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <Check className="w-3 h-3 text-slate-600" />
                                <span className="hidden xxs:inline">ปกติทั้งหมด</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetNvrAll(nvr.id, nvr.channels, false)}
                                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <X className="w-3 h-3 text-slate-600" />
                                <span className="hidden xxs:inline">ขัดข้องทั้งหมด</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                              title={isCollapsed ? 'ขยายเพื่อดูช่องสัญญาณ' : 'ย่อเก็บ'}
                            >
                              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Channel Grid */}
                        {!isCollapsed && (
                          <div className="p-2.5 sm:p-3 pt-0 border-t border-slate-100">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 mt-2.5">
                              {channelItems.map((chNum) => {
                                const channelId = `${currentBuilding}-nvr${nvr.id}-ch${chNum}`;
                                const isOnline = channelStatus[channelId] !== undefined ? channelStatus[channelId] : true;
                                const cameraKey = `${currentBuilding}_${nvr.nvrName}_${chNum}`;
                                const camName = cameraNames[cameraKey] || `CH-${chNum.toString().padStart(2, '0')}`;

                                return (
                                  <div
                                    key={chNum}
                                    className={`relative p-1.5 rounded-lg sm:rounded-xl border transition-all duration-150 select-none flex flex-col justify-between h-[46px] group cursor-pointer ${
                                      isOnline
                                        ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                                        : 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100 shadow-2xs ring-1 ring-rose-400/40'
                                    }`}
                                    onClick={() => handleToggleChannel(channelId)}
                                    title={`คลิกเพื่อสลับสถานะ: #${chNum} ${camName} (${isOnline ? 'ปกติ' : 'ขัดข้อง'})`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className={`text-[11px] font-mono font-black ${isOnline ? 'text-slate-100' : 'text-rose-900'}`}>
                                        #{chNum}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {!isOnline && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleReportCameraFault({ chNum, nvr, camName, area: nvr.area });
                                            }}
                                            className="p-0.5 rounded bg-rose-600 text-white hover:bg-rose-700 active:scale-90"
                                            title="แจ้งเหตุการณ์เข้าศูนย์ SOC"
                                          >
                                            <AlertTriangle className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                        <span
                                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            isOnline ? 'bg-emerald-400' : 'bg-rose-500 ring-2 ring-rose-300 animate-pulse'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                    <div
                                      className={`text-[9px] font-medium leading-none truncate mt-0.5 ${
                                        isOnline ? 'text-slate-300 group-hover:text-white' : 'text-rose-800 font-semibold'
                                      }`}
                                      title={camName}
                                    >
                                      {camName}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Remarks & Quick Presets Section */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>หมายเหตุการตรวจสอบ / รายละเอียดเพิ่มเติม</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">บันทึกอัตโนมัติ</span>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {CCTV_REMARK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setRemarks((prev) => (prev ? `${prev}; ${preset}` : preset));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium border border-slate-200 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {/* Remarks Textarea with Voice Recognition */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="ระบุหมายเหตุ เช่น จุดที่มีปัญหา, การประสานงานช่างไอที หรือกดไมค์เพื่อพูด..."
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                <MicButton
                  onResult={(text) => {
                    setRemarks((prev) => (prev ? `${prev} ${text}` : text));
                  }}
                  currentValue={remarks}
                  mode="append"
                  className="top-2.5 right-2"
                />
              </div>

              {/* Submitter Info */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">ผู้รายงาน:</span>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="ชื่อผู้ตรวจสอบ..."
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none w-48"
                  />
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitReport}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{submitting ? 'กำลังบันทึก...' : `ส่งรายงานอาคาร ${currentBuilding}`}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile / PWA Sticky Bottom Action Dock (Zero Scroll Submission & Quick Incident Report) */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 sm:px-4 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col min-w-0">
                  <div className="text-[11px] font-bold text-slate-800 truncate">
                    {currentBuilding} · {currentStats.online}/{currentStats.total} ช่อง
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {currentStats.offline > 0 ? (
                      <span className="font-bold text-rose-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        ขัดข้อง {currentStats.offline} จุด
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ปกติ 100%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Emergency Incident Report Button */}
                <button
                  type="button"
                  onClick={handleOpenGeneralIncident}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all"
                  title="แจ้งเหตุฉุกเฉิน / ขัดข้องเข้า SOC"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  <span className="hidden xxs:inline">แจ้งเหตุฉุกเฉิน</span>
                  <span className="xxs:hidden">แจ้งเหตุ</span>
                </button>

                {/* Submit Report Button */}
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{submitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
