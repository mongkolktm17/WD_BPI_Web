'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Pagination from '@/components/Pagination';
import { Plus, Trash2, Pencil, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import PageHeader from '@/components/PageHeader';

interface RolePermission {
  id?: number;
  moduleName: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface Role {
  id: number;
  roleName: string;
  description?: string;
  permissions: RolePermission[];
}

const AVAILABLE_PAGES: Record<string, string> = {
  dashboard: 'แดชบอร์ด',
  cctv_report: 'รายงาน CCTV',
  cctv_angle_check: 'ตรวจมุมกล้อง',
  cctv_inspection: 'ตรวจเช็คห้อง CCTV',
  nvr_recording: 'บันทึก NVR',
  car_parking: 'จอดรถยนต์',
  guard_duty_log: 'บันทึกเวร',
  metal_detector: 'ตรวจจับโลหะ (Handheld)',
  walkthrough_detector: 'ตรวจจับโลหะ (Walkthrough)',
  patrol_checklist: 'รายการตรวจตรา',
  report_page: 'ศูนย์รายงาน',
  report_visual: 'รายงานกราฟิก',
  officers: 'จัดการเจ้าหน้าที่รักษาความปลอดภัย (Officers)',
};

export default function ManageRolesPage() {
  const authorized = useRequireAdmin();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const resetForm = () => {
    setRoleName('');
    setDescription('');
    setSelectedPages([]);
    setEditingId(null);
    setShowForm(false);
  };

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; data: Role[] }>('/api/roles');
      setRoles(res.data || []);
    } catch {
      setMessage('ไม่สามารถโหลดข้อมูล Role ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleCheckboxChange = (page: string) => {
    setSelectedPages(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!roleName.trim()) { setMessage('กรุณากรอกชื่อ Role'); return; }
    setSubmitting(true);
    try {
      const payload = {
        roleName: roleName.trim(),
        description: description.trim() || undefined,
        permissions: selectedPages.map(p => ({
          moduleName: p,
          canRead: true,
          canWrite: false,
          canDelete: false,
        })),
      };
      if (editingId !== null) {
        await apiFetch(`/api/roles/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('แก้ไข Role เรียบร้อยแล้ว');
      } else {
        await apiFetch('/api/roles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('เพิ่ม Role เรียบร้อยแล้ว');
      }
      resetForm();
      fetchRoles();
    } catch (err: any) {
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (r: Role) => {
    setEditingId(r.id);
    setRoleName(r.roleName || '');
    setDescription(r.description || '');
    setSelectedPages((r.permissions || []).map(p => p.moduleName));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ Role นี้?')) return;
    try {
      await apiFetch(`/api/roles/${id}`, { method: 'DELETE' });
      setMessage('ลบ Role เรียบร้อยแล้ว');
      if (editingId === id) resetForm();
      fetchRoles();
    } catch {
      setMessage('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const paged = roles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
      {authorized !== true && (
        <div className="p-8 text-center text-slate-500 text-sm">กำลังตรวจสอบสิทธิ์...</div>
      )}
      {authorized === true && (
      <>

        {/* Header */}
        <PageHeader
          title="จัดการ Role & สิทธิ์"
          subtitle="Roles & Permissions"
          icon={<ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          backHref="/admin/users"
          backLabel="← จัดการผู้ใช้"
          actions={
            <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-xs md:text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" />เพิ่ม Role
            </button>
          }
        />

        {message && (
          <div className={`p-4 rounded-xl text-center font-medium shadow ${message.includes('เรียบร้อย') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message}
          </div>
        )}

        {/* Add Role Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200/60 space-y-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">{editingId !== null ? `แก้ไขบทบาท #${editingId}` : 'เพิ่มบทบาทใหม่'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อบทบาท <span className="text-rose-500">*</span></label>
                <input type="text" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="เช่น Patrol Supervisor" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">คำอธิบาย</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="คำอธิบาย (ไม่บังคับ)" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">เลือกสิทธิ์การเข้าถึงหน้าระบบ</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(AVAILABLE_PAGES).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-blue-50/50 transition-colors">
                    <input type="checkbox" checked={selectedPages.includes(key)} onChange={() => handleCheckboxChange(key)} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors">ยกเลิก</button>
              <button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-transform active:scale-95 text-sm disabled:opacity-50">
                {submitting ? 'กำลังบันทึก...' : editingId !== null ? '💾 บันทึกการแก้ไข' : '💾 บันทึก'}
              </button>
            </div>
          </form>
        )}

        {/* Roles Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-blue-500 animate-spin mr-2" /><span className="text-slate-400 text-sm">กำลังโหลด...</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">ชื่อบทบาท</th>
                    <th className="px-4 py-3 hidden md:table-cell">คำอธิบาย</th>
                    <th className="px-4 py-3">สิทธิ์ (Permissions)</th>
                    <th className="px-4 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">ไม่มีข้อมูล Role</td></tr>
                  ) : paged.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{r.id}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{r.roleName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{r.description || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.permissions.length > 0 ? r.permissions.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold border border-blue-200">
                              <ShieldCheck className="w-3 h-3" />{AVAILABLE_PAGES[p.moduleName] || p.moduleName}
                            </span>
                          )) : <span className="text-slate-400 text-xs">ไม่มีสิทธิ์</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleEdit(r)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="แก้ไข"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && roles.length > PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-slate-200">
              <Pagination page={page} totalItems={roles.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}
        </div>

      </>
      )}
      </div>
    </div>
  );
}
