'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  RefreshCw,
  Eye,
  Sparkles,
  Edit2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSite, SiteInfo as Site } from '@/lib/SiteContext';
import PageHeader from '@/components/PageHeader';

export default function SitesManagementPage() {
  const router = useRouter();
  const { currentSite, switchSite } = useSite();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    nameEn: '',
    address: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/api/sites');
      if (res && res.data) {
        setSites(res.data);
      }
    } catch (err) {
      console.error('Failed to load sites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const openEditModal = (site: Site) => {
    setEditingSite(site);
    setEditForm({
      name: site.name || '',
      nameEn: site.nameEn || '',
      address: site.address || '',
      description: site.description || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;
    setSaving(true);
    try {
      const res = await apiFetch<any>(`/api/sites/${editingSite.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });

      if (res && res.success) {
        setSites((prev) =>
          prev.map((s) => (s.id === editingSite.id ? { ...s, ...editForm } : s)),
        );
        setEditingSite(null);
        alert('บันทึกข้อมูลสาขาเรียบร้อยแล้ว');
      }
    } catch (err: any) {
      alert('บันทึกข้อมูลไม่สำเร็จ: ' + (err.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchAndGo = (site: Site) => {
    switchSite(site.id);
    router.push('/dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="จัดการข้อมูลและโครงสร้างสาขา"
        subtitle="Sites Architecture (Bang Pa-in & Prachinburi) · Multi-Site Configuration"
        icon={<Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />}
        backHref="/admin/settings"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSites}
              className="p-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 hover:text-blue-700 transition shadow-2xs cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ดู SOC Dashboard</span>
            </Link>
          </div>
        }
      />

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Site 1: BPI */}
        <div className="bg-gradient-to-br from-blue-50/60 via-white to-white border border-blue-200/90 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center font-black text-lg shadow-2xs">
                BPI
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full border border-blue-200">
                  สาขาหลัก (Main Site #1)
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">สาขาบางปะอิน</h2>
                <p className="text-xs text-slate-500 font-medium">Bang Pa-in Industrial Estate, Ayutthaya</p>
              </div>
            </div>

            <button
              onClick={() => {
                const bpi = sites.find((s) => s.id === 1) || {
                  id: 1,
                  code: 'BPI',
                  name: 'สาขาบางปะอิน',
                  nameEn: 'Bang Pa-in Site',
                  address: 'นิคมอุตสาหกรรมบางปะอิน จ.พระนครศรีอยุธยา',
                  description: 'สาขาสำนักงานใหญ่และศูนย์ปฏิบัติการหลัก BPI',
                };
                openEditModal(bpi);
              }}
              className="p-2 text-slate-500 hover:text-blue-700 bg-white hover:bg-blue-50 rounded-xl border border-slate-200 transition shadow-2xs cursor-pointer"
              title="แก้ไขข้อมูลสาขา"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 mb-5 bg-white/90 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed shadow-2xs">
            ศูนย์ปฏิบัติการความปลอดภัยหลัก (HQ) ควบคุมพื้นที่โรงงาน อาคาร 2, 3, 4, 6, 9
            จุดตรวจยานพาหนะ และจุดตรวจโลหะ Walk-Through / Handheld Detector พร้อมข้อมูลประวัติงานกว่า 114,000+ รายการ
          </p>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">กำลังพล รปภ.</span>
              <span className="text-base font-black text-slate-900">42 นาย</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">อาคารตรวจการ</span>
              <span className="text-base font-black text-blue-700">5 อาคาร</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">สถานะสาขา</span>
              <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> ออนไลน์
              </span>
            </div>
          </div>

          {/* Roles Info */}
          <div className="space-y-1.5 mb-5 text-xs bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ผู้จัดการสาขา (Site Manager):</span>
              <span className="text-slate-800 font-semibold">นายสมศักดิ์ มั่นคง (BPI Manager)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">หัวหน้า รปภ. (Supervisor):</span>
              <span className="text-slate-800 font-semibold">นายวิชัย การุณย์ (BPI Sup)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() =>
                handleSwitchAndGo(
                  sites.find((s) => s.id === 1) || {
                    id: 1,
                    code: 'BPI',
                    name: 'สาขาบางปะอิน',
                    nameEn: 'Bang Pa-in',
                  },
                )
              }
              className="flex-1 py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition text-center cursor-pointer"
            >
              สลับดูสาขาบางปะอิน (Dashboard)
            </button>
            <Link
              href="/admin/forms?site=1"
              className="py-2 px-3.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs"
            >
              แบบฟอร์ม BPI
            </Link>
          </div>
        </div>

        {/* Site 2: PRB */}
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-white border border-emerald-200/90 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black text-lg shadow-2xs">
                PRB
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                  สาขาใหม่ (Branch Site #2)
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">สาขาปราจีนบุรี</h2>
                <p className="text-xs text-slate-500 font-medium">304 Industrial Park, Prachinburi</p>
              </div>
            </div>

            <button
              onClick={() => {
                const prb = sites.find((s) => s.id === 2) || {
                  id: 2,
                  code: 'PRB',
                  name: 'สาขาปราจีนบุรี',
                  nameEn: 'Prachinburi Site',
                  address: 'สวนอุตสาหกรรม 304 ต.ท่าตูม อ.ศรีมหาโพธิ จ.ปราจีนบุรี',
                  description: 'สาขาโรงงานขยายปราจีนบุรี พร้อมระบบแบบฟอร์มปรับแต่งเฉพาะไซต์',
                };
                openEditModal(prb);
              }}
              className="p-2 text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 rounded-xl border border-slate-200 transition shadow-2xs cursor-pointer"
              title="แก้ไขข้อมูลสาขา"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 mb-5 bg-white/90 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed shadow-2xs">
            สาขาโรงงานขยายพื้นที่นิคม 304 ดูแลโซนอาคารผลิต A/B, คลังสินค้า Logistic Warehouse,
            จุดตรวจชั่งน้ำหนักรถบรรทุก และระบบตรวจตราความปลอดภัยรอบรั้วโรงงาน
          </p>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">กำลังพล รปภ.</span>
              <span className="text-base font-black text-slate-900">28 นาย</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">โซนและคลังสินค้า</span>
              <span className="text-base font-black text-emerald-700">4 โซน</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">สถานะสาขา</span>
              <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งาน
              </span>
            </div>
          </div>

          {/* Roles Info */}
          <div className="space-y-1.5 mb-5 text-xs bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ผู้จัดการสาขา (Site Manager):</span>
              <span className="text-slate-800 font-semibold">นายเกียรติศักดิ์ พูลสวัสดิ์ (PRB Manager)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">หัวหน้า รปภ. (Supervisor):</span>
              <span className="text-slate-800 font-semibold">นายเอกชัย ป้องกันภัย (PRB Sup)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() =>
                handleSwitchAndGo(
                  sites.find((s) => s.id === 2) || {
                    id: 2,
                    code: 'PRB',
                    name: 'สาขาปราจีนบุรี',
                    nameEn: 'Prachinburi',
                  },
                )
              }
              className="flex-1 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition text-center cursor-pointer"
            >
              สลับดูสาขาปราจีนบุรี (Dashboard)
            </button>
            <Link
              href="/admin/forms?site=2"
              className="py-2 px-3.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs"
            >
              แบบฟอร์ม PRB
            </Link>
          </div>
        </div>
      </div>

      {/* Corporate Executive Auto Rotation Card */}
      <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white rounded-xl border border-blue-200/90 text-blue-700 shadow-2xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-black text-slate-900">
                  ระบบแสดงผลหน้าจอผู้บริหาร (Executive 15s Auto-Rotate)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                  Live Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                เมื่อผู้บริหารหลัก (Corporate Executive) ล็อกอินเข้าใช้งาน สามารถเปิดโหมดหมุนเวียนอัตโนมัติ
                หน้าจอ SOC Dashboard จะสลับข้อมูลระหว่างสาขาบางปะอิน (BPI) และสาขาปราจีนบุรี (PRB) ทุกๆ 15 วินาที พร้อมแถบ Countdown หรือเลือกดูเปรียบเทียบ 2 จอคู่กัน (Dual-View Side by Side)
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition whitespace-nowrap"
          >
            <span>เปิดโหมดผู้บริหารที่ Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Edit Site Modal */}
      {editingSite && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-base font-black text-slate-900 mb-0.5">แก้ไขข้อมูลสาขา ({editingSite.code})</h2>
            <p className="text-xs text-slate-500 mb-4">ปรับปรุงชื่อ ที่อยู่ และคำอธิบายของสาขา</p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">ชื่อสาขา (ภาษาไทย) *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ชื่อสาขา (ภาษาอังกฤษ)</label>
                <input
                  type="text"
                  value={editForm.nameEn}
                  onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ที่ตั้ง / นิคมอุตสาหกรรม</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">คำอธิบายสาขา</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
