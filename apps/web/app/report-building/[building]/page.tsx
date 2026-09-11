'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AnimatedDropdown from '@/components/AnimatedDropdown';
import MicButton from '@/components/MicButton';
import { Building2, Send, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const BUILDING_CONFIG: Record<string, { title: string; posts: string[] }> = {
  '2': { title: 'Building 2', posts: ['A2', 'A3', 'Traffic', 'D1', 'D3', 'D7', 'Patrol 1', 'Patrol 2', 'Machine', 'Support', 'Other'] },
  '3': { title: 'Building 3', posts: ['Gate 2', 'RCSC', 'FA LAB', 'EXIT INSPECTION (ทางออก)', 'Other'] },
  '4': { title: 'Building 4', posts: ['Gate 1', 'Gate 5', 'Gate 6', 'Worker', 'Scan Receiving', 'Receiving', 'Traffic Receiving', 'Transfer room', 'Scan Link way', 'Park 3', 'Customs Park 2', 'Patrol 1', 'Patrol 2', 'Support', 'Other'] },
  '6': { title: 'Building 6', posts: ['6/1', '6/2', 'Rel.Lab B2L3', 'Patrol', 'Other'] },
  '9': { title: 'Building 9', posts: ['B9', 'Other'] },
};

export default function ReportBuildingPage() {
  const params = useParams();
  const router = useRouter();
  const buildingId = params.building as string;

  const config = BUILDING_CONFIG[buildingId];

  const [formData, setFormData] = useState({
    report_date: '',
    employee_id: '',
    full_name: '',
    shift: '',
    guard_post: '',
    report_time: '',
    incident_report: '',
    special_incident: '',
    emergency_incident: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setFormData((prev) => ({
      ...prev,
      report_date: dateStr,
      report_time: `${hours}:${minutes}`,
    }));
    // Auto-fill from session
    apiFetch<any>('/api/auth/me').then((res)=>{
      const u = res.user ?? res.data ?? res;
      setFormData(prev=>({
        ...prev,
        employee_id: u.username || prev.employee_id,
        full_name: u.fullName || u.username || prev.full_name,
      }));
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!config) {
      router.push('/select-building');
    }
  }, [config, router]);

  if (!config) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMicResult = (fieldName: string, transcript: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: prev[fieldName as keyof typeof prev] ? prev[fieldName as keyof typeof prev] + ' ' + transcript : transcript,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await apiFetch('/api/reports/building-reports', {
        method: 'POST',
        body: JSON.stringify({
          reportDate: formData.report_date,
          employeeId: formData.employee_id,
          fullName: formData.full_name,
          shift: formData.shift,
          building: buildingId,
          guardPost: formData.guard_post,
          reportTime: formData.report_time,
          incidentReport: formData.incident_report,
          specialIncident: formData.special_incident || undefined,
          emergencyIncident: formData.emergency_incident || undefined,
        }),
      });
      setMessage(`ส่งรายงานสำหรับ ${config.title} เรียบร้อยแล้ว`);
      setFormData((prev) => ({
        ...prev,
        employee_id: '',
        full_name: '',
        shift: '',
        guard_post: '',
        incident_report: '',
        special_incident: '',
        emergency_incident: '',
      }));
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-full py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={`รายงานประจำวัน ${config.title}`}
          subtitle="Building Report Form"
          icon={<Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          backHref="/select-building"
          backLabel="← เลือกอาคาร"
        />

        {message && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-100 text-red-800 border border-red-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 border border-sky-100 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">1. วัน เดือน ปี <span className="text-red-500">*</span></label>
              <input type="date" name="report_date" required value={formData.report_date} onChange={handleChange}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500 bg-white text-base sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">2. รหัสพนักงาน PCS (8 หลัก) <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="text" name="employee_id" required maxLength={8} placeholder="กรอกรหัสพนักงาน" value={formData.employee_id} onChange={handleChange}
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 pr-12 rounded-xl sm:rounded-2xl font-medium text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500 bg-white text-base sm:text-sm" />
                <MicButton onResult={(t) => handleMicResult('employee_id', t)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">3. ชื่อ นามสกุล <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="text" name="full_name" required placeholder="กรอกชื่อและนามสกุล" value={formData.full_name} onChange={handleChange}
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 pr-12 rounded-xl sm:rounded-2xl font-medium text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500 bg-white text-base sm:text-sm" />
                <MicButton onResult={(t) => handleMicResult('full_name', t)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">4. กะ <span className="text-red-500">*</span></label>
              <div className="flex gap-2 sm:gap-3">
                <button type="button" onClick={() => setFormData({ ...formData, shift: 'เช้า' })}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 rounded-xl sm:rounded-2xl font-medium transition-all min-h-[44px] flex items-center justify-center ${formData.shift === 'เช้า' ? 'border-sky-500 bg-sky-100 text-sky-700' : 'border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50'}`}>
                  🌅 เช้า
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, shift: 'ดึก' })}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 rounded-xl sm:rounded-2xl font-medium transition-all min-h-[44px] flex items-center justify-center ${formData.shift === 'ดึก' ? 'border-purple-500 bg-purple-100 text-purple-700' : 'border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50'}`}>
                  🌙 ดึก
                </button>
              </div>
              <input type="hidden" name="shift" value={formData.shift} />
            </div>
            <div>
              <AnimatedDropdown
                options={config.posts.map((post) => ({ value: post, label: post, icon: <MapPin className="w-4 h-4 text-blue-500" /> }))}
                value={formData.guard_post}
                onChange={(val) => setFormData({ ...formData, guard_post: val })}
                label="5. จุดรักษาการณ์ *"
                placeholder="เลือกจุดรักษาการณ์"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">6. เวลารายงาน <span className="text-red-500">*</span></label>
              <input type="time" name="report_time" required value={formData.report_time} onChange={handleChange}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500 bg-white text-base sm:text-sm" />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 sm:pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">7. รายงานเหตุการณ์ <span className="text-red-500">*</span></label>
            <div className="relative">
              <textarea name="incident_report" rows={4} required placeholder="กรอกรายละเอียดเหตุการณ์ หรือใช้ไมโครโฟน" value={formData.incident_report} onChange={handleChange}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 pr-12 rounded-xl sm:rounded-2xl font-medium text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500 bg-white text-base sm:text-sm" />
              <MicButton onResult={(t) => handleMicResult('incident_report', t)} className="!top-4 sm:!top-5" />
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4 sm:pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">8. กรณีเหตุการณ์พิเศษ</label>
            <div className="relative">
              <textarea name="special_incident" rows={3} placeholder="ถ้ามี (ไม่บังคับ) หรือใช้ไมโครโฟน" value={formData.special_incident} onChange={handleChange}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 pr-12 rounded-xl sm:rounded-2xl font-medium text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500 bg-white text-base sm:text-sm" />
              <MicButton onResult={(t) => handleMicResult('special_incident', t)} className="!top-4 sm:!top-5" />
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4 sm:pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">9. กรณีเหตุฉุกเฉิน</label>
            <div className="relative">
              <textarea name="emergency_incident" rows={3} placeholder="ถ้ามี (ไม่บังคับ) หรือใช้ไมโครโฟน" value={formData.emergency_incident} onChange={handleChange}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 pr-12 rounded-xl sm:rounded-2xl font-medium text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500 bg-white text-base sm:text-sm" />
              <MicButton onResult={(t) => handleMicResult('emergency_incident', t)} className="!top-4 sm:!top-5" />
            </div>
          </div>

          <div className="text-center pt-4 sm:pt-6">
            <button type="submit" disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-blue-600 text-white py-3.5 sm:py-4 px-8 sm:px-12 rounded-xl sm:rounded-3xl text-base sm:text-lg font-bold shadow-lg hover:from-sky-600 hover:to-blue-700 transition-all active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-2 min-h-[44px]">
              <Send className="w-5 h-5" />
              {loading ? 'กำลังบันทึก...' : 'ส่งรายงาน'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
