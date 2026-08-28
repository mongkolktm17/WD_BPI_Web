'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  Shield, ChevronUp, ChevronDown,
  Users, Activity, Clock, RefreshCw, TrendingUp,
  CarFront, Bike, Cctv, ScanLine, HardHat, Footprints
} from 'lucide-react';

interface SparkData {
  today: number;
  yesterday: number;
  history: number[];
}

function SparkCard({
  title,
  subtitle,
  icon: Icon,
  gradient,
  spark,
  format = 'number',
  suffix = '',
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  spark: SparkData;
  format?: 'number' | 'percent';
  suffix?: string;
}) {
  const diff = spark.today - spark.yesterday;
  const percent = spark.yesterday > 0 ? ((diff / spark.yesterday) * 100).toFixed(1) : '0';
  const isUp = diff > 0;
  const isDown = diff < 0;
  const isNeutral = diff === 0;

  const chartData = spark.history.map((v, i) => ({ v, i }));
  const strokeColor = isUp ? '#10b981' : isDown ? '#ef4444' : '#6366f1';
  const fillId = `grad-${title.replace(/\s/g, '')}`;

  const displayValue = format === 'percent' ? `${spark.today}${suffix}` : spark.today.toLocaleString();

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isUp ? 'bg-emerald-50 text-emerald-600' : isDown ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
        }`}>
          {isUp && <ChevronUp className="w-3 h-3" />}
          {isDown && <ChevronDown className="w-3 h-3" />}
          <span>{isNeutral ? '0' : `${isUp ? '+' : ''}${percent}%`}</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-none">
            {displayValue}
          </div>
          <div className={`text-[10px] font-semibold mt-1 ${
            isUp ? 'text-emerald-500' : isDown ? 'text-rose-500' : 'text-slate-400'
          }`}>
            {isNeutral ? 'Same as yesterday' : isUp ? `+${diff.toLocaleString()} from yesterday` : `${diff.toLocaleString()} from yesterday`}
          </div>
        </div>

        <div className="w-20 h-10 flex-shrink-0">
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill={`url(#${fillId})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function RingProgress({
  percent,
  size = 80,
  stroke = 6,
  color = '#3b82f6',
  bgColor = '#e2e8f0',
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`p-3 rounded-xl text-center`}>
      <div className={`text-xl font-extrabold ${color}`}>{value.toLocaleString()}</div>
      <div className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</div>
    </div>
  );
}

