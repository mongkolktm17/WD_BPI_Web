'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import Pagination from '@/components/Pagination';
import {
  Camera, Car, Radio, ShieldCheck, UserCheck, Building2,
  FileText, ClipboardList, RefreshCw, Eye, Pencil, Trash2,
  Download, Search, X, BarChart3, ScanLine, HardHat
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import ReportDetailModal from '@/components/ReportDetailModal';

const QUICK_LINKS = [
  { name: 'รายงานอาคาร', href: '/select-building', icon: Building2, color: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/20', permission: 'report_page' },
  { name: 'ตรวจลานจอดรถ', href: '/car-parking', icon: Car, color: 'from-sky-500 to-cyan-600', shadow: 'shadow-sky-500/20', permission: 'car_parking' },
  { name: 'ตรวจห้อง CCTV', href: '/cctv-inspection', icon: Camera, color: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/20', permission: 'cctv_inspection' },
  { name: 'ตรวจ Hand Held', href: '/handheld-detector', icon: Radio, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', permission: 'metal_detector' },
  { name: 'Checklist Patrol', href: '/patrol-checklist', icon: ClipboardList, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', permission: 'patrol_checklist' },
  { name: 'ตรวจ Metal Detector', href: '/walkthrough-detector', icon: HardHat, color: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-500/20', permission: 'walkthrough_detector' },
  { name: 'ตรวจวิทยุสื่อสาร', href: '/radio-inspection', icon: Radio, color: 'from-orange-500 to-amber-600', shadow: 'shadow-orange-500/20', permission: 'radio_inspection' },
  { name: 'NVR Recording Days', href: '/nvr-recording', icon: FileText, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', permission: 'nvr_recording' },
  { name: 'CCTV Angle Check', href: '/cctv-angle-check', icon: Camera, color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20', permission: 'cctv_angle_check' },
  { name: 'Guard Duty Log', href: '/guard-duty-log', icon: UserCheck, color: 'from-yellow-500 to-amber-600', shadow: 'shadow-yellow-500/20', permission: 'guard_duty_log' },
  { name: 'รายงาน CCTV', href: '/cctv-report', icon: BarChart3, color: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-500/20', permission: 'cctv_report' },
  { name: 'สถิติรายสัปดาห์/เดือน', href: '/visual-report', icon: BarChart3, color: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/20', permission: 'report_visual' },
];

const REPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด (All Reports)' },
  { value: 'general', label: 'รายงานทั่วไป' },
  { value: 'car_parking', label: 'ตรวจลานจอดรถ' },
  { value: 'cctv_inspection', label: 'ตรวจห้อง CCTV' },
  { value: 'hand_held', label: 'ตรวจ Hand Held' },
  { value: 'patrol', label: 'Checklist Patrol' },
  { value: 'guard_count', label: 'บันทึกจำนวน รปภ.' },
  { value: 'cctv_report', label: 'NVR Recording' },
  { value: 'cctv_angle', label: 'CCTV Angle Check' },
  { value: 'metal_detector', label: 'ตรวจ Metal Detector' },
  { value: 'radio_inspection', label: 'ตรวจวิทยุสื่อสาร' },
];

const TYPE_LABEL_MAP: Record<string, string> = {
  general: 'รายงานทั่วไป',
  car_parking: 'ตรวจลานจอดรถ',
  cctv_inspection: 'ตรวจห้อง CCTV',
  hand_held: 'ตรวจ Hand Held',
  patrol: 'Checklist Patrol',
  guard_count: 'บันทึกจำนวน รปภ.',
  cctv_report: 'NVR Recording',
  cctv_angle: 'CCTV Angle Check',
  metal_detector: 'ตรวจ Metal Detector',
  radio_inspection: 'ตรวจวิทยุสื่อสาร',
};

const TYPE_COLOR_MAP: Record<string, { bg: string; text: string; icon: string }> = {
  general: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🏗️' },
  car_parking: { bg: 'bg-sky-100', text: 'text-sky-700', icon: '🚗' },
  cctv_inspection: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📹' },
  hand_held: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '📻' },
  patrol: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '🚶' },
  guard_count: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '👮' },
  cctv_report: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '📊' },
  cctv_angle: { bg: 'bg-rose-100', text: 'text-rose-700', icon: '🎯' },
  metal_detector: { bg: 'bg-teal-100', text: 'text-teal-700', icon: '🔍' },
  radio_inspection: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '📻' },
};

interface ReportItem {
  id: string;
  type: string;
  label: string;
  details: string;
  submitted_by: string;
  employeeId?: string | null;
  time: string;
  deleteType: string;
  deleteId: number | string;
  updatedBy?: string;
  apiPath?: string;
}

const PAGE_SIZE_OPTIONS = [10, 50, 100];

function formatDateTime(d: string | Date): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  const h = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  const s = String(dt.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

export default function ReportPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState('all');
  const [filterSubmitter, setFilterSubmitter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userName, setUserName] = useState('');
  const [userEmployeeId, setUserEmployeeId] = useState('');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    apiFetch<any>('/api/auth/me')
      .then((data) => {
        const d = data?.data ?? data;
        const u = d?.user ?? d;
        if (u.fullName) setUserName(u.fullName);
        else if (u.username) setUserName(u.username);
        if (u.username) setUserEmployeeId(String(u.username));
        else if (u.employeeId) setUserEmployeeId(String(u.employeeId));
        const perms: string[] = [];
        if (u.role?.permissions) {
          for (const p of u.role.permissions) {
            perms.push(p.moduleName || p.name || p);
          }
        }
        if (perms.length === 0 && u.permissions) {
          for (const p of u.permissions) {
            perms.push(typeof p === 'string' ? p : p.moduleName || p.name || '');
          }
        }
        setUserPermissions(perms);
        if (u.role?.roleName === 'admin' || u.role?.name === 'admin' || u.role?.id === 1 || u.role?.roleName === 'ผู้ดูแลระบบ' || u.role?.name === 'ผู้ดูแลระบบ') {
          setUserPermissions((prev) => prev.includes('admin') ? prev : [...prev, 'admin']);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAllReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterSubmitter) params.set('submitter', filterSubmitter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await apiFetch<any>(`/api/reports/all-reports?${params.toString()}`);

      const items = res?.data?.data || res?.data || [];
      const total = res?.data?.total || res?.total || 0;

      const allReports: ReportItem[] = items.map((item: any) => ({
        id: `${item.typeKey}-${item.id}`,
        type: item.typeKey,
        label: item.reportType,
        details: item.details || '-',
        submitted_by: item.submittedBy || '-',
        employeeId: item.employeeId ?? null,
        time: item.submissionTime,
        updatedBy: item.updatedBy,
        apiPath: item.apiPath,
        deleteType: item.apiPath,
        deleteId: item.id,
      }));

      setReports(allReports);
      setTotalRecords(total);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSubmitter, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    fetchAllReports();
  }, [fetchAllReports]);

  const filteredReports = reports;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const pagedReports = reports;

  const isAdmin = userPermissions.includes('all') || userPermissions.includes('admin');
  const hasScopedPermissions = userPermissions.length > 0 && !isAdmin;
  const visibleQuickLinks = hasScopedPermissions
    ? QUICK_LINKS.filter((link) => userPermissions.includes(link.permission))
    : QUICK_LINKS;

  const handleDelete = async (deleteType: string, deleteId: number | string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายงานนี้?')) return;
    try {
      await apiFetch(`/api/${deleteType}/${deleteId}`, { method: 'DELETE' });
      fetchAllReports();
    } catch (err: any) {
      alert(err.message || 'ลบไม่สำเร็จ');
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterSubmitter) params.set('submitter', filterSubmitter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await apiFetch<any>(`/api/reports/all-reports/export?${params.toString()}`);
      const items = res?.data?.data ?? res?.data ?? [];
      const rows = (Array.isArray(items) ? items : []).map((r: any) => [
        formatDateTime(r.submissionTime ?? r.time ?? ''),
        r.reportType ?? r.label ?? '',
        r.details ?? '',
        r.submittedBy ?? r.submitted_by ?? '',
      ]);
      const headers = ['เวลาส่ง', 'ประเภทรายงาน', 'รายละเอียด', 'ผู้รายงาน'];
      const csvContent = '\uFEFF' + [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.setAttribute('download', `recent_incident_reports_${stamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'ส่งออกไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitterChange = (value: string) => {
    setFilterSubmitter(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      apiFetch<any>(`/api/reports/all-reports?submitter=${encodeURIComponent(value)}&limit=5`)
        .then((res) => {
          const raw = res?.data?.data ?? res?.data ?? res ?? [];
          const items = Array.isArray(raw) ? raw : [];
          setSuggestions(items.map((n: any) => n.submittedBy ?? n.submitted_by).filter(Boolean));
        })
        .catch(() => setSuggestions([]));
    }, 300);
  };

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterSubmitter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setSuggestions([]);
  };

  const handleViewReport = async (report: ReportItem) => {
    try {
      const data = await apiFetch<any>(`/api/${report.apiPath}/${report.deleteId}`);
      setSelectedReport({ ...(data?.data ?? data), type: report.type, label: report.label, details: report.details, submitted_by: report.submitted_by, time: report.time });
      setModalMode('view');
      setModalOpen(true);
    } catch {
      setSelectedReport({ type: report.type, label: report.label, details: report.details, submitted_by: report.submitted_by, time: report.time });
      setModalMode('view');
      setModalOpen(true);
    }
  };

  const handleEditReport = async (report: ReportItem) => {
    try {
      const data = await apiFetch<any>(`/api/${report.apiPath}/${report.deleteId}`);
      setSelectedReport({ ...(data?.data ?? data), type: report.type, label: report.label, details: report.details, submitted_by: report.submitted_by, time: report.time });
      setModalMode('edit');
      setModalOpen(true);
    } catch {
      setSelectedReport({ type: report.type, label: report.label, details: report.details, submitted_by: report.submitted_by, time: report.time });
      setModalMode('edit');
      setModalOpen(true);
    }
  };

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        <div className="glass-card rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold section-title mb-1">ศูนย์รวมรายงาน</h1>
              <p className="text-gray-600 text-sm md:text-lg">ยินดีต้อนรับ, {userName || 'User'}!</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl transition-colors text-sm">
                กลับ Dashboard
              </Link>
              {isAdmin && (
                <>
                  <Link href="/manage-officers" className="submit-btn-modern text-white text-sm font-semibold py-2 px-4 rounded-xl">
                    จัดการเจ้าหน้าที่
                  </Link>
                  <Link href="/admin/roles" className="submit-btn-modern text-white text-sm font-semibold py-2 px-4 rounded-xl">
                    จัดการ Role
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            เปิดฟอร์มรายงาน
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visibleQuickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-slate-200 hover:border-transparent hover:shadow-lg transition-all duration-200 group bg-white hover:bg-gradient-to-br"
                >
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center flex-shrink-0 shadow-md ${link.shadow} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-slate-700 leading-tight">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-3xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold section-title">รายงานเหตุการณ์ล่าสุด</h2>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl transition-colors shadow-md flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'กำลังส่งออก...' : 'ส่งออกเป็น CSV'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-slate-50/50 p-3 sm:p-4 rounded-2xl border border-slate-200/50">
            <div>
              <AnimatedDropdown
                options={REPORT_TYPE_OPTIONS}
                value={filterType}
                onChange={(v) => { setFilterType(v); setPage(1); }}
                label="ประเภทรายงาน"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">ผู้รายงาน (ชื่อ/รหัส)</label>
              <input
                type="text"
                list="submitter-suggestions"
                value={filterSubmitter}
                onChange={(e) => handleSubmitterChange(e.target.value)}
                placeholder="ค้นหา..."
                className="w-full bg-white/80 border border-slate-200 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              />
              <datalist id="submitter-suggestions">
                {suggestions.map((s, i) => (
                  <option key={i} value={s} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">ตั้งแต่วันที่</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full bg-white/80 border border-slate-200 rounded-xl px-3 py-2 sm:py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">ถึงวันที่</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full bg-white/80 border border-slate-200 rounded-xl px-3 py-2 sm:py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4 pt-1">
              <button
                onClick={() => { setPage(1); fetchAllReports(); }}
                className="flex-1 sm:flex-initial bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 min-h-[44px] flex items-center justify-center"
              >
                กรองข้อมูล
              </button>
              <button
                onClick={handleClearFilters}
                className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 min-h-[44px]"
              >
                <X className="w-3.5 h-3.5" />
                ล้าง
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm" role="alert">
              <strong className="font-bold">Notice: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full bg-transparent">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เวลาส่ง</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ประเภทรายงาน</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">รายละเอียด</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้รายงาน</th>
                  <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-3">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-sm">กำลังโหลดข้อมูล...</span>
                      </div>
                    </td>
                  </tr>
                ) : pagedReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 text-slate-300" />
                        <span className="text-sm font-medium">ยังไม่มีรายงานในระบบนี้</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedReports.map((rep, idx) => (
                    <tr key={rep.id} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="py-3.5 px-5 text-left whitespace-nowrap text-sm text-slate-600">
                        {formatDateTime(rep.time)}
                      </td>
                      <td className="py-3.5 px-5 text-left">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${TYPE_COLOR_MAP[rep.type]?.bg || 'bg-slate-100'} ${TYPE_COLOR_MAP[rep.type]?.text || 'text-slate-700'}`}>
                          <span>{TYPE_COLOR_MAP[rep.type]?.icon || '📋'}</span>
                          {rep.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-left max-w-xs truncate text-sm text-slate-600">
                        {rep.details}
                      </td>
                      <td className="py-3.5 px-5 text-left text-sm text-slate-600">
                        {rep.submitted_by}
                        {rep.updatedBy && (
                          <span className="ml-2 text-[11px] font-medium text-orange-600">แก้ไขโดย {rep.updatedBy}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewReport(rep)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:text-white hover:bg-blue-500 transition-all"
                            title="ดู"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(isAdmin || rep.submitted_by === userName || (userEmployeeId && rep.employeeId === userEmployeeId)) && (
                            <button
                              onClick={() => handleEditReport(rep)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-500 hover:text-white hover:bg-amber-500 transition-all"
                              title="แก้ไข"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(rep.deleteType, rep.deleteId)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-white hover:bg-red-500 transition-all"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && totalRecords > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs text-slate-500 flex items-center gap-2">
                แสดงต่อหน้า
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <Pagination page={page} totalItems={totalRecords} pageSize={pageSize} onPageChange={setPage} />
            </div>
          )}
        </div>

      </div>

      <ReportDetailModal
        isOpen={modalOpen}
        mode={modalMode}
        report={selectedReport}
        onClose={() => { setModalOpen(false); setSelectedReport(null); }}
        onSaved={() => fetchAllReports()}
        onDeleted={() => fetchAllReports()}
        userName={userName}
        userEmployeeId={userEmployeeId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
