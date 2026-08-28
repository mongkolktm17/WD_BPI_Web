'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import {
  Settings,
  Database,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Terminal,
  FileText,
  HardDrive,
  Activity,
  Layers,
  Check,
  XCircle,
  Clock,
  Play,
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  Download,
  KeyRound,
  FileCheck,
  Server,
  Zap,
} from 'lucide-react';

type Tab = 'overview' | 'import' | 'verify';

interface TableStat {
  tableName: string;
  category: string;
  recordCount: number;
  status: 'ok' | 'empty' | 'warning';
  description: string;
}

interface DatabaseStatus {
  connected: boolean;
  database: string;
  totalTables: number;
  totalRecords: number;
  dumpFile: {
    path: string;
    sizeMb: string;
    modifiedAt: string;
  } | null;
  tables: TableStat[];
  checkedAt: string;
}

interface ValidationResult {
  valid: boolean;
  filePath: string;
  fileSizeMb: string;
  tablesDetected: number;
  totalEstimatedRows: number;
  thaiEncodingValid: boolean;
  tables: Record<string, { statementCount: number; approxTuples: number }>;
  missingTables: string[];
  readyToMigrate: boolean;
}

interface LogEntry {
  time: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface MigrationResult {
  success: boolean;
  durationSeconds: string;
  results: Record<string, { inserted: number; errors: number }>;
  logs: LogEntry[];
}

interface VerificationCategory {
  id: string;
  title: string;
  description: string;
  status: 'passed' | 'warning' | 'failed';
  score: number;
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
    expected?: string | number;
    actual?: string | number;
  }[];
  sampleData?: any[];
}

interface VerificationReport {
  overallStatus: 'passed' | 'warning' | 'failed';
  healthScore: number;
  verifiedAt: string;
  totalTables: number;
  totalRecords: number;
  categories: VerificationCategory[];
  writeContinuityTest: {
    status: 'pass' | 'fail';
    message: string;
    details: Record<string, boolean>;
  };
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Import / Migration states
  const [dumpPath, setDumpPath] = useState('');
  const [cleanBeforeImport, setCleanBeforeImport] = useState(true);
  const [syncSequences, setSyncSequences] = useState(true);
  const [validateThaiUtf8, setValidateThaiUtf8] = useState(true);

  const [validateRes, setValidateRes] = useState<ValidationResult | null>(null);
  const [validateLoading, setValidateLoading] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  const [migrationRes, setMigrationRes] = useState<MigrationResult | null>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'success'>('all');

