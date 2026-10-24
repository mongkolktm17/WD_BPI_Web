'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Radio,
  Send,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  CheckCheck,
  ArrowRight,
  Flame,
  Activity,
  ShieldAlert,
  Car,
  Wrench,
  Camera,
  Layers,
  FileText,
  Filter,
  Search,
  Bell,
  Check,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  IncidentService,
  type IncidentReport,
  type IncidentSeverity,
  type IncidentStatus,
  DEFAULT_SOP_TEMPLATES,
} from '@/lib/incident-service';

interface CommandCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  siteCode: string;
  initialIncidentId?: string | null;
  initialDispatchPreset?: {
    location: string;
    incidentType: string;
    severity: IncidentSeverity;
    description: string;
    assignedTo: string;
    dispatchNote: string;
    sopTemplateKey: string;
  } | null;
}

const DISPATCH_OFFICER_CHIPS = [
  { id: 'sup_a', label: 'หัวหน้ากะ A (Supervisor BPI)', role: 'Supervisor' },
  { id: 'sup_b', label: 'หัวหน้ากะ B (Supervisor PRB)', role: 'Supervisor' },
  { id: 'traffic', label: 'รปภ. จราจร (Traffic Team)', role: 'Traffic' },
  { id: 'cctv_tech', label: 'รปภ. ห้อง CCTV / ช่างเทคนิค', role: 'Technical' },
  { id: 'ert', label: 'ทีมตอบโต้เหตุฉุกเฉิน (ERT Team)', role: 'ERT Emergency' },
  { id: 'guard_b4', label: 'รปภ. ประจำจุด อาคาร B4', role: 'Area Guard' },
  { id: 'guard_b2', label: 'รปภ. ประจำจุด อาคาร B2', role: 'Area Guard' },
];

const SOP_PRESET_CARDS = [
  { key: 'fire', title: 'SOP อัคคีภัย / กลุ่มควัน', stepsCount: 4, icon: Flame },
  { key: 'cctv_nvr', title: 'SOP NVR & CCTV ขัดข้อง', stepsCount: 4, icon: Camera },
  { key: 'parking', title: 'SOP ลานจอดรถเต็ม 100%', stepsCount: 4, icon: Car },
  { key: 'radio', title: 'SOP ตรวจวิทยุสื่อสาร', stepsCount: 4, icon: Radio },
  { key: 'general', title: 'SOP ระงับเหตุทั่วไป', stepsCount: 4, icon: ShieldAlert },
];

const QUICK_DIRECTIVE_SUGGESTIONS = [
  'เข้าตรวจสอบพื้นที่เกิดเหตุทันทีและรายงานผลภาพถ่าย',
  'กั้นพื้นที่ความปลอดภัยโดยรอบและห้ามผู้ไม่มีส่วนเกี่ยวข้องเข้า',
  'ประสานงานทีมช่างเทคนิคและผู้ดูแลระบบเข้าตรวจสอบอุปกรณ์',
  'จัดระเบียบการจราจรหน้าทางเข้าและระบายรถไปยังลานจอดสำรอง',
];

const SEVERITY_COLORS: Record<IncidentSeverity, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300', label: 'CRITICAL' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'HIGH' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300', label: 'MEDIUM' },
  low: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300', label: 'LOW' },
};

function formatElapsedTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีก่อน`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ชม. ก่อน`;
    return new Date(isoString).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  } catch {
    return '-';
  }
}

