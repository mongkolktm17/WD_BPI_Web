'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import Pagination from '@/components/Pagination';
import { ShieldCheck, Plus, Search, RefreshCw, Trash2, Pencil, Users, Upload } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { apiFetch } from '@/lib/api';

interface Officer {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  titleName?: string;
  position?: string;
  company?: string;
  siteLocation?: string;
  shift?: string;
  status: string;
  createdAt?: string;
}

const SHIFT_OPTIONS = [
  { value: 'เช้า', label: 'เช้า (07:00 - 19:00)' },
  { value: 'ดึก', label: 'ดึก (19:00 - 07:00)' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'ปฏิบัติงาน' },
  { value: 'inactive', label: 'หยุดงาน' },
];

const TITLE_OPTIONS = [
  { value: 'นาย', label: 'นาย' },
  { value: 'นาง', label: 'นาง' },
  { value: 'นางสาว', label: 'นางสาว' },
];

export default function ManageOfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const [form, setForm] = useState({
    titleName: 'นาย',
    firstName: '',
    lastName: '',
    employeeId: '',
    position: '',
    company: '',
    siteLocation: '',
    shift: 'เช้า',
    status: 'active',
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchOfficers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; data: Officer[] }>('/api/officers');
      setOfficers(res.data || []);
    } catch {
      setMessage('ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);

  const emptyForm = { titleName: 'นาย', firstName: '', lastName: '', employeeId: '', position: '', company: '', siteLocation: '', shift: 'เช้า', status: 'active' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.employeeId.trim()) {
      setMessage('กรุณากรอกชื่อ นามสกุล และรหัสพนักงาน');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId !== null) {
        await apiFetch(`/api/officers/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setMessage('แก้ไขเจ้าหน้าที่เรียบร้อยแล้ว');
      } else {
        await apiFetch('/api/officers', {
          method: 'POST',
          body: JSON.stringify({ ...form, status: 'active' }),
        });
        setMessage('เพิ่มเจ้าหน้าที่เรียบร้อยแล้ว');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      fetchOfficers();
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (off: Officer) => {
    setEditingId(off.id);
    setForm({
      titleName: off.titleName || 'นาย',
      firstName: off.firstName || '',
      lastName: off.lastName || '',
      employeeId: off.employeeId || '',
      position: off.position || '',
      company: off.company || '',
      siteLocation: off.siteLocation || '',
      shift: off.shift || 'เช้า',
      status: off.status || 'active',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเจ้าหน้าที่นี้?')) return;
    try {
      await apiFetch(`/api/officers/${id}`, { method: 'DELETE' });
      setMessage('ลบเจ้าหน้าที่เรียบร้อยแล้ว');
      if (editingId === id) handleCancelForm();
      fetchOfficers();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const handleToggleStatus = async (off: Officer) => {
    try {
      await apiFetch(`/api/officers/${off.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: off.status === 'active' ? 'inactive' : 'active' }),
      });
      setMessage('เปลี่ยนสถานะเรียบร้อยแล้ว');
      fetchOfficers();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ''));
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = useCallback(async () => {
    if (!csvText.trim()) {
      setMessage('กรุณาวางข้อมูล CSV หรือเลือกไฟล์ .csv');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const payload: Array<{ titleName: string; firstName: string; lastName: string; employeeId: string; position: string; company: string; siteLocation: string; shift: string; status: string }> = [];
      for (const line of csvText.trim().split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split(',').map(p => p.trim());
        // ข้ามแถวที่ไม่ครบ 4 ฟิลด์แรก (คำนำหน้า,ชื่อ,นามสกุล,รหัสพนักงาน)
        if (parts.length < 4 || !parts[0] || !parts[1] || !parts[2] || !parts[3]) continue;
        payload.push({
          titleName: parts[0],
          firstName: parts[1],
          lastName: parts[2],
          employeeId: parts[3],
          position: parts[4] || '',
          company: parts[5] || '',
          siteLocation: parts[6] || '',
          shift: parts[7] || 'เช้า',
          status: 'active',
        });
      }
      if (payload.length === 0) {
        throw new Error('ไม่พบข้อมูลที่ถูกต้องใน CSV (ต้องมีครบ 4 คอลัมน์แรก)');
      }
      const data = await apiFetch<{ created: number; skipped: number; errors: string[] }>('/api/officers/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setImportResult(data);
      setMessage(`นำเข้าเสร็จ: สร้าง ${data.created || 0} ข้าม ${data.skipped || 0} รายการ`);
      fetchOfficers();
    } catch (err: any) {
      setMessage(err?.message || 'ไม่สามารถนำเข้าข้อมูลได้');
    } finally {
      setImporting(false);
    }
  }, [csvText, fetchOfficers]);

  const filtered = officers.filter(o =>
    o.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.employeeId?.includes(searchTerm) ||
    o.siteLocation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">

        <PageHeader
          title="จัดการข้อมูลเจ้าหน้าที่"
          subtitle={`Manage Officers (${filtered.length} คน)`}
          icon={<Users className="w-5 h-5 md:w-6 h-6 text-white" />}
          actions={
            <div className="flex gap-2">
              <button onClick={() => setShowImport(!showImport)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-xs md:text-sm flex items-center gap-1.5">
                <Upload className="w-4 h-4" />นำเข้า
              </button>
              <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-xs md:text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" />เพิ่มเจ้าหน้าที่
              </button>
            </div>
          }
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Import Panel */}
        {showImport && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6 space-y-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800">นำเข้าข้อมูลเจ้าหน้าที่จาก CSV</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>CSV 8 คอลัมน์ตามลำดับ: คำนำหน้า,ชื่อ,นามสกุล,รหัสพนักงาน,ตำแหน่ง,บริษัท,พื้นที่,กะ</li>
                <li>ระบบจะข้ามแถวว่าง และแถวที่ 4 ฟิลด์แรกไม่ครบ</li>
                <li>ตัวอย่าง: นาย,สมชาย,ใจดี,10000001,รปภ.,ABC,อาคาร A,เช้า</li>
              </ul>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">เลือกไฟล์ .csv</label>
              <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">วางข้อมูล CSV</label>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none placeholder-slate-400"
                placeholder={`นาย,สมชาย,ใจดี,10000001,รปภ.,ABC,อาคาร A,เช้า\nนางสาว,สมหญิง,รักงาน,10000002,รปภ.,ABC,อาคาร B,ดึก`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowImport(false); setCsvText(''); setImportResult(null); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors">ปิด</button>
              <button onClick={handleImport} disabled={importing} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-md transition-all text-sm">
                {importing ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
              </button>
            </div>
            {importResult && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm space-y-1">
                <div className="text-emerald-700 font-semibold">สร้างใหม่: {importResult.created ?? 0} รายการ</div>
                <div className="text-amber-700 font-semibold">ข้าม: {importResult.skipped ?? 0} รายการ</div>
                {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 pt-2">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="text-xs p-2 rounded-lg bg-rose-50 text-rose-700">{err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Officer Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">{editingId !== null ? `แก้ไขเจ้าหน้าที่ #${editingId}` : 'เพิ่มเจ้าหน้าที่ใหม่'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnimatedDropdown
                options={TITLE_OPTIONS}
                value={form.titleName}
                onChange={(v) => setForm({ ...form, titleName: v })}
                label="คำนำหน้า *"
              />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อ <span className="text-rose-500">*</span></label>
                <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">นามสกุล <span className="text-rose-500">*</span></label>
                <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">รหัสพนักงาน <span className="text-rose-500">*</span></label>
                <input type="text" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ตำแหน่ง</label>
                <input type="text" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">บริษัท</label>
                <input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">พื้นที่ปฏิบัติงาน</label>
                <input type="text" value={form.siteLocation} onChange={e => setForm({ ...form, siteLocation: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <AnimatedDropdown
                options={SHIFT_OPTIONS}
                value={form.shift || 'เช้า'}
                onChange={(v) => setForm({ ...form, shift: v })}
                label="กะการทำงาน"
              />
              <AnimatedDropdown
                options={STATUS_OPTIONS}
                value={form.status || 'active'}
                onChange={(v) => setForm({ ...form, status: v })}
                label="สถานะ"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleCancelForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors">ยกเลิก</button>
              <button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-transform active:scale-95 text-sm disabled:opacity-50">
                {submitting ? 'กำลังบันทึก...' : editingId !== null ? '💾 บันทึกการแก้ไข' : '💾 บันทึก'}
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="ค้นหาชื่อ, รหัสพนักงาน, หรือพื้นที่..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm" />
          </div>
        </div>

        {/* Officers Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-blue-500 animate-spin mr-2" /><span className="text-slate-400 text-sm">กำลังโหลด...</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">รหัสพนักงาน</th>
                    <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3 hidden md:table-cell">ตำแหน่ง</th>
                    <th className="px-4 py-3 hidden md:table-cell">บริษัท</th>
                    <th className="px-4 py-3">กะ</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">ไม่มีข้อมูลเจ้าหน้าที่</td></tr>
                  ) : paged.map(off => (
                    <tr key={off.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-600">{off.employeeId}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{off.titleName} {off.firstName} {off.lastName}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{off.position || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{off.company || '-'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-bold">{off.shift || '-'}</span></td>
                      <td className="px-4 py-3"><button onClick={() => handleToggleStatus(off)} title="เปลี่ยนสถานะ" className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${off.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{off.status === 'active' ? 'ปฏิบัติงาน' : 'หยุดงาน'}</button></td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleEdit(off)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="แก้ไข"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(off.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-slate-200">
              <Pagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
