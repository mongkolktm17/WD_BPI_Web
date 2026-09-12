'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Plus,
  Copy,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  Building2,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
  Radio,
  Car,
  Camera,
  Layers,
  AlertTriangle,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { useSite } from '@/lib/SiteContext';

interface FormTemplate {
  id: number;
  code: string;
  title: string;
  description?: string;
  category: string;
  siteId?: number | null;
  site?: { id: number; code: string; name: string } | null;
  clonedFrom?: { id: number; title: string; code: string } | null;
  version: number;
  isPublished: boolean;
  allowedRoles: string[];
  schemaJson: any;
  updatedAt: string;
  _count?: { submissions: number; clones?: number };
}

const CATEGORIES = [
  { id: 'all', name: 'ทุกหมวดหมู่' },
  { id: 'patrol', name: 'ตรวจตรา (Patrol)', icon: ClipboardCheck },
  { id: 'parking', name: 'ลานจอดรถ (Parking)', icon: Car },
  { id: 'cctv', name: 'กล้อง CCTV', icon: Camera },
  { id: 'equipment', name: 'เครื่องมือ/อุปกรณ์', icon: Radio },
  { id: 'incident', name: 'เหตุการณ์ฉุกเฉิน', icon: AlertTriangle },
];

export default function FormTemplatesPage() {
  const router = useRouter();
  const { currentSite, sites } = useSite();

  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Clone Modal State
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [sourceTemplate, setSourceTemplate] = useState<FormTemplate | null>(null);
  const [cloneTargetSiteId, setCloneTargetSiteId] = useState<number>(2); // default Prachinburi
  const [cloneTitle, setCloneTitle] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<any>('/api/dynamic-forms/templates');
      let data: FormTemplate[] = [];
      if (Array.isArray(res)) data = res;
      else if (Array.isArray(res?.data)) data = res.data;
      else if (Array.isArray(res?.data?.data)) data = res.data.data;
      setTemplates(data);
    } catch (err) {
      console.error('Error loading form templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCloneModal = (tpl: FormTemplate) => {
    setSourceTemplate(tpl);
    // Auto-suggest target site (if source is BPI, suggest PRB; if PRB, suggest BPI)
    const suggestedTarget = tpl.siteId === 1 ? 2 : 1;
    setCloneTargetSiteId(suggestedTarget);
    const targetSiteObj = sites.find((s) => s.id === suggestedTarget);
    setCloneTitle(`${tpl.title} (${targetSiteObj?.name || 'สาขาใหม่'})`);
    setCloneError('');
    setCloneModalOpen(true);
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTemplate) return;

    try {
      setCloning(true);
      setCloneError('');
      const res = await apiFetch<any>(`/api/dynamic-forms/templates/${sourceTemplate.id}/clone`, {
        method: 'POST',
        body: JSON.stringify({
          targetSiteId: cloneTargetSiteId,
          title: cloneTitle,
        }),
      });

      const newTemplate = res?.data?.data || res?.data || res;
      const newId = newTemplate?.id;
      setCloneModalOpen(false);
      // Redirect directly to the builder with the newly cloned template
      if (newId) {
        router.push(`/admin/forms/builder/${newId}`);
      } else {
        fetchTemplates();
      }
    } catch (err: any) {
      setCloneError(err.message || 'เกิดข้อผิดพลาดในการคัดลอกแบบฟอร์ม');
    } finally {
      setCloning(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`ต้องการลบแบบฟอร์ม "${title}" หรือไม่?`)) return;
    try {
      await apiFetch(`/api/dynamic-forms/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถลบแบบฟอร์มได้');
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSite =
      selectedSiteFilter === 'all'
        ? true
        : selectedSiteFilter === 'global'
        ? t.siteId === null
        : t.siteId === Number(selectedSiteFilter);

    const matchesCat =
      selectedCategoryFilter === 'all' ? true : t.category === selectedCategoryFilter;

    return matchesSearch && matchesSite && matchesCat;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="คลังแบบฟอร์มการรายงาน (Dynamic Form Templates)"
        subtitle="ระบบสร้างและจัดการแบบฟอร์มสำหรับสาขาบางปะอินและปราจีนบุรี สามารถคัดลอกฟอร์มเดิมมาปรับแต่งได้ทันที"
        badge="Multi-Site Form Engine"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/forms/submissions"
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
              <span>ประวัติการส่งฟอร์ม</span>
            </Link>
            <Link
              href="/admin/forms/builder"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างแบบฟอร์มใหม่</span>
            </Link>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Site Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedSiteFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedSiteFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทุกสาขา ({templates.length})
            </button>
            <button
              onClick={() => setSelectedSiteFilter('1')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedSiteFilter === '1'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>สาขาบางปะอิน (BPI)</span>
            </button>
            <button
              onClick={() => setSelectedSiteFilter('2')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedSiteFilter === '2'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>สาขาปราจีนบุรี (PRB)</span>
            </button>
            <button
              onClick={() => setSelectedSiteFilter('global')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedSiteFilter === 'global'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              แบบฟอร์มกลาง (Global)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อฟอร์ม หรือรหัส..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> หมวด:
          </span>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategoryFilter === c.id
                  ? 'bg-blue-100 text-blue-800 font-bold'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <span>กำลังโหลดคลังแบบฟอร์ม...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">ไม่พบแบบฟอร์มตามเงื่อนไขที่ค้นหา</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">คุณสามารถสร้างแบบฟอร์มใหม่ หรือเลือกดูฟอร์มของสาขาอื่นเพื่อคัดลอกได้</p>
          <Link
            href="/admin/forms/builder"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างฟอร์มใหม่</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => {
            const isBPI = tpl.siteId === 1;
            const isPRB = tpl.siteId === 2;
            const isGlobal = !tpl.siteId;

            return (
              <div
                key={tpl.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Site Badge & Published Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                        isBPI
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isPRB
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      <Building2 className="w-3 h-3" />
                      <span>{tpl.site?.name || 'แบบฟอร์มกลาง (Global)'}</span>
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        tpl.isPublished
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tpl.isPublished ? 'เปิดใช้งาน' : 'ฉบับร่าง (Draft)'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                    {tpl.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                      {tpl.code}
                    </span>
                    <span className="text-[10px] text-slate-400">v{tpl.version}</span>
                    {tpl.clonedFrom && (
                      <span className="text-[10px] text-sky-600 font-medium truncate" title={`คัดลอกจาก ${tpl.clonedFrom.title}`}>
                        ↳ คัดลอกจาก BPI
                      </span>
                    )}
                  </div>

                  {tpl.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {tpl.description}
                    </p>
                  )}
                </div>

                {/* Submissions Count & Quick Actions */}
                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    ส่งแล้ว <strong className="text-slate-700 font-bold">{tpl._count?.submissions || 0}</strong> ครั้ง
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Fill Form Button */}
                    <Link
                      href={`/forms/fill/${tpl.id}`}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      title="กรอกแบบฟอร์มนี้"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>

                    {/* Clone / Duplicate Form Button */}
                    <button
                      onClick={() => openCloneModal(tpl)}
                      className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
                      title="คัดลอกแบบฟอร์มไปใช้สาขาอื่น"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Template in Builder */}
                    <Link
                      href={`/admin/forms/builder/${tpl.id}`}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      title="แก้ไขโครงสร้างแบบฟอร์ม"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(tpl.id, tpl.title)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                      title="ลบแบบฟอร์ม"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Clone Form Modal ── */}
      {cloneModalOpen && sourceTemplate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">คัดลอกแบบฟอร์ม (Clone Template)</h3>
                  <p className="text-xs text-slate-400">สร้างฟอร์มใหม่จากแม่แบบเดิมเพื่อปรับแต่งตามสาขา</p>
                </div>
              </div>
              <button
                onClick={() => setCloneModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloneSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400">ฟอร์มต้นแบบ:</span>
                <div className="font-bold text-slate-800 text-sm">{sourceTemplate.title}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  รหัส: {sourceTemplate.code} · สังกัดเดิม: {sourceTemplate.site?.name || 'แบบฟอร์มกลาง'}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เลือกสาขาเป้าหมายที่ต้องการนำไปใช้:
                </label>
                <select
                  value={cloneTargetSiteId}
                  onChange={(e) => {
                    const sid = Number(e.target.value);
                    setCloneTargetSiteId(sid);
                    const s = sites.find((item) => item.id === sid);
                    setCloneTitle(`${sourceTemplate.title} (${s?.name || ''})`);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code} - {s.nameEn})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  ตัวอย่าง: คัดลอกแบบฟอร์มตรวจตราจากบางปะอินไปใช้ที่สาขาปราจีนบุรี
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อแบบฟอร์มใหม่:
                </label>
                <input
                  type="text"
                  required
                  value={cloneTitle}
                  onChange={(e) => setCloneTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>

              {cloneError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                  {cloneError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCloneModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={cloning}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {cloning ? (
                    <span>กำลังคัดลอก...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ยืนยันและไปแก้ไขใน Form Builder</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
