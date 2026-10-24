'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, Save, RefreshCw, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  department: string | null;
  phone: string | null;
  email: string | null;
  role: {
    id: number;
    name: string;
  };
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    department: '',
    phone: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch<any>('/api/auth/me');
      const userData: UserProfile = res.data?.user || res.user || res.data || res;
      if (userData && userData.id) {
        setUser(userData);
        setProfileForm({
          fullName: userData.fullName || '',
          department: userData.department || '',
          phone: userData.phone || '',
          email: userData.email || '',
        });
      } else {
        throw new Error('ไม่พบข้อมูลโปรไฟล์');
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await apiFetch('/api/system/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: profileForm.fullName,
          department: profileForm.department,
          phone: profileForm.phone,
          email: profileForm.email,
        }),
      });
      setProfileMessage({ type: 'success', text: 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว' });
      fetchProfile();
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'ไม่สามารถบันทึกข้อมูลได้' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }

    setPasswordSaving(true);
    try {
      const result = await apiFetch<{ success: boolean; message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (result.success) {
        setPasswordMessage({ type: 'success', text: result.message || 'เปลี่ยนรหัสผ่านสำเร็จ' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: result.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้' });
      }
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้' });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button onClick={fetchProfile} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">ลองใหม่</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="โปรไฟล์ส่วนตัว"
        subtitle="User Profile & Account Settings"
        icon={<User className="w-5 h-5 md:w-6 md:h-6 text-white" />}
        backHref="/report-page"
      />

      {/* Profile Info Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">ข้อมูลส่วนตัว</h2>
        </div>

        {profileMessage && (
          <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
            profileMessage.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
              : 'bg-rose-50 border border-rose-200 text-rose-600'
          }`}>
            {profileMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {profileMessage.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อ-นามสกุล *</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">แผนก</label>
              <input
                type="text"
                value={profileForm.department}
                onChange={e => setProfileForm({...profileForm, department: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                placeholder="0xxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">อีเมล</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
            >
              {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {profileSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h2>
        </div>

        {passwordMessage && (
          <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
            passwordMessage.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
              : 'bg-rose-50 border border-rose-200 text-rose-600'
          }`}>
            {passwordMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">รหัสผ่านปัจจุบัน *</label>
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">รหัสผ่านใหม่ *</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ยืนยันรหัสผ่านใหม่ *</label>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
            >
              {passwordSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {passwordSaving ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </form>
      </div>

      {/* User Info Card */}
      {user && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-xs font-semibold text-blue-700">ข้อมูลบัญชี</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500 text-xs">ชื่อผู้ใช้</span>
              <p className="font-semibold text-slate-800">{user.username}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">บทบาท</span>
              <p className="font-semibold text-slate-800">{user.role?.name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">แผนก</span>
              <p className="font-semibold text-slate-800">{user.department || '-'}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">รหัสผู้ใช้</span>
              <p className="font-mono font-semibold text-blue-600">#{user.id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
