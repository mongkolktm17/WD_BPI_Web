'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import Pagination from '@/components/Pagination';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  X,
  ShieldCheck,
  Filter,
  UserCheck,
  UserX,
  Building,
  KeyRound,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

interface User {
  id: number;
  username: string;
  fullName?: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  phone?: string;
  phone_number?: string;
  department?: string;
  isActive?: boolean;
  is_active?: boolean;
  roleId?: number;
  role?: string | { id: number; roleName: string };
  lastLogin?: string;
  createdAt?: string;
}

const ROLES_LIST = [
  { id: 'all', name: 'ทั้งหมด (All Roles)' },
  { id: '1', name: 'ผู้ดูแลระบบ (Admin)' },
  { id: '2', name: 'หัวหน้า รปภ. (Supervisor)' },
  { id: '3', name: 'เจ้าหน้าที่ รปภ. (Officer)' },
  { id: '4', name: 'เจ้าหน้าที่ตรวจตรา (Patrol)' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    roleId: 3,
    department: '',
    phone: '',
    isActive: true,
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch<any>('/api/users');
      const data = Array.isArray(res) ? res : res.data || [];
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Helper to extract role name
  const getRoleName = (user: User) => {
    if (typeof user.role === 'object' && user.role?.roleName) return user.role.roleName;
    if (typeof user.role === 'string') return user.role;
    if (user.roleId === 1) return 'ผู้ดูแลระบบ (Admin)';
    if (user.roleId === 2) return 'หัวหน้า รปภ. (Supervisor)';
    if (user.roleId === 3) return 'เจ้าหน้าที่ รปภ. (Officer)';
    if (user.roleId === 4) return 'เจ้าหน้าที่ตรวจตรา (Patrol)';
    return 'ผู้ใช้งานทั่วไป';
  };

  // Helper to get full name
  const getUserFullName = (user: User) => {
    if (user.fullName) return user.fullName;
    const parts = [user.first_name, user.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.username;
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Role Filter
      if (selectedRoleFilter !== 'all') {
        const targetRoleId = parseInt(selectedRoleFilter);
        const userRoleId = typeof u.role === 'object' ? u.role?.id : u.roleId;
        if (userRoleId !== targetRoleId) return false;
      }

      // 2. Status Filter
      const activeStatus = u.isActive !== undefined ? u.isActive : u.is_active !== undefined ? u.is_active : true;
      if (selectedStatusFilter === 'active' && !activeStatus) return false;
      if (selectedStatusFilter === 'inactive' && activeStatus) return false;

      // 3. Search Term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const fullName = getUserFullName(u).toLowerCase();
        const username = (u.username || '').toLowerCase();
        const dept = (u.department || '').toLowerCase();
        const phone = (u.phone || u.phone_number || '').toLowerCase();
        const empId = (u.employee_id || '').toLowerCase();

        return (
          fullName.includes(query) ||
          username.includes(query) ||
          dept.includes(query) ||
          phone.includes(query) ||
          empId.includes(query)
        );
      }

      return true;
    });
  }, [users, selectedRoleFilter, selectedStatusFilter, searchTerm]);

  // Total pages
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  // Handle Search Input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  // Handle Role Filter Change
  const handleRoleFilterChange = (roleId: string) => {
    setSelectedRoleFilter(roleId);
    setPage(1);
  };

  // Handle Status Filter Change
  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setSelectedStatusFilter(status);
    setPage(1);
  };

  const validateForm = () => {
    if (!form.fullName.trim()) return 'กรุณากรอกชื่อ-นามสกุล';
    if (!form.username.trim()) return 'กรุณากรอกชื่อผู้ใช้ (Username)';
    if (!editingId && (!form.password || form.password.length < 6)) {
      return 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setSubmitting(true);
    setFormError('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const body: any = {
        fullName: form.fullName,
        username: form.username,
        roleId: Number(form.roleId),
        department: form.department,
        isActive: form.isActive,
      };
      if (form.password) body.password = form.password;

      await apiFetch(url, { method, body: JSON.stringify(body) });
      setShowModal(false);
      setEditingId(null);
      setForm({
        fullName: '',
        username: '',
        password: '',
        roleId: 3,
        department: '',
        phone: '',
        isActive: true,
      });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    const roleId = typeof u.role === 'object' ? u.role?.id : u.roleId || 3;
    setForm({
      fullName: getUserFullName(u),
      username: u.username || '',
      password: '',
      roleId: roleId,
      department: u.department || '',
      phone: u.phone || u.phone_number || '',
      isActive: u.isActive !== undefined ? u.isActive : true,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`คุณต้องการลบผู้ใช้ "${name}" ใช่หรือไม่?`)) return;
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถลบข้อมูลผู้ใช้ได้');
    }
  };

  // Count by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    users.forEach((u) => {
      const rId = String(typeof u.role === 'object' ? u.role?.id : u.roleId || 3);
      counts[rId] = (counts[rId] || 0) + 1;
    });
    return counts;
  }, [users]);

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-bold text-sm">กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="จัดการบัญชีผู้ใช้งานระบบ"
        subtitle={`ผู้ใช้ทั้งหมด ${users.length.toLocaleString()} บัญชี`}
        icon={<Users className="w-5 h-5 md:w-6 md:h-6 text-white" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowModal(true);
                setEditingId(null);
                setFormError('');
                setForm({
                  fullName: '',
                  username: '',
                  password: '',
                  roleId: 3,
                  department: '',
                  phone: '',
                  isActive: true,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-sky-500 hover:from-blue-800 hover:to-sky-600 text-white font-black rounded-xl shadow-md transition-all text-xs md:text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มผู้ใช้ใหม่</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div className="text-xs font-bold">{error}</div>
          <button onClick={fetchUsers} className="ml-auto text-xs font-bold text-blue-600 underline">
            ลองใหม่
          </button>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {ROLES_LIST.map((r) => {
            const isSelected = selectedRoleFilter === r.id;
            const count = roleCounts[r.id] || 0;
            return (
              <button
                key={r.id}
                onClick={() => handleRoleFilterChange(r.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                <span>{r.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, Username, แผนก หรือเบอร์โทร..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Status & Page Size */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => handleStatusFilterChange('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStatusFilter === 'all' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => handleStatusFilterChange('active')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStatusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                ใช้งานอยู่
              </button>
              <button
                onClick={() => handleStatusFilterChange('inactive')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStatusFilter === 'inactive' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                ระงับ
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span>แสดง:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            ผลลัพธ์การค้นหา: <span className="font-bold text-blue-900">{filteredUsers.length.toLocaleString()}</span> รายการ
            {searchTerm && ` (กรองด้วย "${searchTerm}")`}
          </div>
          <div>
            หน้า <span className="font-bold text-blue-900">{page}</span> จาก{' '}
            <span className="font-bold text-blue-900">{totalPages}</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3.5">ชื่อผู้ใช้ (Username)</th>
                <th className="px-4 py-3.5">แผนก / สังกัด</th>
                <th className="px-4 py-3.5">บทบาท (Role)</th>
                <th className="px-4 py-3.5 text-center">สถานะ</th>
                <th className="px-4 py-3.5 text-center w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-bold">ไม่พบข้อมูลผู้ใช้ที่ตรงกับเงื่อนไข</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedUsers.map((u, idx) => {
                  const roleName = getRoleName(u);
                  const isUserActive = u.isActive !== undefined ? u.isActive : u.is_active !== undefined ? u.is_active : true;
                  const fullName = getUserFullName(u);
                  const rowNum = (page - 1) * pageSize + idx + 1;

                  return (
                    <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">{rowNum}</td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-800 text-xs md:text-sm">{fullName}</div>
                        {u.phone && <div className="text-[11px] text-slate-400 font-mono">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {u.username}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {u.department ? (
                          <span className="inline-flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {u.department}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                            u.roleId === 1 || roleName.includes('Admin') || roleName.includes('ดูแล')
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : u.roleId === 2 || roleName.includes('Supervisor') || roleName.includes('หัวหน้า')
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {roleName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isUserActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck className="w-3 h-3" /> ใช้งาน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            <UserX className="w-3 h-3" /> ระงับ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100/70 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขผู้ใช้"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, fullName)}
                            className="p-1.5 text-rose-600 hover:bg-rose-100/70 rounded-lg transition-colors cursor-pointer"
                            title="ลบผู้ใช้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {filteredUsers.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200">
            <Pagination page={page} totalItems={filteredUsers.length} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>{editingId ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</span>
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">ชื่อ-นามสกุล (Full Name) *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">ชื่อผู้ใช้ (Username) *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="เช่น somchaij"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">
                    รหัสผ่าน {editingId ? '(ปล่อยว่างหากไม่เปลี่ยน)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? 'เว้นว่างไว้หากใช้รหัสเดิม' : 'อย่างน้อย 6 ตัวอักษร'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">บทบาท (Role) *</label>
                  <select
                    value={form.roleId}
                    onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>ผู้ดูแลระบบ (Admin)</option>
                    <option value={2}>หัวหน้า รปภ. (Supervisor)</option>
                    <option value={3}>เจ้าหน้าที่ รปภ. (Officer)</option>
                    <option value={4}>เจ้าหน้าที่ตรวจตรา (Patrol)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">แผนก / สังกัด</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="เช่น Security / IT"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded-sm text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>เปิดใช้งานบัญชีผู้ใช้นี้ (Active Account)</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  {submitting ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
