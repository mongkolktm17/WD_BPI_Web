'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, Clock, FileText, LogOut } from 'lucide-react';

/** SOC command-center header: WD logo, bilingual title, clock, health pill, user, actions. */
export function SocHeader({
  currentTime,
  userName,
  userRole,
  healthy,
  onLogout,
}: {
  currentTime: string;
  userName: string;
  userRole: string;
  healthy: boolean;
  onLogout: () => void;
}) {
  return (
    <header className="soc-glass rounded-[20px] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/report_assets/Images/images_logo.png"
          alt="WD Logo"
          className="h-8 md:h-10 w-auto object-contain flex-shrink-0"
        />
        <div className="min-w-0">
          <h1 className="text-base md:text-xl font-extrabold text-slate-900 leading-tight truncate">
            Security Operations Center{' '}
            <span className="hidden lg:inline font-semibold text-slate-400 text-sm">/ ศูนย์ปฏิบัติการรักษาความปลอดภัย</span>
          </h1>
          <p className="text-[10px] md:text-[11px] text-slate-500 leading-tight truncate">
            Western Digital Storage Technologies (Thailand) Ltd.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span suppressHydrationWarning>{currentTime}</span>
        </div>

        <div
          className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border ${
            healthy
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <span className="relative flex w-2.5 h-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${
                healthy ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                healthy ? 'bg-emerald-500 soc-glow-green' : 'bg-amber-500'
              }`}
            />
          </span>
          {healthy ? 'System Operational' : 'Degraded — ตรวจสอบระบบ'}
        </div>

        <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-xs font-extrabold flex items-center justify-center mr-2">
            {(userName || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-xs leading-tight max-w-[120px] truncate">{userName}</div>
            <div className="text-slate-400 text-[10px] leading-tight">{userRole}</div>
          </div>
        </div>

        <Link
          href="/report-page"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
          title="Reports / รายงาน"
        >
          <FileText className="w-4 h-4" />
        </Link>
        <Link
          href="/stats"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
          title="Stats / สถิติ"
        >
          <BarChart3 className="w-4 h-4" />
        </Link>
        <button
          onClick={onLogout}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          title="Logout / ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
