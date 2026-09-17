'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  badge,
  icon,
  backHref = '/report-page',
  backLabel = '← กลับ',
  actions,
}: PageHeaderProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-6 flex justify-between items-center flex-wrap gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-slate-800 leading-tight flex items-center gap-2 flex-wrap">
            {title}
            {badge && (
              <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                {badge}
              </span>
            )}
          </h1>
          {subtitle && <p className="text-slate-500 text-xs md:text-sm">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-2 items-center">
        {actions}
        <Link
          href={backHref}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl transition-colors text-xs md:text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
