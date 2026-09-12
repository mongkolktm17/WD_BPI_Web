'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { SocHeader } from '@/components/soc/SocHeader';
import { ExecutivePersonnelCard } from '@/components/soc/ExecutivePersonnelCard';
import { SurveillancePanel } from '@/components/soc/SurveillancePanel';
import { ParkingPanel, buildLotData } from '@/components/soc/ParkingPanel';
import { UnifiedScreeningPanel } from '@/components/soc/UnifiedScreeningPanel';
import { calcHealthScore, formatTimeTH, type ZoneStat } from '@/components/soc/soc-utils';
import { useSite } from '@/lib/SiteContext';
import { ExecutiveRotatingBar } from '@/components/soc/ExecutiveRotatingBar';
import { ExecutiveDualView } from '@/components/soc/ExecutiveDualView';

const EMPTY_CHECK = { pass: 0, fail: 0 };
const EMPTY_ZONES: ZoneStat[] = [
  { name: 'Zone 1', pass: 0, fail: 0 },
  { name: 'Zone 2', pass: 0, fail: 0 },
  { name: 'Zone 3', pass: 0, fail: 0 },
  { name: 'Zone 4', pass: 0, fail: 0 },
  { name: 'Zone 5', pass: 0, fail: 0 },
  { name: 'Zone 6', pass: 0, fail: 0 },
];

/**
 * Executive Single-Screen SOC Command Dashboard
 * Supports:
 * - Multi-site switching (Bang Pa-in BPI & Prachinburi PRB)
 * - 15-second automatic carousel rotation for Corporate Executives
 * - Dual-View comparison side-by-side mode
 */
export default function SocDashboard() {
  const router = useRouter();
  const { currentSite, currentSiteId, switchSite } = useSite();
  const [isDualView, setIsDualView] = useState(false);

  const [currentTime, setCurrentTime] = useState('');
  const [userName, setUserName] = useState('System Admin');
  const [userRole, setUserRole] = useState('Administrator');
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  // Pillar 1: Personnel
  const [dayShift, setDayShift] = useState(0);
  const [nightShift, setNightShift] = useState(0);
  const [dayContract, setDayContract] = useState(0);
  const [nightContract, setNightContract] = useState(0);

  // Pillar 3: Parking
  const [carsToday, setCarsToday] = useState(0);
  const [motoToday, setMotoToday] = useState(0);
  const [carCapacity, setCarCapacity] = useState(1075);
  const [motoCapacity, setMotoCapacity] = useState(757);
  const [parkingBreakdown, setParkingBreakdown] = useState<Record<string, number>>({});
  const [motoBreakdown, setMotoBreakdown] = useState<Record<string, number>>({});

  // Pillar 2: Surveillance
  const [cctvOnline, setCctvOnline] = useState(0);
  const [cctvTotal, setCctvTotal] = useState(0);
  const [nvrPassed, setNvrPassed] = useState(0);
  const [nvrTotal, setNvrTotal] = useState(0);
  const [nvrHistory, setNvrHistory] = useState<(number | null)[]>([]);

  // Pillar 4: Screening Equipment
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
      const res = await apiFetch<any>(`/api/stats/dashboard?site_id=${currentSiteId}`);
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
  }, [currentSiteId]);

  useEffect(() => {
    fetchAllData();
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' ' +
          now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      );
    };
    tick();
    const clock = setInterval(tick, 1000);
    // Periodic background sync every 60s
    const poller = setInterval(fetchAllData, 60000);
    return () => {
      clearInterval(clock);
      clearInterval(poller);
    };
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
    <div className="soc-root min-h-screen font-sans p-2.5 md:p-3 flex flex-col justify-between">
      <div className="max-w-[1600px] w-full mx-auto space-y-2.5 flex-1 flex flex-col justify-between">
        {/* Executive 15-Second Carousel Control Bar */}
        <ExecutiveRotatingBar isDualView={isDualView} setIsDualView={setIsDualView} />

        {/* Executive Header & Quick Actions */}
        <SocHeader
          currentTime={currentTime}
          userName={userName}
          userRole={userRole}
          healthy={operational}
          healthScore={healthScore}
          loading={loading}
          siteName={`${currentSite.name} (${currentSite.code})`}
          siteCode={currentSite.code}
          onRefresh={fetchAllData}
          onLogout={handleLogout}
        />

        {isDualView ? (
          /* Dual Comparison View (Split Screen BPI & PRB) */
          <ExecutiveDualView
            onSelectSite={(id) => {
              switchSite(id);
              setIsDualView(false);
            }}
          />
        ) : (
          /* Single Site 4 Strategic Pillars */
          <div key={currentSite.code} className="space-y-2.5 transition-all duration-300 animate-in fade-in">
            {/* Row 1: Core Operations - 3 Strategic Pillars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
              {/* Pillar 1: Security Personnel */}
              <ExecutivePersonnelCard
                dayShift={dayShift}
                dayContract={dayContract}
                nightShift={nightShift}
                nightContract={nightContract}
                totalActive={totalActive}
                totalContract={totalContract}
                updatedLabel={stamp}
              />

              {/* Pillar 2: Surveillance Infrastructure */}
              <SurveillancePanel
                cctvOnline={cctvOnline}
                cctvTotal={cctvTotal}
                nvrPassed={nvrPassed}
                nvrTotal={nvrTotal}
                nvrHistory={nvrHistory}
                updatedLabel={stamp}
              />

              {/* Pillar 3: Traffic & Parking */}
              <ParkingPanel
                used={parkingUsed}
                capacity={parkingCapacity}
                lots={lots}
                moto={moto}
                updatedLabel={stamp}
              />
            </div>

            {/* Row 2: Pillar 4 - Access Screening & Facility Security */}
            <div className="w-full">
              <UnifiedScreeningPanel
                handheldChecks={{
                  battery: hhBattery,
                  led: hhLed,
                  detection: hhDetection,
                  alarm: hhAlarm,
                }}
                handheldTotalReports={handheldReports}
                walkthroughZones={wtZones}
                walkthroughTotalReports={wtReports}
                updatedLabel={stamp}
              />
            </div>
          </div>
        )}

        {/* Compact Status Footer */}
        <footer className="pt-1 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/60 px-2 gap-1">
          <div className="flex items-center gap-2">
            <img src="/report_assets/Images/PCS_logo.png" alt="PCS" className="h-5 w-auto opacity-70" />
            <span className="font-semibold text-slate-500">PCS Security & Facility Management</span>
            <span className="hidden md:inline">· Western Digital {currentSite.code} Plant ({currentSite.name})</span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              สถานะระบบ: <strong className={operational ? 'text-emerald-600' : 'text-amber-600'}>
                {healthScore === null ? 'รอข้อมูล' : operational ? 'ปกติทุกระบบ (Operational)' : 'ต้องการตรวจสอบ (Attention)'}
              </strong>
            </span>
            <span>· ซิงค์ล่าสุด: {stamp ?? '—'}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
