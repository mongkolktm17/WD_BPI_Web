'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Camera,
  Car,
  Users,
  FileText,
  Radio,
  LogOut,
  Clock,
  ShieldCheck,
  UserCheck,
  Building2,
  UserCircle,
  Settings,
  ChevronDown,
  Menu,
  X,
  FileSpreadsheet,
  Sparkles,
  Play,
  Pause,
  RotateCw,
  Layers,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSite } from '@/lib/SiteContext';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [userName, setUserName] = useState('Admin User');
  const [userRole, setUserRole] = useState('Administrator');
  const [isAdmin, setIsAdmin] = useState(false);
  const currentPathname = usePathname() || '';
  const [pathname, setPathname] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const effectivePathname = currentPathname || pathname;

  const {
    currentSite,
    sites,
    switchSite,
    isExecutive,
    autoRotate,
    toggleRotation,
    timeLeft,
  } = useSite();

  useEffect(() => {
    setMounted(true);
    setPathname(window.location.pathname);
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isPwa = effectivePathname === '/login' || effectivePathname === '/' || effectivePathname === '/dashboard' || effectivePathname === '/report-page' || effectivePathname === '/select-building' || effectivePathname === '/car-parking' || effectivePathname === '/guard-duty-log' || effectivePathname === '/patrol-checklist' || effectivePathname === '/handheld-detector' || effectivePathname === '/walkthrough-detector' || effectivePathname === '/radio-inspection' || effectivePathname === '/cctv-inspection' || effectivePathname === '/cctv-angle-check' || effectivePathname === '/nvr-recording' || effectivePathname === '/cctv-report' || effectivePathname === '/visual-report' || effectivePathname === '/manage-officers' || effectivePathname.startsWith('/report-building');
    if (!mounted || isPwa) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    apiFetch<{ first_name?: string; last_name?: string; name?: string; role?: string; role_name?: string }>('/api/auth/me')
      .then((data) => {
        const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ');
        if (name) setUserName(name);
        if (data.role_name || data.role) setUserRole(data.role_name || data.role || 'Administrator');
        const u: any = data;
        const rName = String(u.role_name || u.role?.name || u.role || '');
        const roleId = Number(u.role?.id ?? u.roleId ?? 0);
        const perms: string[] = [];
        (u.role?.permissions || []).forEach((p: any) => perms.push(typeof p === 'string' ? p : p?.name));
        (u.permissions || []).forEach((p: any) => perms.push(typeof p === 'string' ? p : p?.name));
        const admin = perms.includes('all') || perms.includes('admin') || roleId === 1 || roleId === 6 || u.isExecutive === true || rName.toLowerCase().includes('admin') || rName.includes('ผู้ดูแลระบบ') || rName.includes('ผู้บริหาร');
        setIsAdmin(admin);
      })
      .catch(() => {});
  }, [mounted, effectivePathname]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu and dropdowns on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [effectivePathname]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  if (!mounted || effectivePathname === '/login' || effectivePathname === '/' || effectivePathname === '/dashboard' || effectivePathname === '/report-page' || effectivePathname === '/select-building' || effectivePathname === '/car-parking' || effectivePathname === '/guard-duty-log' || effectivePathname === '/patrol-checklist' || effectivePathname === '/handheld-detector' || effectivePathname === '/walkthrough-detector' || effectivePathname === '/radio-inspection' || effectivePathname === '/cctv-inspection' || effectivePathname === '/cctv-angle-check' || effectivePathname === '/nvr-recording' || effectivePathname === '/cctv-report' || effectivePathname === '/visual-report' || effectivePathname === '/manage-officers' || effectivePathname.startsWith('/report-building')) {
    return <>{children}</>;
  }

  const navGroups = [
    {
      label: 'CCTV',
      icon: Camera,
      items: [
        { name: 'รายงาน CCTV', href: '/cctv-report', icon: Camera },
        { name: 'ตรวจมุมกล้อง', href: '/cctv-angle-check', icon: Camera },
        { name: 'ผลการตรวจสอบ', href: '/cctv-inspection', icon: Camera },
      ],
    },
    {
      label: 'อาคาร',
      icon: Building2,
      items: [
        { name: 'รายงานอาคาร', href: '/report-page', icon: FileText },
        { name: 'เลือกอาคาร', href: '/select-building', icon: Building2 },
      ],
    },
    {
      label: 'ลาดตระเวน',
      icon: ShieldCheck,
      items: [
        { name: 'เวรประจำวัน', href: '/guard-duty-log', icon: UserCheck },
        { name: 'ตรวจตราความเรียบร้อย', href: '/patrol-checklist', icon: ShieldCheck },
        ...(isAdmin ? [{ name: 'จัดการเจ้าหน้าที่', href: '/manage-officers', icon: Users }] : []),
      ],
    },
    {
      label: 'อุปกรณ์',
      icon: Radio,
      items: [
        { name: 'ลานจอดรถ', href: '/car-parking', icon: Car },
        { name: 'ระบบบันทึก NVR', href: '/nvr-recording', icon: Radio },
        { name: 'Walkthrough Detector', href: '/walkthrough-detector', icon: Radio },
        { name: 'Hand-Held Detector', href: '/handheld-detector', icon: Radio },
        { name: 'ตรวจวิทยุสื่อสาร', href: '/radio-inspection', icon: Radio },
      ],
    },
    {
      label: 'แบบฟอร์ม',
      icon: FileSpreadsheet,
      items: [
        { name: 'คลังแบบฟอร์ม (Templates)', href: '/admin/forms', icon: FileSpreadsheet },
        { name: 'สร้างฟอร์มใหม่ (Builder)', href: '/admin/forms/builder', icon: Sparkles },
        { name: 'รายการส่งฟอร์ม (Submissions)', href: '/forms/submissions', icon: FileText },
      ],
    },
    {
      label: 'สถิติ',
      icon: FileText,
      items: [
        { name: 'ภาพรวม Dashboard', href: '/visual-report', icon: FileText },
        { name: 'สถิติรายงาน', href: '/stats', icon: FileText },
      ],
    },
    {
      label: 'ระบบ',
      icon: Settings,
      items: [
        { name: 'โปรไฟล์ส่วนตัว', href: '/profile', icon: UserCircle },
        { name: 'จัดการสาขา (BPI & PRB)', href: '/admin/sites', icon: Building2 },
        { name: 'จัดการผู้ใช้', href: '/admin/users', icon: Users },
        { name: 'กำหนดสิทธิ์ (Roles)', href: '/admin/roles', icon: ShieldCheck },
        { name: 'ตั้งค่าระบบ & นำเข้า DB', href: '/admin/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen gradient-bg font-sans text-slate-800 pb-8">
      <div className="container mx-auto px-3 sm:px-4 py-3 md:py-5">
        {/* ── Header ── */}
        <header className="mb-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-white/60 p-3.5 md:px-6 md:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo and System Title */}
            <div className="flex items-center gap-3 md:gap-4">
              <Link href="/" className="flex items-center justify-center flex-shrink-0">
                <img
                  src="/report_assets/Images/images_logo.png"
                  alt="WD Logo"
                  className="h-8 md:h-10 w-28 md:w-36 object-contain flex-shrink-0"
                />
              </Link>
              <div>
                <h1 className="text-base md:text-xl lg:text-2xl font-black text-blue-950 tracking-tight leading-tight">
                  Security System Dashboard
                </h1>
                <p className="hidden sm:block text-[11px] md:text-xs font-semibold text-sky-600 leading-tight">
                  {currentSite.name} ({currentSite.nameEn || 'Western Digital Thailand'})
                </p>
              </div>
            </div>

            {/* Right Action Bar */}
            <div className="flex items-center gap-2 md:gap-2.5">
              {/* Site Selector Dropdown Pill */}
              <div className="relative">
                <button
                  onClick={() => isExecutive && setSiteDropdownOpen(!siteDropdownOpen)}
                  disabled={!isExecutive}
                  className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                    currentSite.code === 'BPI'
                      ? 'bg-blue-50/90 text-blue-950 border-blue-200 hover:bg-blue-100/80'
                      : 'bg-emerald-50/90 text-emerald-950 border-emerald-200 hover:bg-emerald-100/80'
                  } ${isExecutive ? 'cursor-pointer' : 'cursor-default'}`}
                  title={isExecutive ? 'คลิกเพื่อสลับสาขา' : 'สาขาที่สังกัด'}
                >
                  <Building2 className={`w-3.5 h-3.5 ${currentSite.code === 'BPI' ? 'text-blue-600' : 'text-emerald-600'}`} />
                  <span className="hidden sm:inline">{currentSite.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-white border border-current/20">
                    {currentSite.code}
                  </span>
                  {isExecutive && <ChevronDown className="w-3 h-3 opacity-60" />}
                </button>

                {siteDropdownOpen && isExecutive && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 flex items-center justify-between">
                      <span>เลือกสาขา (Site Switcher)</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono">Executive</span>
                    </div>
                    {sites.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          switchSite(s.id);
                          setSiteDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs font-medium hover:bg-slate-50 transition-colors ${
                          currentSite.id === s.id ? 'bg-blue-50/80 text-blue-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.code === 'BPI' ? 'bg-blue-600' : 'bg-emerald-600'}`} />
                          <span>{s.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">{s.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 15-Second Auto Rotation Control (Executive Only) */}
              {isExecutive && (
                <button
                  onClick={toggleRotation}
                  className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                    autoRotate
                      ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20 animate-pulse'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={autoRotate ? `กำลังสลับอัตโนมัติ (เหลือ ${timeLeft}s) - คลิกเพื่อหยุดชั่วคราว` : 'เปิดโหมดสลับหน้าจออัตโนมัติทุก 15 วินาที'}
                >
                  {autoRotate ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-amber-900">สลับใน {timeLeft}s</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-slate-500" />
                      <span>สลับอัตโนมัติ 15s</span>
                    </>
                  )}
                </button>
              )}

              {/* Live Clock */}
              <div className="hidden xl:flex items-center gap-2 bg-slate-100/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-900 border border-slate-200/60">
                <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>{currentTime}</span>
              </div>

              {/* User Pill */}
              <div className="flex items-center bg-blue-50/80 border border-blue-100 rounded-xl px-2.5 md:px-3.5 py-1.5 md:py-2 shadow-xs">
                <div className="relative mr-2 flex items-center justify-center">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-emerald-500 rounded-full"></div>
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-emerald-500 rounded-full absolute animate-ping opacity-75"></div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-blue-950 text-[11px] md:text-xs leading-tight line-clamp-1">{userName}</div>
                  <div className="text-[9px] md:text-[11px] font-medium text-blue-600 leading-tight">{userRole}</div>
                </div>
              </div>

              {/* Direct Settings Shortcut */}
              <Link
                href="/admin/settings"
                title="ตั้งค่าระบบ / นำเข้าฐานข้อมูล"
                className={`p-2 md:p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                  pathname.startsWith('/admin/settings')
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200/80 shadow-xs'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden lg:inline">ตั้งค่า</span>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-2.5 md:px-3.5 py-1.5 md:py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">ออกระบบ</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* ── Desktop & Tablet Responsive Navigation (Dropdowns - No Horizontal Scroll) ── */}
        <nav ref={navRef} className="hidden sm:block mb-5 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 px-2 py-1.5 relative z-30">
          <div className="flex items-center justify-between gap-1 w-full">
            {/* Dashboard Link */}
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex-shrink-0 ${
                pathname === '/'
                  ? 'bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50/70'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            {/* Dropdown Menu Categories */}
            <div className="flex items-center gap-1 flex-1 justify-around">
              {navGroups.map((group) => {
                const GroupIcon = group.icon;
                const isGroupActive = group.items.some((item) => pathname === item.href);
                const isOpen = activeDropdown === group.label;

                return (
                  <div key={group.label} className="relative">
                    <button
                      onClick={() => setActiveDropdown(isOpen ? null : group.label)}
                      onMouseEnter={() => setActiveDropdown(group.label)}
                      className={`flex items-center gap-1 px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isGroupActive
                          ? 'bg-blue-100/80 text-blue-900 shadow-xs'
                          : isOpen
                          ? 'bg-slate-100 text-blue-800'
                          : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50/60'
                      }`}
                    >
                      <GroupIcon className={`w-3.5 h-3.5 ${isGroupActive ? 'text-blue-700' : 'text-slate-500'}`} />
                      <span>{group.label}</span>
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Popover */}
                    {isOpen && (
                      <div
                        onMouseLeave={() => setActiveDropdown(null)}
                        className="absolute top-full left-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 px-1.5 animate-in fade-in-50 zoom-in-95 duration-150 z-50"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                          {group.label}
                        </div>
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setActiveDropdown(null)}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              <ItemIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* ── Mobile Accordion / Drawer Navigation (Full Single Screen) ── */}
        {mobileMenuOpen && (
          <div className="md:hidden mb-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 space-y-3 animate-in fade-in duration-200 z-40">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${
                pathname === '/' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>หน้าหลัก Dashboard</span>
            </Link>

            <div className="space-y-2">
              {navGroups.map((group) => (
                <div key={group.label} className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 px-1">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:text-blue-700 border border-slate-200/60'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-slate-200/80 min-h-[600px]">
          {children}
        </main>

        <footer className="mt-6 md:mt-8 text-center text-xs text-slate-500 font-medium py-3">
          PCS Engineering Solution &copy; 2025-2026. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
