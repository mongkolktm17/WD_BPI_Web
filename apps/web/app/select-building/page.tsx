'use client';

import React, { useState } from 'react';
import { Building2, Search, X, Clock, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useSite } from '@/lib/SiteContext';

interface BuildingInfo {
  id: string;
  name: string;
  nameTh: string;
  desc: string;
  color: string;
  shadow: string;
  postsCount: number;
  highlightPost: string;
}

const BUILDINGS: BuildingInfo[] = [
  {
    id: '2',
    name: 'Building 2',
    nameTh: 'อาคาร 2 (ศูนย์กลางโรงงาน)',
    desc: 'ตรวจจุดรักษาการณ์ A2, A3, Traffic, D1, D3, D7, Support',
    color: 'from-blue-600 to-indigo-700',
    shadow: 'shadow-blue-500/20',
    postsCount: 11,
    highlightPost: 'A2, A3, Traffic, D-Line',
  },
  {
    id: '3',
    name: 'Building 3',
    nameTh: 'อาคาร 3 (อาคารสำนักงาน)',
    desc: 'ตรวจจุดรักษาการณ์ Gate 2, RCSC, FA LAB, ทางออก',
    color: 'from-emerald-600 to-teal-700',
    shadow: 'shadow-emerald-500/20',
    postsCount: 5,
    highlightPost: 'Gate 2, RCSC, FA LAB',
  },
  {
    id: '4',
    name: 'Building 4',
    nameTh: 'อาคาร 4 (อาคารผลิตหลัก)',
    desc: 'ตรวจ Gate 1, 5, 6, Worker, Scan Link way, Park 3, Customs',
    color: 'from-amber-600 to-orange-700',
    shadow: 'shadow-amber-500/20',
    postsCount: 15,
    highlightPost: 'Gate 1, 5, 6, Scan Linkway',
  },
  {
    id: '6',
    name: 'Building 6',
    nameTh: 'อาคาร 6 (อาคารสนับสนุน)',
    desc: 'ตรวจจุดรักษาการณ์ 6/1, 6/2, Rel.Lab B2L3, Patrol',
    color: 'from-violet-600 to-purple-700',
    shadow: 'shadow-violet-500/20',
    postsCount: 5,
    highlightPost: '6/1, 6/2, Rel.Lab',
  },
  {
    id: '9',
    name: 'Building 9',
    nameTh: 'อาคาร 9 (Bio Building)',
    desc: 'ตรวจจุดรักษาการณ์ B9 และพื้นที่โดยรอบอาคาร',
    color: 'from-rose-600 to-pink-700',
    shadow: 'shadow-rose-500/20',
    postsCount: 2,
    highlightPost: 'จุดรักษาการณ์ B9',
  },
];

export default function SelectBuildingPage() {
  const { currentSite } = useSite();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBuildings = BUILDINGS.filter((bldg) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      bldg.name.toLowerCase().includes(q) ||
      bldg.nameTh.toLowerCase().includes(q) ||
      bldg.desc.toLowerCase().includes(q) ||
      bldg.highlightPost.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 py-3 sm:py-6 px-2.5 sm:px-4 font-sans selection:bg-blue-600 selection:text-white pb-24 sm:pb-12">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
        {/* PWA Top Header */}
        <PageHeader
          title="เลือกอาคารตรวจตรา"
          subtitle={`Building Inspection Selection · สาขา ${currentSite?.code || 'BPI'}`}
          badge="ตรวจความเรียบร้อยรอบอาคาร"
          icon={<Building2 className="w-5 h-5 text-white" strokeWidth={1.75} />}
          backHref="/report-page"
          backLabel="เมนูหลัก PWA"
        />

        {/* Quick Search Bar for Mobile Ergonomics */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3 shadow-2xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่ออาคาร เช่น อาคาร 2, อาคาร 4, Gate, หรือจุดตรวจ..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Building Cards Grid (Mobile 2-cols, Tablet 3-cols, Desktop 5-cols) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
          {filteredBuildings.map((bldg) => (
            <Link
              key={bldg.id}
              href={`/report-building/${bldg.id}`}
              className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 p-3 sm:p-4 text-center hover:border-blue-400 hover:shadow-xs active:scale-[0.97] transition-all duration-150 group flex flex-col items-center justify-between h-full"
            >
              {/* Top: Icon Squircle */}
              <div className="flex flex-col items-center w-full">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${bldg.color} flex items-center justify-center shadow-md ${bldg.shadow} group-hover:scale-105 transition-transform duration-150 mb-2`}
                >
                  <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.75} />
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                  {bldg.name}
                </h3>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                  {bldg.nameTh}
                </span>

                <div className="mt-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-mono font-medium">
                  {bldg.postsCount} จุดรักษาการณ์
                </div>
              </div>

              {/* Bottom: Action Pill */}
              <div className="mt-3 w-full text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 py-1.5 px-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-2xs flex items-center justify-center gap-1">
                <span>เปิดฟอร์ม</span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {filteredBuildings.length === 0 && (
          <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-1.5" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-600">ไม่พบอาคารที่ตรงกับการค้นหา</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
            >
              ล้างคำค้นหา
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
