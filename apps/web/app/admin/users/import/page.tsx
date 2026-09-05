'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import { Users, Upload, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import PageHeader from '@/components/PageHeader';

export default function AdminUsersImportPage() {
  const authorized = useRequireAdmin();
  const [csvText, setCsvText] = useState('');
  const [roles, setRoles] = useState<{ id: number; roleName: string }[]>([]);
  const [role, setRole] = useState('');
  const [defaultPhone, setDefaultPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    apiFetch('/api/roles')
      .then(data => {
        const list = Array.isArray(data) ? data : (data as any).data || [];
        setRoles(list);
        if (list.length > 0) setRole(String(list[0].id));
      })
      .catch(() => {});
  }, []);

  const handleImport = useCallback(async () => {
    if (!csvText.trim()) {
      setError('กรุณากรอกข้อมูล CSV');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const lines = csvText.trim().split('\n').filter(l => l.trim());
      const users: Array<{ username: string; password: string; fullName: string; roleId: number; employeeId?: string; phone?: string }> = [];
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 7) continue;
        const employeeId = parts[1];
        const firstNameThai = parts[2];
        const lastNameThai = parts[3];
        const username = parts[6];
        const password = parts[7] || employeeId;
        users.push({
          username,
          password,
          fullName: `${firstNameThai} ${lastNameThai}`.trim(),
          roleId: parseInt(role) || 1,
          employeeId,
          phone: defaultPhone || undefined,
        });
      }
      if (users.length === 0) {
        throw new Error('ไม่พบข้อมูลที่ถูกต้องใน CSV');
      }
      const data = await apiFetch('/api/users/import', {
        method: 'POST',
        body: JSON.stringify(users),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถนำเข้าข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [csvText, role, defaultPhone]);

  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
      {authorized !== true && (
        <div className="p-8 text-center text-slate-500 text-sm">กำลังตรวจสอบสิทธิ์...</div>
      )}
      {authorized === true && (
      <>

        {/* Header */}
        <PageHeader
          title="นำเข้าผู้ใช้จาก CSV"
          subtitle="Import Users"
          icon={<Upload className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          backHref="/admin/users"
          backLabel="← จัดการผู้ใช้"
        />

        {/* Import Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-slate-800 mb-4">นำเข้าข้อมูล</h2>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{error}</div>
          )}

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="text-sm font-semibold text-blue-700 mb-2">คำแนะนำ</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>วางข้อมูล CSV ในรูปแบบ: ลำดับ,รหัสพนักงาน,ชื่อไทย,นามสกุลไทย,ชื่ออังกฤษ,นามสกุลอังกฤษ,username,password</li>
              <li>รหัสพนักงานต้องเป็นตัวเลข 8 หลัก</li>
              <li>ระบบจะข้ามผู้ใช้ที่มีรหัสพนักงานหรือชื่อผู้ใช้ซ้ำในระบบ</li>
              <li>รหัสผ่านจะถูกเข้ารหัสอัตโนมัติก่อนบันทึกลงฐานข้อมูล</li>
            </ul>
          </div>

          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">ตัวอย่างข้อมูล CSV</h3>
            <pre className="text-xs text-slate-500 font-mono overflow-x-auto">{'ลำดับ,รหัสพนักงาน,ชื่อภาษาไทย,นามสกุลภาษาไทย,ชื่อภาษาอังกฤษ,นามสกุลภาษาอังกฤษ,username,password\n1,10354996,เกษร,บุตยา,KESORN,BOOTYA,kesorn,10354996\n2,10365851,ศิริวรรณ,นรอ่อน,SIRIWAN,NORAON,siriwan,10365851\n3,10368820,สังวาลย์,ตู้สุวรรณ,SUNGWAN,TOOSUWAN,sungwan,10368820'}</pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <AnimatedDropdown
              options={roles.map(r => ({ value: String(r.id), label: r.roleName }))}
              value={role}
              onChange={setRole}
              label="Role สำหรับเจ้าหน้าที่ที่นำเข้า"
            />
          </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">เบอร์โทรศัพท์เริ่มต้น (ถ้าไม่มีใน CSV)</label>
              <input type="text" maxLength={10} value={defaultPhone} onChange={e => setDefaultPhone(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="0xxxxxxxxx" />
            </div>
            <div className="flex items-end">
              <button onClick={handleImport} disabled={loading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-md transition-all text-sm">
                {loading ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">วางข้อมูล CSV</label>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none placeholder-slate-400"
              placeholder={`1,10354996,เกษร,บุตยา,KESORN,BOOTYA,kesorn,10354996\n2,10365851,ศิริวรรณ,นรอ่อน,SIRIWAN,NORAON,siriwan,10365851`}
            />
          </div>
        </div>

        {/* Import Results */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-slate-800 mb-4">ผลการนำเข้า</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-600">{result.success || 0}</div>
                <div className="text-xs text-slate-500">นำเข้าสำเร็จ</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-600">{result.skipped || 0}</div>
                <div className="text-xs text-slate-500">ข้าม (มีอยู่แล้ว)</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
                <XCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-rose-600">{result.errors || 0}</div>
                <div className="text-xs text-slate-500">ผิดพลาด</div>
              </div>
            </div>
            {result.details && result.details.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">รายละเอียด:</h3>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.details.map((d: any, i: number) => (
                    <div key={i} className={`text-xs p-2 rounded-lg ${d.status === 'success' ? 'bg-emerald-50 text-emerald-700' : d.status === 'skipped' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                      {d.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </>
      )}
      </div>
    </div>
  );
}
