'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  User,
  ChevronRight,
  Eye,
  Check,
  X,
  RefreshCw,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSite } from '@/lib/SiteContext';

interface FormSubmission {
  id: number;
  templateId: number;
  siteId: number;
  status: 'submitted' | 'approved' | 'rejected';
  dataJson: any;
  attachmentsJson?: any;
  notes?: string;
  submittedAt: string;
  approvedAt?: string;
  template: {
    id: number;
    code: string;
    title: string;
    category: string;
  };
  site: {
    id: number;
    code: string;
    name: string;
  };
  submittedBy?: {
    id: number;
    username: string;
    name?: string;
  };
  approvedBy?: {
    id: number;
    username: string;
    name?: string;
  };
}

export default function SubmissionsPage() {
  const { currentSite, isExecutive } = useSite();
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<number | null>(
    isExecutive ? null : currentSite?.id || 1,
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSubmission, setActiveSubmission] = useState<FormSubmission | null>(null);

  // Approval modal state
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSiteFilter) {
        params.append('site_id', selectedSiteFilter.toString());
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('limit', '50');

      const res = await apiFetch<any>(`/api/dynamic-forms/submissions?${params.toString()}`);
      const payload = res?.data?.data || res?.data || res;
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
      setSubmissions(list);
      setTotalCount(payload?.total || list.length);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteFilter, statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handle Approve / Reject
  const handleUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (!activeSubmission) return;
    setReviewActionLoading(true);
    try {
      const res = await apiFetch<any>(
        `/api/dynamic-forms/submissions/${activeSubmission.id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status,
            notes: reviewNotes.trim() || undefined,
          }),
        },
      );

      if (res && res.success) {
        // Update local state
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === activeSubmission.id ? { ...sub, status } : sub)),
        );
        setActiveSubmission((prev) => (prev ? { ...prev, status } : null));
        setReviewNotes('');
        alert(status === 'approved' ? 'อนุมัติรายงานเรียบร้อยแล้ว' : 'ส่งกลับ / ปฏิเสธรายงานแล้ว');
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'โปรดลองอีกครั้ง'));
    } finally {
      setReviewActionLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = sub.template?.title?.toLowerCase().includes(q);
    const codeMatch = sub.template?.code?.toLowerCase().includes(q);
    const guardMatch =
      sub.dataJson?.guardInfo?.officerName?.toLowerCase().includes(q) ||
      sub.submittedBy?.name?.toLowerCase().includes(q);
    const locMatch = sub.dataJson?.guardInfo?.location?.toLowerCase().includes(q);
    return titleMatch || codeMatch || guardMatch || locMatch;
  });

  // Calculate metrics
  const pendingCount = submissions.filter((s) => s.status === 'submitted').length;
  const approvedCount = submissions.filter((s) => s.status === 'approved').length;
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Reports & Audit Logs
              </span>
              <span className="text-xs text-slate-500">
                ระบบจัดการและอนุมัติรายงานตรวจการ
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">รายการบันทึกรายงานตรวจการประจำวัน</h1>
            <p className="text-sm text-slate-400 mt-1">
              ตรวจสอบผลการตรวจของ รปภ., รูปภาพหลักฐาน, และอนุมัติรายงานแยกตามสาขา
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSubmissions}
              className="p-2.5 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl text-slate-300 hover:text-white transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/admin/forms"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition"
            >
              <FileText className="w-4 h-4" />
              คลังแบบฟอร์ม (Templates)
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>รายการทั้งหมด</span>
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">{totalCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">รายงานที่ส่งเข้ามาทั้งหมด</div>
          </div>

          <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
              <span>รอการตรวจสอบ</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300">{pendingCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">รอหัวหน้า รปภ./Site Manager ตรวจ</div>
          </div>

          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
              <span>อนุมัติแล้ว</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-300">{approvedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">ผ่านการรับรองความถูกต้อง</div>
          </div>

          <div className="bg-slate-900/60 border border-rose-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
              <span>ปฏิเสธ / ส่งกลับ</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-300">{rejectedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">พบข้อบกพร่อง / ให้แก้ไขใหม่</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Site Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedSiteFilter(null)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition whitespace-nowrap ${
                selectedSiteFilter === null
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              ทุกสาขา (All Sites)
            </button>
            <button
              onClick={() => setSelectedSiteFilter(1)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition whitespace-nowrap flex items-center gap-1.5 ${
                selectedSiteFilter === 1
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              สาขาบางปะอิน (BPI)
            </button>
            <button
              onClick={() => setSelectedSiteFilter(2)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition whitespace-nowrap flex items-center gap-1.5 ${
                selectedSiteFilter === 2
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              สาขาปราจีนบุรี (PRB)
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหาชื่อฟอร์ม, ผู้ส่ง, จุดตรวจ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="submitted">รออนุมัติ (Submitted)</option>
              <option value="approved">อนุมัติแล้ว (Approved)</option>
              <option value="rejected">ปฏิเสธ (Rejected)</option>
            </select>
          </div>
        </div>

        {/* Submissions List / Table */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              กำลังโหลดรายการบันทึก...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              ไม่พบรายการบันทึกตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filteredSubmissions.map((sub) => {
                const guard = sub.dataJson?.guardInfo;
                const dateStr = sub.submittedAt
                  ? new Date(sub.submittedAt).toLocaleString('th-TH', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : '-';

                return (
                  <div
                    key={sub.id}
                    onClick={() => setActiveSubmission(sub)}
                    className="p-4 md:p-5 hover:bg-slate-850/60 transition cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-cyan-400 shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-400">#{sub.id}</span>
                          <h3 className="text-sm font-semibold text-white">
                            {sub.template?.title || 'แบบฟอร์มตรวจการ'}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${
                              sub.siteId === 2
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                            }`}
                          >
                            {sub.site?.code || (sub.siteId === 2 ? 'PRB' : 'BPI')}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/60">
                            {sub.template?.category || 'General'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            {guard?.officerName || sub.submittedBy?.name || 'รปภ. ประจำจุด'}
                          </span>
                          {guard?.location && (
                            <span className="text-slate-500">
                              • จุดตรวจ: <strong className="text-slate-300">{guard.location}</strong>
                            </span>
                          )}
                          {guard?.shift && (
                            <span className="text-slate-500">
                              • กะ: <strong className="text-slate-300">{guard.shift}</strong>
                            </span>
                          )}
                          <span className="text-slate-500">• {dateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl border ${
                          sub.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : sub.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {sub.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {sub.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                        {sub.status === 'submitted' && <Clock className="w-3.5 h-3.5" />}
                        {sub.status === 'approved'
                          ? 'อนุมัติแล้ว'
                          : sub.status === 'rejected'
                          ? 'ปฏิเสธ'
                          : 'รอตรวจ'}
                      </span>

                      <button
                        type="button"
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Submission Detail & Approval Drawer / Modal */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400">
                    รายงาน #{activeSubmission.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                      activeSubmission.siteId === 2
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {activeSubmission.site?.name ||
                      (activeSubmission.siteId === 2 ? 'ปราจีนบุรี' : 'บางปะอิน')}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  {activeSubmission.template?.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveSubmission(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Submitter & Metadata Card */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">ผู้ตรวจรายงาน:</span>
                  <span className="text-white font-medium">
                    {activeSubmission.dataJson?.guardInfo?.officerName ||
                      activeSubmission.submittedBy?.name ||
                      '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">รหัสพนักงาน:</span>
                  <span className="text-white font-medium">
                    {activeSubmission.dataJson?.guardInfo?.employeeId || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">จุดตรวจ / ป้อม:</span>
                  <span className="text-cyan-400 font-medium">
                    {activeSubmission.dataJson?.guardInfo?.location || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">กะปฏิบัติงาน:</span>
                  <span className="text-slate-200">
                    {activeSubmission.dataJson?.guardInfo?.shift || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">เวลาบันทึก:</span>
                  <span className="text-slate-300">
                    {new Date(activeSubmission.submittedAt).toLocaleString('th-TH')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">สถานะปัจจุบัน:</span>
                  <span
                    className={`font-semibold ${
                      activeSubmission.status === 'approved'
                        ? 'text-emerald-400'
                        : activeSubmission.status === 'rejected'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {activeSubmission.status === 'approved'
                      ? 'อนุมัติแล้ว'
                      : activeSubmission.status === 'rejected'
                      ? 'ปฏิเสธ'
                      : 'รอตรวจสอบ'}
                  </span>
                </div>
              </div>

              {/* Form Answers / Values */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  รายการตรวจและผลการประเมิน
                </h3>
                {activeSubmission.dataJson?.formValues ? (
                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/60 overflow-hidden">
                    {Object.entries(activeSubmission.dataJson.formValues).map(
                      ([key, val]: [string, any]) => {
                        const remark = activeSubmission.dataJson?.auditRemarks?.[key];
                        return (
                          <div key={key} className="p-3 flex items-start justify-between gap-4">
                            <div>
                              <div className="font-mono text-xs text-slate-400">{key}</div>
                              {remark && (
                                <div className="text-rose-400 text-xs mt-1 bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20">
                                  <strong>ระบุอาการ:</strong> {remark}
                                </div>
                              )}
                            </div>
                            <div>
                              {val === 'PASS' && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> ปกติ (PASS)
                                </span>
                              )}
                              {val === 'FAIL' && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                                  <XCircle className="w-3.5 h-3.5" /> ผิดปกติ (FAIL)
                                </span>
                              )}
                              {val === 'NA' && (
                                <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                                  N/A
                                </span>
                              )}
                              {val !== 'PASS' && val !== 'FAIL' && val !== 'NA' && (
                                <span className="text-xs text-white font-medium">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">ไม่มีข้อมูลคำตอบแบบละเอียด</div>
                )}
              </div>

              {/* Photos / Attachments */}
              {activeSubmission.attachmentsJson?.photos &&
                Object.keys(activeSubmission.attachmentsJson.photos).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      ภาพถ่ายหลักฐานแนบ
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(activeSubmission.attachmentsJson.photos).map(
                        ([key, url]: [string, any]) => (
                          <div
                            key={key}
                            className="bg-slate-950 p-2 rounded-xl border border-slate-800"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={key}
                              className="w-full h-36 object-cover rounded-lg mb-1"
                            />
                            <div className="text-[10px] text-slate-500 truncate">{key}</div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Signatures */}
              {activeSubmission.dataJson?.signatures &&
                Object.keys(activeSubmission.dataJson.signatures).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      การลงชื่อรับรอง (Digital Signature)
                    </h3>
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                      {Object.entries(activeSubmission.dataJson.signatures).map(
                        ([key, sign]: [string, any]) => (
                          <div key={key} className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">{key}:</span>
                            <span className="font-mono text-cyan-300 font-semibold">{sign}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Guard Notes */}
              {activeSubmission.notes && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ข้อสังเกตเพิ่มเติม
                  </h3>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                    {activeSubmission.notes}
                  </div>
                </div>
              )}

              {/* Approval Review Box */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  การประเมินและอนุมัติรายงาน (Supervisor Review)
                </h3>
                <input
                  type="text"
                  placeholder="ความเห็นหัวหน้างาน / ข้อเสนอแนะการแก้ไข (ถ้ามี)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSubmission(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                ปิด
              </button>

              <button
                type="button"
                disabled={reviewActionLoading || activeSubmission.status === 'rejected'}
                onClick={() => handleUpdateStatus('rejected')}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                ส่งกลับ / ปฏิเสธ
              </button>

              <button
                type="button"
                disabled={reviewActionLoading || activeSubmission.status === 'approved'}
                onClick={() => handleUpdateStatus('approved')}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                อนุมัติรายงาน (Approve)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