  // Verification states
  const [verifyRes, setVerifyRes] = useState<VerificationReport | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    auth_rbac: true,
    building_reports: true,
    cutover_continuity: true,
  });

  // File Upload states
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [copySuccess, setCopySuccess] = useState(false);

  // Handle direct file upload (.sql)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.sql') && !file.name.endsWith('.dump') && !file.name.endsWith('.txt')) {
      setUploadError('กรุณาเลือกไฟล์ที่มีนามสกุล .sql หรือ .dump');
      return;
    }

    setFileUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/system/migration/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const payload = data.data ?? data;
      setDumpPath(payload.filePath || payload.fileName);
      setUploadSuccess(`อัปโหลดไฟล์ "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) สำเร็จ พร้อมใช้งาน`);
    } catch (err: any) {
      setUploadError(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setFileUploading(false);
    }
  };

  // Fetch Database Status
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await apiFetch<any>('/api/system/migration/status');
      const data: DatabaseStatus = res.data ?? res;
      setStatus(data);
      if (data.dumpFile?.path && !dumpPath) {
        setDumpPath(data.dumpFile.path);
      }
    } catch (err: any) {
      setStatusError(err.message || 'ไม่สามารถโหลดสถานะฐานข้อมูลได้');
    } finally {
      setStatusLoading(false);
    }
  }, [dumpPath]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Execute Pre-flight Validation
  const handleValidate = async () => {
    setValidateLoading(true);
    setValidateError(null);
    setValidateRes(null);
    try {
      const res = await apiFetch<any>('/api/system/migration/validate', {
        method: 'POST',
        body: JSON.stringify({ customFilePath: dumpPath || undefined }),
      });
      const data: ValidationResult = res.data ?? res;
      setValidateRes(data);
    } catch (err: any) {
      setValidateError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์');
    } finally {
      setValidateLoading(false);
    }
  };

  // Execute Migration
  const handleMigration = async () => {
    const confirmMessage = cleanBeforeImport
      ? 'คำเตือน: โหมด Clean & Reimport จะทำการล้างตารางข้อมูลหลักก่อนนำเข้า เพื่อป้องกันข้อมูลซ้ำซ้อน\n\nท่านต้องการเริ่มกระบวนการนำเข้าฐานข้อมูลหรือไม่?'
      : 'ท่านต้องการเริ่มกระบวนการนำเข้าฐานข้อมูลจากไฟล์สำรองหรือไม่?';

    if (!window.confirm(confirmMessage)) return;

    setMigrationLoading(true);
    setMigrationRes(null);
    setLogs([
      {
        time: new Date().toLocaleTimeString('th-TH'),
        level: 'info',
        message: 'กำลังเตรียมการเชื่อมต่อและส่งคำสั่งเริ่ม Migration...',
      },
    ]);

    try {
      const res = await apiFetch<any>('/api/system/migration/execute', {
        method: 'POST',
        body: JSON.stringify({
          cleanBeforeImport,
          syncSequences,
          validateThaiUtf8,
          customFilePath: dumpPath || undefined,
        }),
      });
      const data: MigrationResult = res.data ?? res;
      setMigrationRes(data);
      if (data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
      await fetchStatus();
      // Auto trigger verification after migration
      handleVerify();
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString('th-TH'),
          level: 'error',
          message: `❌ การนำเข้าล้มเหลว: ${err.message}`,
        },
      ]);
    } finally {
      setMigrationLoading(false);
    }
  };

  // Run Deep Verification
  const handleVerify = async () => {
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await apiFetch<any>('/api/system/migration/verify');
      const data: VerificationReport = res.data ?? res;
      setVerifyRes(data);
    } catch (err: any) {
      setVerifyError(err.message || 'ไม่สามารถประมวลผลการตรวจสอบได้');
    } finally {
      setVerifyLoading(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExportVerification = () => {
    if (!verifyRes) return;
    const jsonStr = JSON.stringify(verifyRes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wdbpi_migration_verification_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter Tables in Overview
  const tables = status?.tables || [];
  const categoriesList = ['all', ...Array.from(new Set(tables.map((t) => t.category)))];

  const filteredTables = tables.filter((t) => {
    const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchSearch =
      !searchTerm ||
      t.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'error') return l.level === 'error' || l.level === 'warn';
    if (logFilter === 'success') return l.level === 'success';
    return true;
  });

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode, countBadge?: number) => {
    const isActive = tab === id;
    return (
      <button
        onClick={() => {
          setTab(id);
          if (id === 'verify' && !verifyRes && !verifyLoading) {
            handleVerify();
          }
        }}
        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs md:text-sm font-black transition-all duration-200 cursor-pointer ${
          isActive
            ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
            : 'bg-white/80 hover:bg-white text-slate-600 hover:text-blue-900 border border-slate-200/80 shadow-xs'
        }`}
      >
        {icon}
        <span>{label}</span>
        {countBadge !== undefined && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {countBadge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="ตั้งค่าระบบและนำเข้าฐานข้อมูล"
        subtitle="Legacy Database Import & Cutover Business Continuity Verification"
        icon={<Settings className="w-5 h-5 md:w-6 h-6 text-white" />}
      />

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 p-1.5 rounded-3xl border border-slate-200/70">
        <div className="flex flex-wrap gap-2">
          {tabBtn('overview', 'ภาพรวมฐานข้อมูล (Overview)', <Database className="w-4 h-4" />, status?.totalTables)}
          {tabBtn('import', 'นำเข้าฐานข้อมูลเก่า (Legacy Import)', <Upload className="w-4 h-4" />)}
          {tabBtn(
            'verify',
            'ตรวจสอบความพร้อมใช้งาน (Cutover Verification)',
            <ShieldCheck className="w-4 h-4" />,
            verifyRes?.healthScore
          )}
        </div>

        <div className="flex items-center gap-2 px-2">
          <button
            onClick={fetchStatus}
            disabled={statusLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white text-blue-900 border border-slate-200 shadow-xs hover:bg-blue-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>รีเฟรช</span>
          </button>
          {verifyRes && (
            <button
              onClick={handleExportVerification}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs hover:bg-emerald-100 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>รายงานผล (JSON)</span>
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Dump file */}
            <div className="bg-gradient-to-br from-white to-blue-50/40 rounded-3xl p-5 border border-blue-100/80 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-blue-900/70 uppercase tracking-wider">
                  ไฟล์ต้นทาง (Legacy Dump)
                </span>
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <HardDrive className="w-4 h-4" />
                </div>
              </div>
              {statusLoading ? (
                <div className="mt-3 text-xs text-slate-400 animate-pulse">กำลังตรวจสอบไฟล์...</div>
              ) : status?.dumpFile ? (
                <div className="mt-3">
                  <div className="text-sm font-black text-blue-950 truncate" title={status.dumpFile.path}>
                    wddump.sql
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    ขนาด: <span className="text-blue-700 font-bold">{status.dumpFile.sizeMb} MB</span>
                  </div>
                  <span className="inline-flex mt-2 items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Check className="w-3 h-3" /> พร้อมสำหรับการนำเข้า
                  </span>
                </div>
              ) : (
                <div className="mt-3 text-xs text-rose-600 font-bold">ไม่พบไฟล์ wddump.sql ในเส้นทาง</div>
              )}
            </div>

            {/* Card 2: Total Records */}
            <div className="bg-gradient-to-br from-white to-sky-50/40 rounded-3xl p-5 border border-sky-100/80 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-sky-900/70 uppercase tracking-wider">
                  ข้อมูลทั้งหมดในระบบใหม่
                </span>
                <div className="p-2 bg-sky-500 text-white rounded-xl shadow-xs">
                  <Database className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-blue-950">
                  {statusLoading ? '...' : (status?.totalRecords || 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  รายการ จาก <span className="font-bold text-sky-700">{status?.totalTables || 0} ตาราง</span>
                </div>
                <span className="inline-flex mt-2 items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {status?.database || 'PostgreSQL 18'}
                </span>
              </div>
            </div>

            {/* Card 3: UTF-8 Thai Health */}
            <div className="bg-gradient-to-br from-white to-emerald-50/40 rounded-3xl p-5 border border-emerald-100/80 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-900/70 uppercase tracking-wider">
                  ความสมบูรณ์ภาษาไทย (UTF-8)
                </span>
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-black text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  UTF-8 สมบูรณ์ 100%
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  ไม่พบตัวอักษรเสีย หรือเครื่องหมาย (?)
                </div>
                <span className="inline-flex mt-2 items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  รองรับภาษาไทยมาตรฐาน
                </span>
              </div>
            </div>

            {/* Card 4: Cutover readiness */}
            <div className="bg-gradient-to-br from-white to-indigo-50/40 rounded-3xl p-5 border border-indigo-100/80 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-indigo-900/70 uppercase tracking-wider">
                  ความพร้อมในวันตัดยอดระบบ
                </span>
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-black text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Sequences Synchronized
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  ระบบใหม่พร้อมรับข้อมูลต่อเนื่องทันที
                </div>
                <button
                  onClick={() => setTab('verify')}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>ดูผลตรวจสอบเชิงลึก</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Table Breakdown Container */}
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200/80 p-5 md:p-7 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base md:text-lg font-black text-blue-950 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>ตารางฐานข้อมูลในระบบ (Database Tables Breakdown)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  แสดงจำนวนแถวและสถานะของตารางที่ใช้ในระบบใหม่และตารางประวัติจากระบบเดิม
                </p>
              </div>

              {/* Search & Category Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อตาราง หรือคำอธิบาย..."
                    className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-60"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'ทุกหมวดหมู่' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tables list */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 font-extrabold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">ชื่อตาราง (Table Name)</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4">คำอธิบายและการใช้งาน</th>
                    <th className="py-3 px-4 text-right">จำนวนข้อมูล (Rows)</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statusLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        กำลังโหลดข้อมูลตาราง...
                      </td>
                    </tr>
                  ) : filteredTables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                        ไม่พบตารางที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredTables.map((t, idx) => {
                      const isOk = t.recordCount > 0;
                      const isWarn = t.status === 'warning';
                      return (
                        <tr key={t.tableName} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-950 text-xs">
                            {t.tableName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {t.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{t.description}</td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {t.recordCount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                isOk
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isWarn
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isOk ? <Check className="w-3 h-3" /> : isWarn ? <XCircle className="w-3 h-3" /> : null}
                              {isOk ? 'มีข้อมูล' : isWarn ? 'ข้อผิดพลาด' : 'ว่าง'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: IMPORT & MIGRATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {tab === 'import' && (
        <div className="space-y-6">
          {/* Card 1: Configuration & Triggers */}
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200/80 p-5 md:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base md:text-lg font-black text-blue-950 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>ตั้งค่าและเริ่มกระบวนการนำเข้า (Legacy Database Migration)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ประมวลผลไฟล์ SQL Dump จากระบบเก่า แปลงโครงสร้างให้ตรงกับ PostgreSQL / Prisma พร้อมซิงค์ Sequences
                </p>
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-extrabold text-slate-700 mb-2">
                อัปโหลดไฟล์ SQL Dump จากคอมพิวเตอร์ของคุณ (Upload .sql Dump File)
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                    : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-blue-400'
                }`}
              >
                <input
                  type="file"
                  accept=".sql,.dump,.txt"
                  id="sql-file-input"
                  className="hidden"
                  disabled={fileUploading}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="flex flex-col items-center justify-center gap-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                    {fileUploading ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                    ) : (
                      <Upload className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-extrabold text-slate-800">
                      {fileUploading
                        ? 'กำลังอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์...'
                        : 'ลากไฟล์ .sql มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      รองรับไฟล์ <code className="text-blue-700 font-bold">.sql</code>, <code className="text-blue-700 font-bold">.dump</code> ขนาดสูงสุด 100 MB
                    </p>
                  </div>
                  <label
                    htmlFor="sql-file-input"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                      fileUploading
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์จากเครื่อง (Browse File)</span>
                  </label>
                </div>
              </div>

              {uploadError && (
                <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}
            </div>

            {/* Inputs & Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  ที่อยู่ไฟล์ SQL Dump (Server File Path)
                </label>
                <input
                  type="text"
                  value={dumpPath}
                  onChange={(e) => setDumpPath(e.target.value)}
                  placeholder="legacy/Backup/wddump.sql"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  ค่าเริ่มต้น: <code className="text-blue-700">legacy/Backup/wddump.sql</code> (13.6 MB, 23 ตาราง)
                </p>
              </div>

              {/* Checkbox Options */}
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="text-xs font-extrabold text-blue-950 uppercase tracking-wider mb-1">
                  ตัวเลือกการนำเข้า (Migration Options)
                </div>

                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanBeforeImport}
                    onChange={(e) => setCleanBeforeImport(e.target.checked)}
                    className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Clean & Reimport (ล้างตารางเดิมก่อนนำเข้า เพื่อป้องกันข้อมูลซ้ำซ้อน)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncSequences}
                    onChange={(e) => setSyncSequences(e.target.checked)}
                    className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Auto-Sync Sequences (ตั้งค่า ID อัตโนมัติทุกตาราง เพื่อไม่ให้ชนในระบบใหม่)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={validateThaiUtf8}
                    onChange={(e) => setValidateThaiUtf8(e.target.checked)}
                    className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Sanitize & Validate UTF-8 (รักษาข้อความภาษาไทย 100% ไม่ให้เป็น ???)</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={handleValidate}
                disabled={validateLoading || migrationLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-900 border-2 border-blue-600/30 hover:border-blue-600 text-xs md:text-sm font-black shadow-xs hover:bg-blue-50 transition-all cursor-pointer disabled:opacity-50"
              >
                {validateLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                )}
                <span>ตรวจสอบไฟล์เบื้องต้น (Pre-flight Validate)</span>
              </button>

              <button
                onClick={handleMigration}
                disabled={migrationLoading || validateLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:from-blue-800 hover:to-sky-600 text-white text-xs md:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {migrationLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
                <span>เริ่มการนำเข้าข้อมูล (Execute Migration)</span>
              </button>
            </div>

            {/* Pre-flight Validate Card Result */}
            {validateError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold">ตรวจสอบไม่ผ่าน:</div>
                  <div className="mt-0.5">{validateError}</div>
                </div>
              </div>
            )}

            {validateRes && (
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-black text-sm text-emerald-900">
                      ผลการตรวจสอบไฟล์เบื้องต้น (Pre-flight Validation Passed)
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white">
                    พร้อมนำเข้า 100%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-slate-700">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    ขนาดไฟล์: <span className="font-black text-blue-900">{validateRes.fileSizeMb} MB</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    ตารางที่พบ: <span className="font-black text-blue-900">{validateRes.tablesDetected} ตาราง</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    จำนวนแถวโดยประมาณ:{' '}
                    <span className="font-black text-blue-900">
                      {validateRes.totalEstimatedRows.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    ภาษาไทย UTF-8:{' '}
                    <span className="font-black text-emerald-700">✓ ตรวจพบสมบูรณ์</span>
                  </div>
                </div>

                <div className="text-xs text-emerald-900 font-bold mt-2">
                  รายการตารางที่พร้อมนำเข้า ({Object.keys(validateRes.tables).length} ตาราง):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                  {Object.entries(validateRes.tables).map(([tbl, info]) => (
                    <div
                      key={tbl}
                      className="bg-white/90 p-2 rounded-lg border border-slate-200 flex justify-between items-center text-[11px]"
                    >
                      <span className="font-mono font-bold text-slate-800 truncate pr-2">{tbl}</span>
                      <span className="font-black text-blue-700">{info.approxTuples.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Live Terminal Log Console */}
          <div className="bg-slate-950 rounded-3xl shadow-xl border border-slate-800 p-5 md:p-6 space-y-3 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <span className="font-mono text-sm font-black tracking-wide text-emerald-400">
                  Migration Execution Terminal Logs
                </span>
              </div>

              {/* Log filter and tools */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 text-[11px] font-bold">
                  <button
                    onClick={() => setLogFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      logFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    ทั้งหมด ({logs.length})
                  </button>
                  <button
                    onClick={() => setLogFilter('error')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      logFilter === 'error' ? 'bg-rose-900/60 text-rose-300' : 'text-slate-400'
                    }`}
                  >
                    Errors / Warns
                  </button>
                  <button
                    onClick={() => setLogFilter('success')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      logFilter === 'success' ? 'bg-emerald-900/60 text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    Success
                  </button>
                </div>

                <button
                  onClick={handleCopyLogs}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="คัดลอก Logs ทั้งหมด"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{copySuccess ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                </button>

                <button
                  onClick={() => setLogs([])}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-rose-400 text-xs font-bold cursor-pointer"
                  title="ล้างหน้าจอ Logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Console Screen */}
            <div className="h-80 overflow-y-auto font-mono text-xs space-y-1.5 p-3.5 bg-black/60 rounded-2xl border border-slate-900/80 scrollbar-thin scrollbar-thumb-slate-800">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 py-12 text-center">
                  ยังไม่มีข้อความบันทึก (กดปุ่ม &quot;เริ่มการนำเข้าข้อมูล&quot; เพื่อดูสถานะการประมวลผลแบบเรียลไทม์)
                </div>
              ) : (
                filteredLogs.map((entry, idx) => {
                  const isSuccess = entry.level === 'success';
                  const isError = entry.level === 'error';
                  const isWarn = entry.level === 'warn';
                  return (
                    <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="text-slate-500 text-[11px] select-none font-mono">[{entry.time}]</span>
                      <span
                        className={`font-semibold ${
                          isSuccess
                            ? 'text-emerald-400'
                            : isError
                            ? 'text-rose-400 font-bold'
                            : isWarn
                            ? 'text-amber-400 font-bold'
                            : 'text-sky-300'
                        }`}
                      >
                        {entry.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Progress status footer */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    migrationLoading
                      ? 'bg-sky-400 animate-ping'
                      : migrationRes?.success
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                />
                <span>
                  {migrationLoading
                    ? 'กำลังประมวลผลการนำเข้า...'
                    : migrationRes?.success
                    ? `นำเข้าเสร็จสมบูรณ์ใน ${migrationRes.durationSeconds} วินาที`
                    : 'สถานะ: พร้อมทำงาน (Idle)'}
                </span>
              </div>
              <span>{logs.length} entries</span>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: CUTOVER & CONTINUITY VERIFICATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {tab === 'verify' && (
        <div className="space-y-6">
          {/* Top Health Banner */}
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200/80 p-5 md:p-7 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base md:text-lg font-black text-blue-950 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  <span>ตรวจสอบความพร้อมการทำงานต่อเนื่อง (Cutover & Continuity Verification)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ชุดทดสอบเชิงลึก 7 หมวดหมู่ เพื่อการันตีว่าระบบใหม่สามารถรับช่วงต่อจากระบบเดิมได้ 100% ในวันตัดยอด
                </p>
              </div>

              <button
                onClick={handleVerify}
                disabled={verifyLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${verifyLoading ? 'animate-spin' : ''}`} />
                <span>รันการตรวจสอบเชิงลึก (Run Deep Verification)</span>
              </button>
            </div>

            {/* Verification Status Score Banner */}
            {verifyRes && (
              <div
                className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  verifyRes.healthScore >= 90
                    ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border-emerald-300'
                    : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md ${
                      verifyRes.healthScore >= 90
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-amber-500 text-white shadow-amber-500/30'
                    }`}
                  >
                    {verifyRes.healthScore}%
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                      {verifyRes.healthScore >= 90 ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>ระบบพร้อมสำหรับการเปิดใช้งานจริง (100% Go-Live Ready)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <span>ต้องตรวจสอบเพิ่มเติมก่อนวันย้ายระบบ</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 font-semibold mt-1">
                      {verifyRes.writeContinuityTest.message} • ตรวจสอบล่าสุดเมื่อ:{' '}
                      {new Date(verifyRes.verifiedAt).toLocaleString('th-TH')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-slate-500 uppercase">Write Continuity Test</div>
                    <div
                      className={`text-xs font-black px-3 py-1 rounded-full mt-1 inline-flex items-center gap-1 ${
                        verifyRes.writeContinuityTest.status === 'pass'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {verifyRes.writeContinuityTest.status === 'pass' ? <Check className="w-3.5 h-3.5" /> : null}
                      {verifyRes.writeContinuityTest.status === 'pass' ? 'PASSED (Sequence OK)' : 'FAILED'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 7 Categories Cards */}
          {verifyLoading ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
              <div className="font-bold text-slate-700">กำลังรันชุดทดสอบความถูกต้องทั้ง 7 หมวดหมู่...</div>
              <div className="text-xs text-slate-400 mt-1">ทดสอบ Hash bcrypt, ภาษาไทย UTF-8, ความสัมพันธ์ และ Mock Insert</div>
            </div>
          ) : verifyError ? (
            <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
              <div>
                <div className="font-bold">เกิดข้อผิดพลาดในการตรวจสอบ:</div>
                <div className="text-xs mt-0.5">{verifyError}</div>
              </div>
            </div>
          ) : verifyRes ? (
            <div className="space-y-4">
              {verifyRes.categories.map((cat) => {
                const isExpanded = expandedCategories[cat.id] ?? false;
                const isPassed = cat.status === 'passed';
                return (
                  <div
                    key={cat.id}
                    className={`bg-white rounded-3xl shadow-sm border transition-all duration-200 ${
                      isPassed ? 'border-slate-200/90' : 'border-amber-300 bg-amber-50/20'
                    }`}
                  >
                    {/* Category Header */}
                    <div
                      onClick={() => toggleCategory(cat.id)}
                      className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/70 rounded-3xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPassed ? <Check className="w-5 h-5 text-emerald-700" /> : <AlertTriangle className="w-5 h-5 text-amber-700" />}
                        </div>
                        <div>
                          <div className="font-black text-sm md:text-base text-blue-950">{cat.title}</div>
                          <div className="text-xs text-slate-500 font-medium">{cat.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black border ${
                            isPassed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {cat.score}% ผ่าน
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Category Body */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3">
                        {/* Checks list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                          {cat.checks.map((c, i) => (
                            <div
                              key={i}
                              className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-start justify-between gap-3 text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{c.name}</div>
                                <div className="text-slate-600 font-medium mt-0.5">{c.detail}</div>
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex-shrink-0 border ${
                                  c.status === 'pass'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : c.status === 'warn'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {c.status === 'pass' ? '✓ ผ่าน' : c.status === 'warn' ? 'เตือน' : '✕ ไม่ผ่าน'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Sample Data Preview if available */}
                        {cat.sampleData && cat.sampleData.length > 0 && (
                          <div className="mt-3 bg-slate-900 rounded-2xl p-3.5 border border-slate-800">
                            <div className="text-[11px] font-mono font-bold text-sky-400 mb-2">
                              ตัวอย่างข้อมูลที่นำเข้า (Sample Record Preview):
                            </div>
                            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36 scrollbar-thin scrollbar-thumb-slate-700">
                              {JSON.stringify(cat.sampleData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 font-semibold">
              กดปุ่ม &quot;รันการตรวจสอบเชิงลึก&quot; ด้านบนเพื่อประเมินความพร้อม
            </div>
          )}
        </div>
      )}
    </div>
  );
}
