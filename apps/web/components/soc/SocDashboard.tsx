'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SocHeader } from '@/components/soc/SocHeader';
import { KpiCard, QuickOverview } from '@/components/soc/KpiCards';
import { HealthBanner } from '@/components/soc/HealthBanner';
import { ParkingPanel, buildLotData } from '@/components/soc/ParkingPanel';
import { SurveillancePanel } from '@/components/soc/SurveillancePanel';
import { HandheldPanel, WalkthroughPanel } from '@/components/soc/EquipmentPanels';
import { calcHealthScore, formatTimeTH, type ZoneStat } from '@/components/soc/soc-utils';

const EMPTY_CHECK = { pass: 0, fail: 0 };
const EMPTY_ZONES: ZoneStat[] = [
  { name: 'Zone 1', pass: 0, fail: 0 },
  { name: 'Zone 2', pass: 0, fail: 0 },
  { name: 'Zone 3', pass: 0, fail: 0 },
  { name: 'Zone 4', pass: 0, fail: 0 },
  { name: 'Zone 5', pass: 0, fail: 0 },
  { name: 'Zone 6', pass: 0, fail: 0 },
];

export default function SocDashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [userName, setUserName] = useState('System Admin');
  const [userRole, setUserRole] = useState('Administrator');
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [dayShift, setDayShift] = useState(0);
  const [nightShift, setNightShift] = useState(0);
  const [dayContract, setDayContract] = useState(0);
  const [nightContract, setNightContract] = useState(0);

  const [carsToday, setCarsToday] = useState(0);
  const [motoToday, setMotoToday] = useState(0);
  const [carCapacity, setCarCapacity] = useState(1075);
  const [motoCapacity, setMotoCapacity] = useState(757);
  const [parkingBreakdown, setParkingBreakdown] = useState<Record<string, number>>({});
  const [motoBreakdown, setMotoBreakdown] = useState<Record<string, number>>({});

  const [cctvOnline, setCctvOnline] = useState(0);
  const [cctvTotal, setCctvTotal] = useState(0);
  const [nvrPassed, setNvrPassed] = useState(0);
  const [nvrTotal, setNvrTotal] = useState(0);
  const [nvrHistory, setNvrHistory] = useState<(number | null)[]>([]);

  const [handheldReports, setHandheldReports] = useState(0);
  const [hhBattery, setHhBattery] = useState(EMPTY_CHECK);
  const [hhLed, setHhLed] = useState(EMPTY_CHECK);
  const [hhDetection, setHhDetection] = useState(EMPTY_CHECK);
  const [hhAlarm, setHhAlarm] = useState(EMPTY_CHECK);

  const [wtReports, setWtReports] = useState(0);
  const [wtZones, setWtZones] = useState<ZoneStat[]>(EMPTY_ZONES);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<any>('/api/stats/dashboard');
      if (res) {
        const d = res?.data ?? res;

        const gToday = d.guards?.today || {};
        setDayShift(gToday.morning ?? 0);
        setNightShift(gToday.evening ?? 0);
        setDayContract(gToday.morningContract ?? gToday.morning ?? 0);
        setNightContract(gToday.eveningContract ?? gToday.evening ?? 0);

        const pCar = d.parking?.car || {};
        const pMoto = d.parking?.motorcycle || {};
        setCarsToday(pCar.today ?? 0);
        setMotoToday(pMoto.today ?? 0);
        setCarCapacity(d.parking?.carCapacity || 1075);
        setMotoCapacity(d.parking?.motorcycleCapacity || 757);
        if (d.parking?.parkingLotBreakdown) setParkingBreakdown(d.parking.parkingLotBreakdown);
        if (d.parking?.motorcycleLotBreakdown) setMotoBreakdown(d.parking.motorcycleLotBreakdown);

        setCctvOnline(d.cctv?.online ?? 0);
        setCctvTotal(d.cctv?.total ?? 0);
        setNvrPassed(d.nvr?.passed ?? 0);
        setNvrTotal(d.nvr?.total ?? 0);
        setNvrHistory(d.nvr?.history ?? []);

        setHandheldReports(d.handheld?.totalChecks ?? 0);
        setHhBattery(d.handheld?.subItems?.battery ?? EMPTY_CHECK);
        setHhLed(d.handheld?.subItems?.led ?? EMPTY_CHECK);
        setHhDetection(d.handheld?.subItems?.detection ?? EMPTY_CHECK);
        setHhAlarm(d.handheld?.subItems?.alarm ?? EMPTY_CHECK);

        setWtReports(d.walkthrough?.totalChecks ?? 0);
        setWtZones(d.walkthrough?.zones ?? EMPTY_ZONES);

        setFetchedAt(new Date().toISOString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
          ' ' +
          now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      );
    };
    tick();
    const clock = setInterval(tick, 1000);
    return () => clearInterval(clock);
  }, [fetchAllData]);

  useEffect(() => {
    apiFetch<any>('/api/auth/me')
      .then((data) => {
        const u = data?.data?.user ?? data?.data ?? data;
        if (u.fullName) setUserName(u.fullName);
        else if (u.username) setUserName(u.username);
        const roleName = u.role?.name ?? u.role_name ?? u.role;
        if (roleName) setUserRole(roleName);
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

  const totalActive = dayShift + nightShift;
  const totalContract = dayContract + nightContract;
  const parkingUsed = carsToday + motoToday;
  const parkingCapacity = carCapacity + motoCapacity;
  const parkingPct = parkingCapacity > 0 ? Math.round((parkingUsed / parkingCapacity) * 100) : 0;

  const hhPass = hhBattery.pass + hhLed.pass + hhDetection.pass + hhAlarm.pass;
  const hhFail = hhBattery.fail + hhLed.fail + hhDetection.fail + hhAlarm.fail;
  const wtPass = wtZones.reduce((a, z) => a + z.pass, 0);
  const wtFail = wtZones.reduce((a, z) => a + z.fail, 0);

  const healthScore = calcHealthScore({
    cctvOnline,
    cctvTotal,
    nvrPassed,
    nvrTotal,
    handheldPass: hhPass,
    handheldFail: hhFail,
    walkthroughPass: wtPass,
    walkthroughFail: wtFail,
    guardActive: totalActive,
    guardContract: totalContract,
  });
  const operational = healthScore !== null && healthScore >= 80;

  const { lots, moto } = buildLotData(parkingBreakdown, motoBreakdown);
  const stamp = fetchedAt ? formatTimeTH(fetchedAt) : null;

  return (
    <div className="soc-root min-h-screen font-sans pb-6">
      <div className="max-w-[1440px] mx-auto px-3 md:px-4 py-3 space-y-3">
        <SocHeader
          currentTime={currentTime}
          userName={userName}
          userRole={userRole}
          healthy={operational}
          onLogout={handleLogout}
        />

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard
            icon="sun"
            labelEn="Day Shift"
            labelTh="กะกลางวัน"
            sub="07:00–19:00"
            value={dayShift}
            total={dayContract}
            gradient="from-sky-500 via-blue-500 to-blue-600"
            barFrom="#34d399"
            barTo="#10b981"
          />
          <KpiCard
            icon="moon"
            labelEn="Night Shift"
            labelTh="กะกลางคืน"
            sub="19:00–07:00"
            value={nightShift}
            total={nightContract}
            gradient="from-indigo-500 via-indigo-600 to-violet-600"
            barFrom="#c4b5fd"
            barTo="#8b5cf6"
          />
          <KpiCard
            icon="users"
            labelEn="Total Active"
            labelTh="เจ้าหน้าที่ทั้งหมด"
            sub="All shifts"
            value={totalActive}
            total={totalContract}
            gradient="from-blue-600 via-sky-500 to-cyan-500"
            barFrom="#67e8f9"
            barTo="#06b6d4"
          />
          <KpiCard
            icon="car"
            labelEn="Parking Occupancy"
            labelTh="อัตราจอดรถ"
            sub="Cars + Motorcycles"
            value={parkingUsed}
            total={parkingCapacity}
            gradient="from-teal-500 via-cyan-500 to-sky-600"
            barFrom="#5eead4"
            barTo="#14b8a6"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div className="xl:col-span-9 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <HealthBanner score={healthScore} operational={operational} />
          </div>
          <div className="xl:col-span-3">
            <QuickOverview day={dayShift} night={nightShift} total={totalActive} />
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div className="xl:col-span-5">
            <ParkingPanel used={parkingUsed} capacity={parkingCapacity} lots={lots} moto={moto} updatedLabel={stamp} />
          </div>
          <div className="xl:col-span-7">
            <SurveillancePanel
              cctvOnline={cctvOnline}
              cctvTotal={cctvTotal}
              nvrPassed={nvrPassed}
              nvrTotal={nvrTotal}
              nvrHistory={nvrHistory}
              updatedLabel={stamp}
            />
          </div>
        </div>

        {/* Equipment */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <HandheldPanel
            checks={{ battery: hhBattery, led: hhLed, detection: hhDetection, alarm: hhAlarm }}
            totalReports={handheldReports}
            updatedLabel={stamp}
          />
          <WalkthroughPanel zones={wtZones} totalReports={wtReports} updatedLabel={stamp} />
        </div>

        <div className="flex justify-center pt-1">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data · รีเฟรชข้อมูล
          </button>
        </div>

        <footer className="pt-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/report_assets/Images/PCS_logo.png" alt="PCS" className="h-7 w-auto opacity-80" />
            <span className="font-semibold text-slate-500 text-sm">PCS Engineering Solution</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Last Updated: {stamp ?? '—'} · System Status: {healthScore === null ? 'No Data · ยังไม่มีข้อมูล' : operational ? 'All Systems Operational · ระบบทั้งหมดปกติ' : 'Attention Needed · ต้องการตรวจสอบ'}
          </p>
          <p className="text-[11px] text-slate-400">&copy; 2026 PCS Engineering Solution. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
