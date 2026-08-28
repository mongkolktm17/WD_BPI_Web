'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

const BUILDINGS = [
  { id: '2', name: 'Building 2', desc: 'ศูนย์กลางโรงงาน', color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
  { id: '3', name: 'Building 3', desc: 'อาคารสำนักงาน', color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
  { id: '4', name: 'Building 4', desc: 'อาคารผลิต', color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
  { id: '6', name: 'Building 6', desc: 'อาคารสนับสนุน', color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
  { id: '9', name: 'Building 9', desc: 'Bio Building', color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20' },
];

export default function SelectBuildingPage() {
  return (
    <div className="gradient-bg min-h-screen py-4 md:py-8 px-3 md:px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <PageHeader
          title="เลือกอาคาร"
          subtitle="Select Building"
          icon={<Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />}
        />

        {/* Building Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {BUILDINGS.map((bldg) => (
            <Link
              key={bldg.id}
              href={`/report-building/${bldg.id}`}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-5 md:p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group"
            >
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${bldg.color} flex items-center justify-center mx-auto mb-3 shadow-md ${bldg.shadow} group-hover:scale-110 transition-transform`}>
                <Building2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{bldg.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{bldg.desc}</p>
              <div className="mt-3 inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                เปิดรายงาน →
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
