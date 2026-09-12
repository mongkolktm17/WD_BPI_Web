'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  Users,
  Shield,
  FileText,
  Settings,
  ExternalLink,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSite, Site } from '@/lib/SiteContext';

export default function SitesManagementPage() {
  const router = useRouter();
  const { currentSite, switchSite, isExecutive } = useSite();
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
    switchSite(site);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Multi-Site Architecture
              </span>
              <span className="text-xs text-slate-500">ระบบบริหารจัดการ 2 สาขา</span>
            </div>
            <h1 className="text-2xl font-bold text-white">จัดการข้อมูลและโครงสร้างสาขา (Sites Management)</h1>
            <p className="text-sm text-slate-400 mt-1">
              ควบคุมสาขาบางปะอิน (BPI) และสาขาปราจีนบุรี (PRB) กำหนดแบบฟอร์มและการสลับ Dashboard
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSites}
              className="p-2.5 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl text-slate-300 hover:text-white transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition"
            >
              <Eye className="w-4 h-4" />
              ดู SOC Dashboard
            </Link>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Site 1: BPI */}
          <div className="bg-slate-900/70 border border-blue-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-lg">
                  BPI
                </div>
                <div>
                  <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    สาขาหลัก (Main Site #1)
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">สาขาบางปะอิน</h2>
                  <p className="text-xs text-slate-400">Bang Pa-in Industrial Estate, Ayutthaya</p>
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
                className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition"
                title="แก้ไขข้อมูลสาขา"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-6 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 leading-relaxed">
              ศูนย์ปฏิบัติการความปลอดภัยหลัก (HQ) ควบคุมพื้นที่โรงงาน อาคาร 2, 3, 4, 6, 9
              จุดตรวจยานพาหนะ และจุดตรวจโลหะ Walk-Through / Handheld Detector พร้อมข้อมูลประวัติงานกว่า 114,000+ รายการ
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-500 block">กำลังพล รปภ.</span>
                <span className="text-base font-bold text-white">42 นาย</span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-500 block">อาคารตรวจการ</span>
                <span className="text-base font-bold text-blue-400">5 อาคาร</span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-500 block">สถานะสาขา</span>
                <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ออนไลน์
                </span>
              </div>
            </div>

            {/* Roles Info */}
            <div className="space-y-2 mb-6 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ผู้จัดการสาขา (Site Manager):</span>
                <span className="text-slate-200 font-medium">นายสมศักดิ์ มั่นคง (BPI Manager)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">หัวหน้า รปภ. (Supervisor):</span>
                <span className="text-slate-200 font-medium">นายวิชัย การุณย์ (BPI Sup)</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
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
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 transition text-center"
              >
                สลับดูสาขาบางปะอิน (Dashboard)
              </button>
              <Link
                href="/admin/forms?site=1"
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                แบบฟอร์ม BPI
              </Link>
            </div>
          </div>

          {/* Site 2: PRB */}
          <div className="bg-slate-900/70 border border-amber-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg">
                  PRB
                </div>
                <div>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    สาขาใหม่ (Branch Site #2)
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">สาขาปราจีนบุรี</h2>
                  <p className="text-xs text-slate-400">304 Industrial Park, Prachinburi</p>
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
                className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition"
                title="แก้ไขข้อมูลสาขา"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-6 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 leading-relaxed">
              สาขาโรงงานขยายพื้นที่นิคม 304 ดูแลโซนอาคารผลิต A/B, คลังสินค้า Logistic Warehouse,
              จุดตรวจชั่งน้ำหนักรถบรรทุก และระบบตรวจตราความปลอดภัยรอบรั้วโรงงาน
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-500 block">กำลังพล รปภ.</span>
                <span className="text-base font-bold text-white">28 นาย</span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-500 block">โซนและคลังสินค้า</span>
                <span className="text-base font-bold text-amber-400">4 โซน</span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-500 block">สถานะสาขา</span>
                <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งาน
                </span>
              </div>
            </div>

            {/* Roles Info */}
            <div className="space-y-2 mb-6 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ผู้จัดการสาขา (Site Manager):</span>
                <span className="text-slate-200 font-medium">นายเกียรติศักดิ์ พูลสวัสดิ์ (PRB Manager)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">หัวหน้า รปภ. (Supervisor):</span>
                <span className="text-slate-200 font-medium">นายเอกชัย ป้องกันภัย (PRB Sup)</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
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
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-900/30 transition text-center"
              >
                สลับดูสาขาปราจีนบุรี (Dashboard)
              </button>
              <Link
                href="/admin/forms?site=2"
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                แบบฟอร์ม PRB
              </Link>
            </div>
          </div>
        </div>

        {/* Corporate Executive Auto Rotation Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/40 text-indigo-400 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">ระบบแสดงผลหน้าจอผู้บริหาร (Executive 15s Auto-Rotate)</h3>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                    Live Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  เมื่อผู้บริหารหลัก (Corporate Executive) ล็อกอินเข้าใช้งาน สามารถเปิดโหมดหมุนเวียนอัตโนมัติ
                  หน้าจอ SOC Dashboard จะสลับข้อมูลระหว่างสาขาบางปะอิน (BPI) และสาขาปราจีนบุรี (PRB) ทุกๆ 15 วินาที พร้อมแถบ Countdown หรือเลือกดูเปรียบเทียบ 2 จอคู่กัน (Dual-View Side by Side)
                </p>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-900/40 transition whitespace-nowrap"
            >
              เปิดโหมดผู้บริหารที่ Dashboard
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Site Modal */}
      {editingSite && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">แก้ไขข้อมูลสาขา ({editingSite.code})</h2>
            <p className="text-xs text-slate-400 mb-5">ปรับปรุงชื่อ ที่อยู่ และคำอธิบายของสาขา</p>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">ชื่อสาขา (ภาษาไทย)</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ชื่อสาขา (ภาษาอังกฤษ)</label>
                <input
                  type="text"
                  value={editForm.nameEn}
                  onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ที่ตั้ง / นิคมอุตสาหกรรม</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">คำอธิบายสาขา</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-900/30"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