export function CommandCenterDrawer({
  isOpen,
  onClose,
  siteCode,
  initialIncidentId,
  initialDispatchPreset,
}: CommandCenterDrawerProps) {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | IncidentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStepTab, setActiveStepTab] = useState<number>(2); // 1: Reported, 2: Dispatch, 3: SOP, 4: Resolve

  // Step 2 Dispatch form state
  const [targetOfficer, setTargetOfficer] = useState(DISPATCH_OFFICER_CHIPS[0].label);
  const [dispatchNote, setDispatchNote] = useState('');
  const [selectedSopKey, setSelectedSopKey] = useState('general');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccessPing, setDispatchSuccessPing] = useState(false);

  // Subscribe to incident changes
  useEffect(() => {
    if (!isOpen) return;

    const reload = () => {
      const all = IncidentService.getIncidents();
      setIncidents(all);

      if (initialIncidentId) {
        setSelectedIncidentId(initialIncidentId);
      } else if (!selectedIncidentId && all.length > 0) {
        setSelectedIncidentId(all[0].id);
      }
    };

    reload();
    const unsub = IncidentService.subscribe(() => reload());
    return unsub;
  }, [isOpen, initialIncidentId]);

  // Handle preset dispatch triggered from SOC cards (e.g. CCTV FAIL, Parking 100%, Radio)
  useEffect(() => {
    if (isOpen && initialDispatchPreset) {
      const created = IncidentService.createIncident({
        siteCode,
        location: initialDispatchPreset.location,
        incidentType: initialDispatchPreset.incidentType,
        severity: initialDispatchPreset.severity,
        description: initialDispatchPreset.description,
        reportedBy: 'SOC Command Trigger',
      });

      setSelectedIncidentId(created.id);
      setTargetOfficer(initialDispatchPreset.assignedTo);
      setDispatchNote(initialDispatchPreset.dispatchNote);
      setSelectedSopKey(initialDispatchPreset.sopTemplateKey);
      setActiveStepTab(2);
    }
  }, [isOpen, initialDispatchPreset, siteCode]);

  // Synchronize active step tab with selected incident status
  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return incidents[0] || null;
    return incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;
  }, [incidents, selectedIncidentId]);

  useEffect(() => {
    if (selectedIncident) {
      if (selectedIncident.status === 'reported') {
        setActiveStepTab(2); // Focus dispatch directly for fast operational readiness
      } else if (selectedIncident.status === 'dispatched' || selectedIncident.status === 'in_progress') {
        setActiveStepTab(3); // Focus live checklist tracking
      } else if (selectedIncident.status === 'resolved') {
        setActiveStepTab(4); // Focus resolved report
      }
    }
  }, [selectedIncident?.id, selectedIncident?.status]);

  if (!isOpen) return null;

  // Filter incidents by tab and search query
  const filteredIncidents = incidents.filter((inc) => {
    const matchesTab = activeTabFilter === 'all' || inc.status === activeTabFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      inc.id.toLowerCase().includes(q) ||
      inc.incidentType.toLowerCase().includes(q) ||
      inc.location.toLowerCase().includes(q) ||
      inc.reportedBy.toLowerCase().includes(q) ||
      (inc.assignedTo && inc.assignedTo.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  // KPI counts
  const reportedCount = incidents.filter((i) => i.status === 'reported').length;
  const dispatchedCount = incidents.filter((i) => i.status === 'dispatched').length;
  const inProgressCount = incidents.filter((i) => i.status === 'in_progress').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  const handleSendDispatch = () => {
    if (!selectedIncident) return;
    setIsDispatching(true);

    const sopTemplate = DEFAULT_SOP_TEMPLATES[selectedSopKey] || DEFAULT_SOP_TEMPLATES.general;

    IncidentService.dispatchIncident(selectedIncident.id, {
      assignedTo: targetOfficer,
      note: dispatchNote.trim() || 'เข้าดำเนินการตามขั้นตอนระงับเหตุ SOP ทันที',
      dispatchedBy: 'ศูนย์ควบคุม SOC',
      sopTitle: sopTemplate.title,
      sopSteps: sopTemplate.steps,
    });

    setIsDispatching(false);
    setDispatchSuccessPing(true);
    setTimeout(() => setDispatchSuccessPing(false), 2500);
    setActiveStepTab(3); // Automatically slide to step 3 to track live progress
  };

  const handlePingReminder = () => {
    if (!selectedIncident) return;
    IncidentService.sendNotification({
      title: `แจ้งเตือนติดตามงานจาก SOC: ${selectedIncident.incidentType}`,
      message: `กรุณาดำเนินการตามขั้นตอน SOP และอัปเดตสถานะ (${selectedIncident.location})`,
      type: 'alert_reminder',
      incidentId: selectedIncident.id,
      targetRole: 'guard',
    });
    setDispatchSuccessPing(true);
    setTimeout(() => setDispatchSuccessPing(false), 2500);
  };

  const handleForceResolveFromSoc = () => {
    if (!selectedIncident) return;
    if (!confirm('ยืนยันการปิดเคสเหตุการณ์นี้จากศูนย์ SOC?')) return;
    IncidentService.resolveIncident(
      selectedIncident.id,
      {
        resolvedBy: 'ศูนย์ควบคุม SOC (Supervisor Overwrite)',
        note: 'ตรวจสอบพื้นที่และอุปกรณ์เรียบร้อย ปิดเคสผ่านแผงสั่งการ SOC',
      }
    );
    setActiveStepTab(4);
  };

  const completedSteps = selectedIncident?.sopSteps?.filter((s) => s.completed).length || 0;
  const totalSteps = selectedIncident?.sopSteps?.length || 0;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#f8fafc] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Executive Top Header: Western Digital Navy Banner ── */}
        <div className="bg-gradient-to-r from-[#001433] via-blue-950 to-indigo-950 text-white px-5 sm:px-6 py-3.5 border-b border-blue-900/50 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-sky-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Radio className="w-5 h-5 text-sky-300" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide leading-tight">
                  Real-time Command Center
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-300/40 text-blue-100 font-semibold">
                  WD {siteCode} · ศูนย์สั่งการรักษาความปลอดภัย
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SYNC LIVE</span>
                </span>
              </div>
              <p className="text-xs text-blue-200 leading-tight mt-0.5 truncate">
                ศูนย์ติดตามสถานะและกระจายคำสั่งการไปยัง PWA หน้างานแบบ Real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="ปิดแผงสั่งการ"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── 2. Top KPI Metric Summary & Filter Strip ── */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Filter: All */}
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeTabFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>ทั้งหมด</span>
              <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${activeTabFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {incidents.length}
              </span>
            </button>

            {/* Filter: Reported */}
            <button
              onClick={() => setActiveTabFilter('reported')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeTabFilter === 'reported'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
              <span>รอสั่งการ</span>
              <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${activeTabFilter === 'reported' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-900'}`}>
                {reportedCount}
              </span>
            </button>

            {/* Filter: Dispatched */}
            <button
              onClick={() => setActiveTabFilter('dispatched')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeTabFilter === 'dispatched'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50/70 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
              <span>สั่งการแล้ว</span>
              <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${activeTabFilter === 'dispatched' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {dispatchedCount}
              </span>
            </button>

            {/* Filter: In Progress */}
            <button
              onClick={() => setActiveTabFilter('in_progress')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeTabFilter === 'in_progress'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-blue-50/70 border-blue-200 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" strokeWidth={2} />
              <span>กำลังทำ SOP</span>
              <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${activeTabFilter === 'in_progress' ? 'bg-blue-700 text-white' : 'bg-blue-200 text-blue-900'}`}>
                {inProgressCount}
              </span>
            </button>

            {/* Filter: Resolved */}
            <button
              onClick={() => setActiveTabFilter('resolved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeTabFilter === 'resolved'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
              <span>ปิดเคสแล้ว</span>
              <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${activeTabFilter === 'resolved' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                {resolvedCount}
              </span>
            </button>
          </div>

          {dispatchSuccessPing && (
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 animate-in fade-in flex-shrink-0">
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>ส่งคำสั่งไปยัง PWA หน้างานเรียบร้อย</span>
            </div>
          )}
        </div>

        {/* ── 3. Main Workspace: Queue (Left) & Command Deck (Right) ── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Incidents Queue with Quick Search */}
          <div className="w-full md:w-84 lg:w-92 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาเคส, ตึก, ประเภท หรือชื่อผู้แจ้ง..."
                  className="w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl pl-8 pr-7 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Incident Cards Queue */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredIncidents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                  <p>ไม่พบรายการเหตุการณ์ตามเงื่อนไข</p>
                </div>
              ) : (
                filteredIncidents.map((inc) => {
                  const isSelected = inc.id === selectedIncident?.id;
                  const sevStyle = SEVERITY_COLORS[inc.severity] || SEVERITY_COLORS.medium;
                  const timeAgo = formatElapsedTime(inc.reportedAt);

                  return (
                    <button
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      className={`w-full text-left p-3.5 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-4 border-l-[#0052CC] shadow-2xs'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      {/* Row 1: Type + Severity Badge */}
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                          {inc.incidentType}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${sevStyle.bg} ${sevStyle.text} border ${sevStyle.border}`}
                        >
                          {sevStyle.label}
                        </span>
                      </div>

                      {/* Row 2: Location */}
                      <div className="text-[11px] text-slate-600 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{inc.location} ({inc.siteCode})</span>
                      </div>

                      {/* Row 3: Reporter + Status Pill + Time Ago */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 text-[10px] text-slate-400 font-mono border-t border-slate-100">
                        <span className="truncate max-w-[120px]">{inc.reportedBy}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`font-bold uppercase px-1.5 py-0.2 rounded text-[9px] ${
                              inc.status === 'reported'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : inc.status === 'dispatched'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : inc.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {inc.status}
                          </span>
                          <span>·</span>
                          <span>{timeAgo}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Mission Control Command Deck */}
          {selectedIncident ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#f8fafc]">
              {/* ── A. Incident Context Header Card ── */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {selectedIncident.incidentType}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          SEVERITY_COLORS[selectedIncident.severity].bg
                        } ${SEVERITY_COLORS[selectedIncident.severity].text} ${
                          SEVERITY_COLORS[selectedIncident.severity].border
                        }`}
                      >
                        ระดับ: {SEVERITY_COLORS[selectedIncident.severity].label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {selectedIncident.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-sky-600" strokeWidth={1.75} />
                        {selectedIncident.location} ({selectedIncident.siteCode})
                      </span>
                      <span>·</span>
                      <span className="text-slate-500 font-mono">
                        แจ้งเมื่อ {new Date(selectedIncident.reportedAt).toLocaleTimeString('th-TH')} น. ({formatElapsedTime(selectedIncident.reportedAt)})
                      </span>
                    </div>
                  </div>

                  {/* Actions for current incident */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {selectedIncident.status !== 'resolved' && (
                      <button
                        onClick={handlePingReminder}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                        title="ส่งการแจ้งเตือนเตือนซ้ำไปยัง PWA"
                      >
                        <Bell className="w-3.5 h-3.5 text-amber-600" />
                        <span className="hidden sm:inline">เตือนติดตามผล</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Description Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-800 leading-relaxed">
                  <div className="font-bold text-slate-500 text-[10px] uppercase mb-0.5 tracking-wider">
                    รายละเอียดเหตุการณ์
                  </div>
                  {selectedIncident.description}
                </div>

                {/* Optional Attached Evidence Image */}
                {selectedIncident.imageUrl && (
                  <div>
                    <div className="font-bold text-slate-500 text-[10px] uppercase mb-1 tracking-wider">
                      ภาพถ่ายประกอบเหตุการณ์
                    </div>
                    <img
                      src={selectedIncident.imageUrl}
                      alt="Incident Evidence"
                      className="max-h-48 rounded-xl border border-slate-200 object-cover shadow-2xs"
                    />
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                  <div className="bg-slate-50 border border-slate-200/70 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">ผู้รายงาน</span>
                    <strong className="text-slate-800">{selectedIncident.reportedBy}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/70 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">รหัสพนักงาน</span>
                    <strong className="text-slate-800">{selectedIncident.employeeId || 'N/A'}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/70 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">ผู้รับมอบหมาย</span>
                    <strong className="text-slate-800">{selectedIncident.assignedTo || 'รอสั่งการ'}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/70 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">สถานะปัจจุบัน</span>
                    <strong className="text-[#0052CC] uppercase">{selectedIncident.status}</strong>
                  </div>
                </div>
              </div>

              {/* ── B. Interactive 4-Step Stepper Navigation Bar ── */}
              <div className="bg-white rounded-xl p-1.5 border border-slate-200 shadow-2xs grid grid-cols-4 gap-1">
                {[
                  { step: 1, label: '1. รับแจ้งเหตุ', desc: 'Reported', completed: true },
                  { step: 2, label: '2. สั่งการระงับเหตุ', desc: 'Dispatched', completed: selectedIncident.status !== 'reported' },
                  { step: 3, label: '3. ติดตาม SOP สด', desc: 'In Progress', completed: selectedIncident.status === 'in_progress' || selectedIncident.status === 'resolved' },
                  { step: 4, label: '4. สรุปปิดเคส', desc: 'Resolved', completed: selectedIncident.status === 'resolved' },
                ].map((s) => {
                  const isActive = activeStepTab === s.step;
                  return (
                    <button
                      key={s.step}
                      onClick={() => setActiveStepTab(s.step)}
                      className={`p-2 rounded-lg text-left transition-all ${
                        isActive
                          ? 'bg-[#001433] text-white shadow-xs'
                          : s.completed
                          ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                          : 'bg-slate-50/50 text-slate-400 border border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-sky-300' : 'text-slate-400'}`}>
                          ขั้นตอนที่ {s.step}
                        </span>
                        {s.completed && (
                          <Check className={`w-3 h-3 ${isActive ? 'text-sky-300' : 'text-emerald-600'}`} strokeWidth={2.5} />
                        )}
                      </div>
                      <div className="text-xs font-bold truncate mt-0.5">{s.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* ── C. Active Step Workspace Deck ── */}

              {/* STEP 1: Reported Review */}
              {activeStepTab === 1 && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0052CC] border border-blue-200 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        ขั้นตอนที่ 1: ตรวจสอบข้อมูลรับแจ้งเหตุ (Reported)
                      </h4>
                      <p className="text-xs text-slate-500">
                        ข้อมูลเหตุการณ์ถูกส่งมาจาก PWA หน้างานหรือระบบตรวจจับความผิดปกติของ SOC เรียบร้อย
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
                    <p className="font-semibold">สถานะปัจจุบัน: รับเรื่องเข้าสู่ศูนย์ปฏิบัติการ SOC เรียบร้อยแล้ว</p>
                    <p className="text-blue-700">
                      เจ้าหน้าที่ในศูนย์ SOC สามารถกดปุ่มด้านล่างเพื่อเข้าสู่ขั้นตอนที่ 2 และมอบหมายงานสั่งการไปยังมือถือ รปภ. ได้ทันที
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveStepTab(2)}
                    className="w-full py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>ไปที่ขั้นตอนที่ 2: สั่งการระงับเหตุ (Proceed to Dispatch)</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              )}

              {/* STEP 2: Fast 1-Click Operational Dispatch */}
              {activeStepTab === 2 && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          ขั้นตอนที่ 2: สั่งการระงับเหตุ (Dispatch Order to PWA)
                        </h4>
                        <p className="text-xs text-slate-500">
                          เลือกเจ้าหน้าที่ผู้รับผิดชอบ เทมเพลต SOP และส่งคำสั่งด่วนไปแจ้งเตือนบน PWA ทันที
                        </p>
                      </div>
                    </div>

                    {selectedIncident.status !== 'reported' && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        สั่งการแล้ว เมื่อ {selectedIncident.dispatchedAt ? new Date(selectedIncident.dispatchedAt).toLocaleTimeString('th-TH') : '-'}
                      </span>
                    )}
                  </div>

                  {/* 1. Quick Officer Role Chips */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      1. เลือกเจ้าหน้าที่ / ทีมระงับเหตุ (1-Click Select) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {DISPATCH_OFFICER_CHIPS.map((chip) => {
                        const isSelected = targetOfficer === chip.label;
                        return (
                          <button
                            type="button"
                            key={chip.id}
                            disabled={selectedIncident.status === 'resolved'}
                            onClick={() => setTargetOfficer(chip.label)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-[#0052CC] ring-1 ring-[#0052CC] shadow-2xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {chip.role}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-[#0052CC]" strokeWidth={2.5} />
                              )}
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                              {chip.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. SOP Template Cards */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      2. เลือกเทมเพลตมาตรฐานระงับเหตุ (SOP Template) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {SOP_PRESET_CARDS.map((sop) => {
                        const isSelected = selectedSopKey === sop.key;
                        const SopIcon = sop.icon;
                        return (
                          <button
                            type="button"
                            key={sop.key}
                            disabled={selectedIncident.status === 'resolved'}
                            onClick={() => setSelectedSopKey(sop.key)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-[#0052CC] ring-1 ring-[#0052CC] shadow-2xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <SopIcon className={`w-4 h-4 ${isSelected ? 'text-[#0052CC]' : 'text-slate-500'}`} strokeWidth={1.75} />
                              <span className="text-[10px] font-mono text-slate-400">
                                {sop.stepsCount} ข้อ
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                              {sop.title}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Quick Action Directives */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      3. ข้อความคำสั่งเพิ่มเติมจาก SOC (กดเลือกข้อความแนะนำได้)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {QUICK_DIRECTIVE_SUGGESTIONS.map((dir, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setDispatchNote(dir)}
                          className="px-2 py-1 rounded-lg text-[10.5px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                        >
                          + {dir}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={dispatchNote}
                      onChange={(e) => setDispatchNote(e.target.value)}
                      placeholder="เช่น ให้สวมหน้ากากป้องกันควัน กั้นพื้นที่ และรายงานภาพถ่ายปิดเคส..."
                      disabled={selectedIncident.status === 'resolved'}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>

                  {/* Primary Dispatch Action Button */}
                  <button
                    type="button"
                    onClick={handleSendDispatch}
                    disabled={isDispatching || selectedIncident.status === 'resolved'}
                    className="w-full py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-white" strokeWidth={2} />
                    <span>
                      {selectedIncident.status === 'reported'
                        ? 'ส่งคำสั่งไปที่ PWA (Dispatch Order to Guard)'
                        : 'อัปเดตคำสั่งและส่งแจ้งเตือนใหม่ไปยัง PWA'}
                    </span>
                  </button>
                </div>
              )}

              {/* STEP 3: Live SOP Tracking & Checklist Sync */}
              {activeStepTab === 3 && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          ขั้นตอนที่ 3: ติดตามสถานะปฏิบัติการสด (Live SOP Sync)
                        </h4>
                        <p className="text-xs text-slate-500">
                          {selectedIncident.sopTitle || 'SOP ระงับเหตุการณ์'} · รับผิดชอบโดย: {selectedIncident.assignedTo || 'รปภ. หน้างาน'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#0052CC]">
                        {progressPct}% ({completedSteps}/{totalSteps})
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all duration-300 ${
                        progressPct === 100 ? 'bg-emerald-500' : 'bg-[#0052CC]'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* SOP Checklist Items */}
                  <div className="space-y-2 pt-1">
                    {selectedIncident.sopSteps?.length > 0 ? (
                      selectedIncident.sopSteps.map((st, i) => (
                        <div
                          key={st.id}
                          className={`flex items-start gap-3 p-3 rounded-xl text-xs border transition-colors ${
                            st.completed
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0 ${
                              st.completed ? 'bg-emerald-600 text-white shadow-2xs' : 'border border-slate-300 bg-white'
                            }`}
                          >
                            {st.completed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-slate-400 mr-1.5">{i + 1}.</span>
                            <span className="font-semibold">{st.label}</span>
                            {st.completedAt && (
                              <span className="block text-[10px] text-emerald-700 font-mono mt-0.5">
                                ทำเสร็จเมื่อ {new Date(st.completedAt).toLocaleTimeString('th-TH')} น.
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        ยังไม่มีรายการขั้นตอน SOP กรุณากลับไปที่ขั้นตอนที่ 2 เพื่อเลือกเทมเพลตและสั่งการ
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handlePingReminder}
                      className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-600" />
                      <span>ส่งการแจ้งเตือนเตือนซ้ำ (Ping Guard)</span>
                    </button>

                    {selectedIncident.status !== 'resolved' && (
                      <button
                        onClick={handleForceResolveFromSoc}
                        className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ปิดเคสจากศูนย์ SOC (Close Case)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: Resolution & History Log */}
              {activeStepTab === 4 && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        ขั้นตอนที่ 4: สรุปรายงาน & บันทึกประวัติ (Resolved)
                      </h4>
                      <p className="text-xs text-slate-500">
                        สรุปผลการระงับเหตุ บันทึกผู้ปิดเคส และจัดเก็บข้อมูลเข้าสู่ฐานข้อมูลประวัติของระบบ
                      </p>
                    </div>
                  </div>

                  {selectedIncident.status === 'resolved' ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={2} />
                        <span>เหตุการณ์นี้ได้รับการแก้ไขและปิดเคสเรียบร้อยแล้ว</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 font-mono">
                        ปิดเคสเมื่อ: {selectedIncident.resolvedAt ? new Date(selectedIncident.resolvedAt).toLocaleString('th-TH') : '-'} โดย {selectedIncident.resolvedBy}
                      </div>
                      {selectedIncident.resolutionNote && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-200/80">
                          <strong>บันทึกสรุปผล:</strong> {selectedIncident.resolutionNote}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-600 space-y-2">
                      <p className="font-semibold text-slate-800">เคสนี้ยังอยู่ระหว่างดำเนินการ</p>
                      <p>
                        เมื่อเจ้าหน้าที่หน้างานดำเนินการตามขั้นตอน SOP ครบถ้วนและกดยืนยันปิดเคสใน PWA ข้อมูลจะบันทึกผลและอัปเดตสถานะเป็น RESOLVED โดยอัตโนมัติ
                      </p>
                      <button
                        onClick={handleForceResolveFromSoc}
                        className="mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ปิดเคสจากศูนย์ SOC ล่วงหน้า</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-xs">
              <Radio className="w-10 h-10 text-slate-300 mb-2" strokeWidth={1.5} />
              <p className="font-semibold text-slate-600">ไม่มีเคสที่เลือก</p>
              <p className="text-slate-400 mt-0.5">เลือกรายการเหตุการณ์จากแถบคิวด้านซ้ายเพื่อเริ่มต้นสั่งการ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