function ZoneStatusGrid({ zones }: { zones: { name: string; pass: number; fail: number }[] }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {zones.map((z) => (
        <div key={z.name} className="bg-white rounded-xl border border-slate-200 p-2.5 text-center">
          <div className="text-[10px] font-bold text-slate-600 mb-1">{z.name}</div>
          <div className="flex justify-center gap-2">
            <div>
              <div className="text-sm font-extrabold text-emerald-600">{z.pass}</div>
              <div className="text-[8px] text-emerald-500">Pass</div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-rose-500">{z.fail}</div>
              <div className="text-[8px] text-rose-500">Fail</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatReportTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'ยังไม่มีข้อมูล';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);

  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  if (diffMinutes < 1) return `เมื่อสักครู่ (${timeStr})`;
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว (${timeStr})`;

  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `วันนี้ ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `เมื่อวาน ${timeStr}`;

  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${timeStr}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [userName, setUserName] = useState('Admin User');
  const [userRole, setUserRole] = useState('Administrator');
  const [loading, setLoading] = useState(true);

  const [guards, setGuards] = useState<SparkData>({ today: 0, yesterday: 0, history: [] });
  const [dayShift, setDayShift] = useState(0);
  const [nightShift, setNightShift] = useState(0);
  const [dayContract, setDayContract] = useState(0);
  const [nightContract, setNightContract] = useState(0);
  const [morningLastUpdate, setMorningLastUpdate] = useState<string | null>(null);
  const [eveningLastUpdate, setEveningLastUpdate] = useState<string | null>(null);

  const [cars, setCars] = useState<SparkData>({ today: 0, yesterday: 0, history: [] });
  const [motorcycles, setMotorcycles] = useState<SparkData>({ today: 0, yesterday: 0, history: [] });
  const [carCapacity, setCarCapacity] = useState(1075);
  const [motoCapacity, setMotoCapacity] = useState(757);
  const [parkingBreakdown, setParkingBreakdown] = useState<Record<string, number>>({});
  const [motoBreakdown, setMotoBreakdown] = useState<Record<string, number>>({});
  const [nvrCompliance, setNvrCompliance] = useState<{compliant:number; nonCompliant:number; total:number} | null>(null);

  const [cameras, setCameras] = useState<SparkData>({ today: 0, yesterday: 0, history: [] });
  const [nvr, setNvr] = useState<SparkData>({ today: 0, yesterday: 0, history: [] });
  const [cctvOnline, setCctvOnline] = useState(0);
  const [cctvTotal, setCctvTotal] = useState(0);
  const [nvrPassed, setNvrPassed] = useState(0);
  const [nvrTotal, setNvrTotal] = useState(0);

  const [handheld, setHandheld] = useState<SparkData>({ today: 0, yesterday: 0, history: [] });
  const [handheldReports, setHandheldReports] = useState(0);
  const [hhBattery, setHhBattery] = useState({ pass: 0, fail: 0 });
  const [hhLed, setHhLed] = useState({ pass: 0, fail: 0 });
  const [hhDetection, setHhDetection] = useState({ pass: 0, fail: 0 });
  const [hhAlarm, setHhAlarm] = useState({ pass: 0, fail: 0 });

  const [walkthrough, setWalkthrough] = useState<SparkData>({ today: 0, yesterday: 0, history: [] });
  const [wtReports, setWtReports] = useState(0);
  const [wtZones, setWtZones] = useState([
    { name: 'Zone 1', pass: 0, fail: 0 },
    { name: 'Zone 2', pass: 0, fail: 0 },
    { name: 'Zone 3', pass: 0, fail: 0 },
    { name: 'Zone 4', pass: 0, fail: 0 },
    { name: 'Zone 5', pass: 0, fail: 0 },
    { name: 'Zone 6', pass: 0, fail: 0 },
  ]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      const [dashRes] = await Promise.allSettled([
        apiFetch<any>('/api/stats/dashboard'),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value) {
        const d = dashRes.value?.data ?? dashRes.value;

        // ── Guards ──
        const gToday = d.guards?.today || { total: 0, morning: 0, evening: 0 };
        const gYesterday = d.guards?.yesterday || { total: 0, morning: 0, evening: 0 };
        setDayShift(gToday.morning ?? 0);
        setNightShift(gToday.evening ?? 0);
        setDayContract(gToday.morningContract ?? gToday.morning ?? 1);
        setNightContract(gToday.eveningContract ?? gToday.evening ?? 1);
        setMorningLastUpdate(gToday.morningLastUpdate ?? null);
        setEveningLastUpdate(gToday.eveningLastUpdate ?? null);
        setGuards({
          today: gToday.total ?? 0,
          yesterday: gYesterday.total ?? 0,
          history: (d.guards?.history || []).map((v: number | null) => v ?? 0),
        });

        // ── Parking ──
        const pCar = d.parking?.car || { today: 0, yesterday: 0, history: [] };
        const pMoto = d.parking?.motorcycle || { today: 0, yesterday: 0, history: [] };
        setCarCapacity(d.parking?.carCapacity || 1075);
        setMotoCapacity(d.parking?.motorcycleCapacity || 757);
        setCars({
          today: pCar.today,
          yesterday: pCar.yesterday,
          history: (pCar.history || []).map((v: number | null) => v ?? 0),
        });
        setMotorcycles({
          today: pMoto.today,
          yesterday: pMoto.yesterday,
          history: (pMoto.history || []).map((v: number | null) => v ?? 0),
        });
        if (d.parking?.parkingLotBreakdown) setParkingBreakdown(d.parking.parkingLotBreakdown);
        if (d.parking?.motorcycleLotBreakdown) setMotoBreakdown(d.parking.motorcycleLotBreakdown);
        if (d.nvr?.compliance) setNvrCompliance(d.nvr.compliance);

        // ── CCTV ──
        const cctvOnline = d.cctv?.online || 0;
        const cctvTotal = d.cctv?.total || 0;
        setCctvOnline(cctvOnline);
        setCctvTotal(cctvTotal);
        setCameras({
          today: cctvOnline,
          yesterday: Math.max(0, cctvOnline),
          history: Array.from({ length: 7 }, () => cctvOnline),
        });

        // ── NVR ──
        const nvrPassed = d.nvr?.passed || 0;
        const nvrTotal = d.nvr?.total || 0;
        setNvrPassed(nvrPassed);
        setNvrTotal(nvrTotal);
        setNvr({
          today: nvrPassed,
          yesterday: d.nvr?.yesterday || 0,
          history: (d.nvr?.history || []).map((v: number | null) => v ?? 0),
        });

        // ── Handheld ──
        const hhPassRate = (d.handheld?.passRate || []).filter((v: number | null) => v !== null);
        const lastHh = hhPassRate.length > 0 ? hhPassRate[hhPassRate.length - 1] : 100;
        const hhYesterday = hhPassRate.length > 1 ? hhPassRate[hhPassRate.length - 2] : lastHh;
        setHandheld({
          today: lastHh,
          yesterday: hhYesterday,
          history: hhPassRate,
        });
        setHandheldReports(d.handheld?.totalChecks || 0);
        setHhBattery(d.handheld?.subItems?.battery || { pass: 0, fail: 0 });
        setHhLed(d.handheld?.subItems?.led || { pass: 0, fail: 0 });
        setHhDetection(d.handheld?.subItems?.detection || { pass: 0, fail: 0 });
        setHhAlarm(d.handheld?.subItems?.alarm || { pass: 0, fail: 0 });

        // ── Walkthrough ──
        const wtPassRate = (d.walkthrough?.passRate || []).filter((v: number | null) => v !== null);
        const lastWt = wtPassRate.length > 0 ? wtPassRate[wtPassRate.length - 1] : 100;
        const wtYesterday = wtPassRate.length > 1 ? wtPassRate[wtPassRate.length - 2] : lastWt;
        setWalkthrough({
          today: lastWt,
          yesterday: wtYesterday,
          history: wtPassRate,
        });
        setWtReports(d.walkthrough?.totalChecks || 0);
        setWtZones(d.walkthrough?.zones || [
          { name: 'Zone 1', pass: 0, fail: 0 },
          { name: 'Zone 2', pass: 0, fail: 0 },
          { name: 'Zone 3', pass: 0, fail: 0 },
          { name: 'Zone 4', pass: 0, fail: 0 },
          { name: 'Zone 5', pass: 0, fail: 0 },
          { name: 'Zone 6', pass: 0, fail: 0 },
        ]);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const clock = setInterval(() => {
      setCurrentTime(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(clock);
  }, [fetchAllData]);

  useEffect(() => {
    apiFetch<any>('/api/auth/me')
      .then((data) => {
        const d = data?.data ?? data;
        if (d.fullName) setUserName(d.fullName);
        else if (d.username) setUserName(d.username);
        if (d.role?.name) setUserRole(d.role.name);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const cctvPercent = cctvTotal > 0 ? Math.round((cctvOnline / cctvTotal) * 100) : 0;
  const nvrPercent = nvrTotal > 0 ? Math.round((nvrPassed / nvrTotal) * 100) : 0;
  const carPercent = carCapacity > 0 ? Math.round((cars.today / carCapacity) * 100) : 0;
  const motoPercent = motoCapacity > 0 ? Math.round((motorcycles.today / motoCapacity) * 100) : 0;
  const hhTotalPass = hhBattery.pass + hhLed.pass + hhDetection.pass + hhAlarm.pass;
  const hhTotalFail = hhBattery.fail + hhLed.fail + hhDetection.fail + hhAlarm.fail;
  const wtTotalPass = wtZones.reduce((a, z) => a + z.pass, 0);
  const wtTotalFail = wtZones.reduce((a, z) => a + z.fail, 0);

  return (
    <div className="gradient-bg min-h-full font-sans pb-6">
      <div className="max-w-7xl mx-auto px-3 py-2">

        {/* Header */}
        <header className="mb-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/report_assets/Images/images_logo.png" alt="WD Logo" className="h-8 md:h-10 w-auto object-contain flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-sky-500 leading-tight truncate">
                  Security Dashboard
                </h1>
                <p className="text-[10px] md:text-[11px] text-slate-400 leading-tight hidden sm:block">
                  BPI Western Digital — Real-time Overview
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">{currentTime}</span>
              </div>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <div className="relative mr-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full absolute top-0 left-0 animate-ping opacity-75" />
                </div>
                <div>
                  <div className="font-bold text-slate-700 text-xs leading-tight">{userName}</div>
                  <div className="text-slate-400 text-[10px]">{userRole}</div>
                </div>
              </div>
              <a href="/report-page" className="bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200 py-1.5 px-3 rounded-xl flex items-center gap-1 text-xs font-medium shadow-sm transition-all">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reports</span>
              </a>
              <button onClick={handleLogout} className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Logout">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* ═══════════════ SECTION 1: SECURITY PERSONNEL ═══════════════ */}
        <SectionHeader icon={Shield} title="Security Personnel" color="from-blue-500 to-indigo-600" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <SparkCard
            title="Total Active"
            subtitle="All shifts combined"
            icon={Users}
            gradient="from-blue-500 to-indigo-600"
            spark={guards}
          />
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <Footprints className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Day Shift</h3>
                  <p className="text-[10px] text-slate-400">07:00 - 19:00</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-none">{dayShift}</div>
                  <div className="text-[10px] text-slate-400 mt-1">of {dayContract} contract</div>
                </div>
                <RingProgress
                  percent={dayContract > 0 ? Math.round((dayShift / dayContract) * 100) : 0}
                  size={52}
                  stroke={5}
                  color="#f59e0b"
                >
                  <span className="text-[10px] font-bold text-slate-700">{dayContract > 0 ? Math.round((dayShift / dayContract) * 100) : 0}%</span>
                </RingProgress>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 truncate" title={morningLastUpdate || 'ยังไม่มีข้อมูล'}>
              <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>รายงานล่าสุด: <strong className="font-semibold text-slate-600">{formatReportTime(morningLastUpdate)}</strong></span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <Footprints className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Night Shift</h3>
                  <p className="text-[10px] text-slate-400">19:00 - 07:00</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-none">{nightShift}</div>
                  <div className="text-[10px] text-slate-400 mt-1">of {nightContract} contract</div>
                </div>
                <RingProgress
                  percent={nightContract > 0 ? Math.round((nightShift / nightContract) * 100) : 0}
                  size={52}
                  stroke={5}
                  color="#6366f1"
                >
                  <span className="text-[10px] font-bold text-slate-700">{nightContract > 0 ? Math.round((nightShift / nightContract) * 100) : 0}%</span>
                </RingProgress>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 truncate" title={eveningLastUpdate || 'ยังไม่มีข้อมูล'}>
              <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <span>รายงานล่าสุด: <strong className="font-semibold text-slate-600">{formatReportTime(eveningLastUpdate)}</strong></span>
            </div>
          </div>
        </div>

        {/* ═══════════════ SECTION 2: PARKING ═══════════════ */}
        <SectionHeader icon={CarFront} title="Parking Lot Status" color="from-sky-500 to-cyan-600" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <SparkCard
            title="Cars Parked"
            subtitle={`of ${carCapacity.toLocaleString()} capacity`}
            icon={CarFront}
            gradient="from-sky-500 to-cyan-600"
            spark={cars}
          />
          <SparkCard
            title="Motorcycles Parked"
            subtitle={`of ${motoCapacity.toLocaleString()} capacity`}
            icon={Bike}
            gradient="from-emerald-500 to-teal-600"
            spark={motorcycles}
          />
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Occupancy Rate</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600">Car</span>
                  <span className="text-xs font-bold text-slate-800">{carPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${carPercent}%`, backgroundColor: carPercent > 90 ? '#ef4444' : carPercent > 70 ? '#f59e0b' : '#10b981' }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{cars.today.toLocaleString()} / {carCapacity.toLocaleString()}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600">Motorcycle</span>
                  <span className="text-xs font-bold text-slate-800">{motoPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${motoPercent}%`, backgroundColor: motoPercent > 90 ? '#ef4444' : motoPercent > 70 ? '#f59e0b' : '#10b981' }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{motorcycles.today.toLocaleString()} / {motoCapacity.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
        {/* Parking Lot Breakdown */}
        {(Object.keys(parkingBreakdown).length>0 || Object.keys(motoBreakdown).length>0) && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5 mb-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Parking Lot Breakdown — Latest Report</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-3">
              {Object.entries(parkingBreakdown).map(([lot, cnt])=>(
                <div key={lot} className="bg-sky-50 border border-sky-100 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] font-semibold text-slate-600 truncate">{lot.replace('ลานรถยนต์ ','L').replace(' (',' ').replace(' Slot)','')}</div>
                  <div className="text-lg font-extrabold text-sky-600">{cnt}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(motoBreakdown).map(([lot,cnt])=>(
                <div key={lot} className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] font-semibold text-slate-600 truncate">{lot.replace('ลานจอด ','M').replace(' (',' ').replace(' Slot)','')}</div>
                  <div className="text-lg font-extrabold text-emerald-600">{cnt}</div>
                </div>
              ))}
            </div>
            {nvrCompliance && (
              <div className="mt-3 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">✓ NVR ≥62 วัน: {nvrCompliance.compliant}</span>
                <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200">✕ &lt;62 วัน: {nvrCompliance.nonCompliant}</span>
                <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200">รวม {nvrCompliance.total}</span>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ SECTION 3: CCTV STATUS ═══════════════ */}
        <SectionHeader icon={Cctv} title="CCTV System Status" color="from-violet-500 to-purple-600" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <SparkCard
            title="Cameras Online"
            subtitle="Operational cameras"
            icon={Cctv}
            gradient="from-violet-500 to-purple-600"
            spark={cameras}
          />
          <SparkCard
            title="NVR Passed"
            subtitle="Recording devices"
            icon={Activity}
            gradient="from-amber-500 to-orange-600"
            spark={nvr}
          />
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">System Health</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1 text-center">
                <RingProgress
                  percent={cctvPercent}
                  size={70}
                  stroke={6}
                  color={cctvPercent >= 90 ? '#10b981' : cctvPercent >= 70 ? '#f59e0b' : '#ef4444'}
                >
                  <span className="text-sm font-extrabold text-slate-800">{cctvPercent}%</span>
                </RingProgress>
                <div className="text-[10px] text-slate-500 mt-1">CCTV Uptime</div>
                <div className="text-[10px] text-slate-400">{cctvOnline}/{cctvTotal} online</div>
              </div>
              <div className="flex-1 text-center">
                <RingProgress
                  percent={nvrPercent}
                  size={70}
                  stroke={6}
                  color={nvrPercent >= 80 ? '#10b981' : nvrPercent >= 60 ? '#f59e0b' : '#ef4444'}
                >
                  <span className="text-sm font-extrabold text-slate-800">{nvrPercent}%</span>
                </RingProgress>
                <div className="text-[10px] text-slate-500 mt-1">NVR Status</div>
                <div className="text-[10px] text-slate-400">{nvrPassed}/{nvrTotal} passed</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ SECTION 4: EQUIPMENT STATUS ═══════════════ */}
        <SectionHeader icon={HardHat} title="Security Equipment Status" color="from-rose-500 to-pink-600" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Handheld Metal Detector */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md flex-shrink-0">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Handheld Metal Detector</h3>
                <p className="text-[10px] text-slate-400">{handheldReports} reports today</p>
              </div>
              <div className="ml-auto">
                <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  handheld.today >= handheld.yesterday ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {handheld.today >= handheld.yesterday ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{handheld.today}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: 'Battery Check', pass: hhBattery.pass, fail: hhBattery.fail },
                { label: 'LED Power', pass: hhLed.pass, fail: hhLed.fail },
                { label: 'Detection Range', pass: hhDetection.pass, fail: hhDetection.fail },
                { label: 'Audio Alert', pass: hhAlarm.pass, fail: hhAlarm.fail },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <div className="text-[10px] font-semibold text-slate-600 mb-1">{item.label}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600">{item.pass}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-rose-500">{item.fail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div className="text-center p-2 bg-emerald-50 rounded-xl">
                <div className="text-base font-extrabold text-emerald-600">{hhTotalPass}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Total Pass</div>
              </div>
              <div className="text-center p-2 bg-rose-50 rounded-xl">
                <div className="text-base font-extrabold text-rose-600">{hhTotalFail}</div>
                <div className="text-[10px] text-rose-600 font-medium">Total Fail</div>
              </div>
            </div>
          </div>

          {/* Walkthrough Metal Detector */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
                <HardHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Walkthrough Metal Detector</h3>
                <p className="text-[10px] text-slate-400">{wtReports} reports today</p>
              </div>
              <div className="ml-auto">
                <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  walkthrough.today >= walkthrough.yesterday ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {walkthrough.today >= walkthrough.yesterday ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{walkthrough.today}%</span>
                </div>
              </div>
            </div>

            <ZoneStatusGrid zones={wtZones} />

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100">
              <div className="text-center p-2 bg-emerald-50 rounded-xl">
                <div className="text-base font-extrabold text-emerald-600">{wtTotalPass}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Total Pass</div>
              </div>
              <div className="text-center p-2 bg-rose-50 rounded-xl">
                <div className="text-base font-extrabold text-rose-600">{wtTotalFail}</div>
                <div className="text-[10px] text-rose-600 font-medium">Total Fail</div>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh */}
        <div className="flex justify-center">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/report_assets/Images/PCS_logo.png" alt="PCS" className="h-8 w-auto opacity-80" />
            <span className="font-semibold text-slate-500 text-sm">PCS Engineering Solution</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">&copy; 2026 PCS Engineering Solution</p>
        </footer>
      </div>
    </div>
  );
}
