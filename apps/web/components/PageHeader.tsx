'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useSite } from '@/lib/SiteContext';

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
  backLabel = 'กลับ',
  actions,
}: PageHeaderProps) {
  const { currentSite } = useSite();

  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs p-2.5 sm:p-3 mb-3 sm:mb-4 text-slate-800">
      <div className="flex items-center justify-between gap-2">
        
        {/* Left: Back Button + WD Logo + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 active:scale-95 px-2.5 py-1.5 rounded-xl border border-slate-200 transition-all flex-shrink-0 shadow-2xs relative z-20"
            title="ย้อนกลับไปเมนูหลัก PWA"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold hidden xs:inline">{backLabel}</span>
          </Link>

          {/* Graphic WD Logo */}
          <Link href="/" title="กลับหน้าหลัก SOC Dashboard" className="flex items-center flex-shrink-0 hover:opacity-85 transition-opacity">
            <img
              src="/report_assets/Images/images_logo.png"
              alt="Western Digital Logo"
              className="h-5 sm:h-6 w-auto object-contain flex-shrink-0 hidden xxs:block cursor-pointer"
            />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-tight truncate">
                {title}
              </h1>
              {badge && (
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate leading-none mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Static Assigned Site Badge (Locked for Guards/Supervisors) + Custom Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {actions}

          {/* Static Plant Badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-mono font-bold shadow-2xs"
            title={`ประจำพื้นที่ปฏิบัติการ: ${currentSite?.name} (${currentSite?.code})`}
          >
            <MapPin className="w-3 h-3 text-sky-600" />
            <span>{currentSite?.code || 'BPI'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
