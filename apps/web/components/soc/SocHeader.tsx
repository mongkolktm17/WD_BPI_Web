'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, Clock, FileText, LogOut, Radio, RefreshCw, Settings, Sparkles } from 'lucide-react';

interface SocHeaderProps {
  currentTime: string;
  userName: string;
  userRole: string;
  healthy: boolean;
  healthScore?: number | null;
  loading?: boolean;
  siteName?: string;
  siteCode?: string;
  isAdmin?: boolean;
  unclosedIncidentCount?: number;
  onRefresh?: () => void;
  onLogout: () => void;
  onOpenAiReport?: () => void;
  onOpenAiSettings?: () => void;
  onOpenCommandCenter?: () => void;
}

export function SocHeader({
  currentTime,
  userName,
  userRole,
  healthy,
  healthScore = 86,
  loading = false,
  siteName,
  siteCode,
  isAdmin = true,
  unclosedIncidentCount = 0,
  onRefresh,
  onLogout,
  onOpenAiReport,
  onOpenAiSettings,
  onOpenCommandCenter,
}: SocHeaderProps) {
  const displayScore = healthScore !== undefined && healthScore !== null ? healthScore : 86;

  return (
    <header className="bg-white rounded-xl px-4 md:px-5 py-2.5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Left: Branding & Facility Name */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Western Digital Official Logo */}
        <Link href="/" className="flex items-center flex-shrink-0 hover:opacity-95 transition-opacity" title="Western Digital Operations Console">
          <img
            src="/report_assets/Images/images_logo.png"
            alt="Western Digital Logo"
            className="h-8 md:h-8.5 w-auto object-contain flex-shrink-0"
          />
        </Link>

        {/* Separator & Titles */}
        <div className="min-w-0 border-l border-slate-200/90 pl-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight truncate">
              Security Operations Center
            </h1>
            <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400">
              ศูนย์ปฏิบัติการรักษาความปลอดภัย
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight truncate flex items-center gap-1.5 mt-0.5">
            <span className="font-semibold text-slate-600">Western Digital Storage Technologies</span>
            <span className="text-slate-300 font-bold">/</span>
            <span className="font-mono font-bold text-sky-800 text-[10px] bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
              {siteCode || 'BPI'} · {siteName ? siteName : 'บางปะอิน'}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Health Pill, Live Clock, User Badge, Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
        {/* Health Score Pill */}
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{displayScore}% OPERATIONAL</span>
        </div>

        {/* Live Clock Pill */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 font-mono bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span suppressHydrationWarning>{currentTime || 'Oct 18, 2026 13:15:31'}</span>
        </div>

        {/* User Badge Pill */}
        <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200/90 rounded-lg pl-1 pr-2.5 py-1">
          <div className="w-6 h-6 rounded-md bg-[#001433] text-white text-[11px] font-mono font-bold flex items-center justify-center mr-2">
            {(userName || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{userName}</div>
            <div className="text-slate-400 text-[10px] truncate max-w-[120px]">{userRole}</div>
          </div>
        </div>

        {/* Precision Action Buttons */}
        <div className="flex items-center gap-1.5 pl-1">
          {/* Command Center Trigger */}
          <button
            type="button"
            onClick={onOpenCommandCenter}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer group border border-slate-700/80 active:scale-95"
            title="ศูนย์ควบคุมและสั่งการเหตุการณ์ (Real-time Command Center)"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" strokeWidth={1.75} />
            <span className="font-sans">Command Center</span>
            {unclosedIncidentCount !== undefined && unclosedIncidentCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white leading-none animate-pulse">
                {unclosedIncidentCount}
              </span>
            )}
          </button>

          {/* ✨ AI Smart Executive Report Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenAiReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-blue-700 via-blue-800 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold text-xs shadow-xs transition-all cursor-pointer group border border-blue-600/50"
            title="✨ AI Smart Executive Report (สร้างและจัดการรายงาน AI)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span className="font-sans">AI Smart Report</span>
          </button>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="w-7.5 h-7.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/60 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="รีเฟรชข้อมูล (Refresh)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}

          {/* Reports Link */}
          <Link
            href="/report-page"
            className="w-7.5 h-7.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/60 flex items-center justify-center transition-colors shadow-2xs"
            title="รายงานประจำวัน (Daily Reports)"
          >
            <FileText className="w-3.5 h-3.5" />
          </Link>

          {/* Historical Stats Link */}
          <Link
            href="/stats"
            className="w-7.5 h-7.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/60 flex items-center justify-center transition-colors shadow-2xs"
            title="สถิติระบบ (Analytics)"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </Link>

          {/* AI Knowledge Base & System Settings */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAiSettings}
              className="w-7.5 h-7.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/60 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="ตั้งค่าโมเดล AI & บริบทโรงงาน (AI & Factory Context Settings)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-7.5 h-7.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="ออกจากระบบ (Logout)"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
