'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, Clock, FileText, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';

interface SocHeaderProps {
  currentTime: string;
  userName: string;
  userRole: string;
  healthy: boolean;
  healthScore?: number | null;
  loading?: boolean;
  siteName?: string;
  siteCode?: string;
  onRefresh?: () => void;
  onLogout: () => void;
}

/**
 * SOC Command-Center Executive Header:
 * Displays branding, real-time clock, system health score capsule,
 * fast refresh controls, user badge, and navigation.
 */
export function SocHeader({
  currentTime,
  userName,
  userRole,
  healthy,
  healthScore,
  loading = false,
  siteName,
  siteCode,
  onRefresh,
  onLogout,
}: SocHeaderProps) {
  return (
    <header className="soc-glass rounded-[20px] px-3.5 md:px-5 py-2.5 flex items-center justify-between gap-2.5">
      {/* Left: Branding & Facility Name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/report_assets/Images/images_logo.png"
          alt="WD Logo"
          className="h-7 md:h-8 w-auto object-contain flex-shrink-0"
        />
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-extrabold text-slate-900 leading-tight truncate">
            Security Operations Center{' '}
            <span className="hidden lg:inline font-semibold text-slate-400 text-xs">
              / ศูนย์ปฏิบัติการรักษาความปลอดภัย
            </span>
          </h1>
          <p className="text-[10px] text-slate-500 leading-tight truncate flex items-center gap-1.5">
            <span>Western Digital Storage Technologies (Thailand)</span>
            <span>·</span>
            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded font-sans">
              {siteName || 'BPI Plant (บางปะอิน)'}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Health Score, Live Clock, User, Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Executive Health Capsule */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border transition-colors ${
            healthy
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <span className="relative flex w-2 h-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${
                healthy ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                healthy ? 'bg-emerald-500 soc-glow-green' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="tabular-nums font-black">
            {healthScore !== undefined && healthScore !== null ? `${healthScore}%` : '—'}
          </span>
          <span className="hidden sm:inline font-semibold">
            {healthy ? 'Operational' : 'Attention'}
          </span>
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span suppressHydrationWarning>{currentTime}</span>
        </div>

        {/* User Badge */}
        <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-[11px] font-black flex items-center justify-center mr-1.5">
            {(userName || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="font-bold text-slate-800 text-[11px] max-w-[100px] truncate">{userName}</div>
            <div className="text-slate-400 text-[9px]">{userRole}</div>
          </div>
        </div>

        {/* Refresh Sync Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 transition-colors shadow-2xs"
            title="Refresh Data · รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        )}

        {/* Quick Nav: Reports */}
        <Link
          href="/report-page"
          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
          title="Daily Reports / รายงานประจำวัน"
        >
          <FileText className="w-3.5 h-3.5" />
        </Link>

        {/* Quick Nav: Stats */}
        <Link
          href="/stats"
          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
          title="Historical Stats / สถิติระบบ"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </Link>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          title="Logout / ออกจากระบบ"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
