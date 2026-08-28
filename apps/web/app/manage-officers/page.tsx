'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import Pagination from '@/components/Pagination';
import { ShieldCheck, Plus, Search, RefreshCw, Trash2, Users } from 'lucide-react';
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

  const [form, setForm] = useState({
    titleName: 'นาย',
    firstName: '',
    lastName: '',
    employeeId: '',
    position: '',
    company: '',
    siteLocation: '',
    shift: 'เช้า',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.employeeId.trim()) {
      setMessage('กรุณากรอกชื่อ นามสกุล และรหัสพนักงาน');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/officers', {
        method: 'POST',
        body: JSON.stringify({ ...form, status: 'active' }),
      });
      setMessage('เพิ่มเจ้าหน้าที่เรียบร้อยแล้ว');
      setForm({ titleName: 'นาย', firstName: '', lastName: '', employeeId: '', position: '', company: '', siteLocation: '', shift: 'เช้า' });
      setShowForm(false);
      fetchOfficers();
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเจ้าหน้าที่นี้?')) return;
    try {
      await apiFetch(`/api/officers/${id}`, { method: 'DELETE' });
      setMessage('ลบเจ้าหน้าที่เรียบร้อยแล้ว');
      fetchOfficers();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการลบ');
    }
  };

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
            <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-xs md:text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" />เพิ่มเจ้าหน้าที่
            </button>
          }
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Add Officer Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">เพิ่มเจ้าหน้าที่ใหม่</h3>
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
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors">ยกเลิก</button>
              <button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-transform active:scale-95 text-sm disabled:opacity-50">
                {submitting ? 'กำลังบันทึก...' : '💾 บันทึก'}
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
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs font-bold ${off.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{off.status === 'active' ? 'ปฏิบัติงาน' : 'หยุดงาน'}</span></td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDelete(off.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
