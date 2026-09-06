import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StatsService {
  private readonly CACHE_KEY = 'dashboard_stats_data';
  private readonly CACHE_TTL = 300; // 5 mins cache TTL (matches legacy get_stats_data.php)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getDashboardStats() {
    // 1. Try Redis cache first
    const cachedStats = await this.redis.get(this.CACHE_KEY);
    if (cachedStats) {
      return {
        source: 'cache',
        data: cachedStats,
      };
    }

    // 2. Fetch fresh data parallelly from PostgreSQL 18
    const [
      cctvNormal,
      cctvAbnormal,
      carParkingCount,
      guardsCount,
      handheldCount,
      walkthroughCount,
      recentLogs,
    ] = await Promise.all([
      this.prisma.camera.count({ where: { status: 'normal' } }),
      this.prisma.camera.count({ where: { status: { not: 'normal' } } }),
      this.prisma.carParking.count({ where: { status: 'parked' } }),
      this.prisma.officer.count({ where: { status: 'active' } }),
      this.prisma.handheldEquipment.count({ where: { status: 'normal' } }),
      this.prisma.walkthroughDetector.count({ where: { status: 'normal' } }),
      this.prisma.guardDutyLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const statsData = {
      timestamp: new Date().toISOString(),
      summary: {
        cctv: {
          total: cctvNormal + cctvAbnormal,
          normal: cctvNormal,
          abnormal: cctvAbnormal,
          uptimePercentage: cctvNormal + cctvAbnormal > 0 
            ? ((cctvNormal / (cctvNormal + cctvAbnormal)) * 100).toFixed(2)
            : '100.00',
        },
        parking: {
          activeParked: carParkingCount,
        },
        guards: {
          totalActive: guardsCount,
        },
        equipment: {
          handheldNormal: handheldCount,
          walkthroughNormal: walkthroughCount,
        },
      },
      recentActivityLogs: recentLogs,
    };

    // 3. Save to Redis cache
    await this.redis.set(this.CACHE_KEY, statsData, this.CACHE_TTL);

    return {
      source: 'database',
      data: statsData,
    };
  }

  async clearStatsCache() {
    await this.redis.del(this.CACHE_KEY);
    return { message: 'ล้างแคชสถิติเรียบร้อยแล้ว' };
  }

  async getDashboardData() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 6);

    // Local-calendar day key (YYYY-MM-DD). toISOString() would shift the day
    // in UTC+X timezones (e.g. Asia/Bangkok), emptying the "today" bucket.
    const dateKey = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Build 7-day date range
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekAgo);
      d.setDate(d.getDate() + i);
      dates.push(dateKey(d));
    }

    // Fetch all data in parallel
    const [
      guardCounts,
      parkingRecords,
      cameras,
      nvrDevices,
      nvrRecordings,
      handheldChecks,
      walkthroughChecks,
      walkthroughDetectors,
    ] = await Promise.all([
      // Guard counts for last 7 days
      this.prisma.guardCount.findMany({
        where: { recordDate: { gte: weekAgo, lte: now } },
        orderBy: { recordDate: 'asc' },
      }),
      // Parking for last 7 days
      this.prisma.carParking.findMany({
        where: { recordDate: { gte: weekAgo, lte: now } },
        orderBy: { recordDate: 'asc' },
      }),
      // All cameras for status
      this.prisma.camera.findMany({
        select: { id: true, status: true, buildingId: true, cameraNo: true },
      }),
      // NVR devices
      this.prisma.nvrDevice.findMany({
        select: { id: true, totalChannels: true, buildingId: true },
      }),
      // NVR recordings for last 7 days
      this.prisma.nvrRecordingDay.findMany({
        where: { recordDate: { gte: weekAgo, lte: now } },
        orderBy: { recordDate: 'asc' },
      }),
      // Handheld checks for last 7 days
      this.prisma.handheldCheck.findMany({
        where: { checkDate: { gte: weekAgo, lte: now } },
        include: { equipment: true },
        orderBy: { checkDate: 'asc' },
      }),
      // Walkthrough checks for last 7 days
      this.prisma.walkthroughCheck.findMany({
        where: { checkDate: { gte: weekAgo, lte: now } },
        include: { detector: true },
        orderBy: { checkDate: 'asc' },
      }),
      // Walkthrough detectors
      this.prisma.walkthroughDetector.findMany({
        select: { id: true, detectorCode: true, location: true, status: true },
      }),
    ]);

    // ── GUARDS ──
    const [latestMorning, latestEvening] = await Promise.all([
      this.prisma.guardCount.findFirst({
        where: { shift: { in: ['morning', 'เช้า'] }, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guardCount.findFirst({
        where: { shift: { in: ['evening', 'night', 'ดึก', 'ค่ำ'] }, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const mActual = latestMorning?.presentGuards ?? 0;
    const mContract = latestMorning?.totalGuards ?? 0;
    const mLastUpdate = latestMorning?.createdAt ? latestMorning.createdAt.toISOString() : null;

    const eActual = latestEvening?.presentGuards ?? 0;
    const eContract = latestEvening?.totalGuards ?? 0;
    const eLastUpdate = latestEvening?.createdAt ? latestEvening.createdAt.toISOString() : null;

    const guardDayMap: Record<string, { morning: number; evening: number }> = {};
    for (const gc of guardCounts) {
      const key = dateKey(new Date(gc.recordDate));
      if (!guardDayMap[key]) guardDayMap[key] = { morning: 0, evening: 0 };
      if (gc.shift === 'morning' || gc.shift === 'เช้า') {
        guardDayMap[key].morning = gc.presentGuards;
      } else {
        guardDayMap[key].evening = gc.presentGuards;
      }
    }
    const todayGuards = guardDayMap[dateKey(todayStart)] || { morning: mActual, evening: eActual };
    const yesterdayGuards = guardDayMap[dateKey(yesterdayStart)] || { morning: 0, evening: 0 };
    
    // Carry forward history
    let runningM = mActual;
    let runningE = eActual;
    const guardHistory = dates.map(d => {
      const g = guardDayMap[d];
      if (g) {
        if (g.morning > 0) runningM = g.morning;
        if (g.evening > 0) runningE = g.evening;
        return (g.morning > 0 ? g.morning : runningM) + (g.evening > 0 ? g.evening : runningE);
      }
      return runningM + runningE;
    });

    // ── PARKING ──
    const parkingDayMap: Record<string, { car: number; moto: number }> = {};
    for (const pr of parkingRecords) {
      const key = dateKey(new Date(pr.recordDate));
      if (!parkingDayMap[key]) parkingDayMap[key] = { car: 0, moto: 0 };
      if (pr.status === 'parked') {
        const slot = (pr.slotNo || '').toLowerCase();
        if (slot.includes('moto') || slot.includes('motor')) {
          parkingDayMap[key].moto++;
        } else {
          parkingDayMap[key].car++;
        }
      }
    }
    const todayParking = parkingDayMap[dateKey(todayStart)] || { car: 0, moto: 0 };
    const yesterdayParking = parkingDayMap[dateKey(yesterdayStart)] || { car: 0, moto: 0 };
    const carHistory = dates.map(d => parkingDayMap[d]?.car ?? null);
    const motoHistory = dates.map(d => parkingDayMap[d]?.moto ?? null);

    // ── CCTV ──
    const cctvOnline = cameras.filter(c => c.status === 'normal').length;
    const cctvTotal = cameras.length;

    // ── NVR ──
    const nvrTotalChannels = nvrDevices.reduce((sum, d) => sum + d.totalChannels, 0);
    const nvrDayMap: Record<string, number> = {};
    for (const nr of nvrRecordings) {
      const key = dateKey(new Date(nr.recordDate));
      if (!nvrDayMap[key]) nvrDayMap[key] = 0;
      if (nr.status === 'pass' || nr.status === 'normal' || nr.status === 'recorded') {
        nvrDayMap[key]++;
      }
    }
    const todayNvr = nvrDayMap[dateKey(todayStart)] || 0;
    const yesterdayNvr = nvrDayMap[dateKey(yesterdayStart)] || 0;
    const nvrHistory = dates.map(d => nvrDayMap[d] ?? null);

    // ── HANDHELD ──
    const hhDayMap: Record<string, { pass: number; total: number }> = {};
    for (const hc of handheldChecks) {
      const key = dateKey(new Date(hc.checkDate));
      if (!hhDayMap[key]) hhDayMap[key] = { pass: 0, total: 0 };
      hhDayMap[key].total++;
      if (hc.status === 'pass' || hc.status === 'normal') hhDayMap[key].pass++;
    }
    const hhHistory = dates.map(d => {
      const h = hhDayMap[d];
      return h && h.total > 0 ? Math.round((h.pass / h.total) * 100) : null;
    });

    // HH sub-items from today's checks (parse remark for keywords)
    const todayHhChecks = handheldChecks.filter(hc => dateKey(new Date(hc.checkDate)) === dateKey(todayStart));
    const hhSubItems = { battery: { pass: 0, fail: 0 }, led: { pass: 0, fail: 0 }, detection: { pass: 0, fail: 0 }, alarm: { pass: 0, fail: 0 } };
    for (const hc of todayHhChecks) {
      const remark = (hc.remark || '').toLowerCase();
      const isPass = hc.status === 'pass' || hc.status === 'normal';
      const isFail = hc.status === 'fail' || hc.status === 'abnormal';
      // Count all checks as pass/fall for each sub-item based on overall status
      if (remark.includes('battery') || remark.includes('แบต') || remark === '' || todayHhChecks.length > 0) {
        if (isPass) hhSubItems.battery.pass++; else if (isFail) hhSubItems.battery.fail++;
      }
      if (remark.includes('led') || remark === '' || todayHhChecks.length > 0) {
        if (isPass) hhSubItems.led.pass++; else if (isFail) hhSubItems.led.fail++;
      }
      if (remark.includes('detect') || remark.includes('ตรวจ') || remark === '' || todayHhChecks.length > 0) {
        if (isPass) hhSubItems.detection.pass++; else if (isFail) hhSubItems.detection.fail++;
      }
      if (remark.includes('alarm') || remark.includes('เสียง') || remark === '' || todayHhChecks.length > 0) {
        if (isPass) hhSubItems.alarm.pass++; else if (isFail) hhSubItems.alarm.fail++;
      }
    }

    // ── WALKTHROUGH ──
    const wtDayMap: Record<string, { pass: number; total: number }> = {};
    for (const wc of walkthroughChecks) {
      const key = dateKey(new Date(wc.checkDate));
      if (!wtDayMap[key]) wtDayMap[key] = { pass: 0, total: 0 };
      wtDayMap[key].total++;
      if (wc.status === 'pass' || wc.status === 'normal') wtDayMap[key].pass++;
    }
    const wtHistory = dates.map(d => {
      const w = wtDayMap[d];
      return w && w.total > 0 ? Math.round((w.pass / w.total) * 100) : null;
    });

    // WT zones from today's checks grouped by detector location
    const todayWtChecks = walkthroughChecks.filter(wc => dateKey(new Date(wc.checkDate)) === dateKey(todayStart));
    const wtZoneMap: Record<string, { pass: number; fail: number }> = {};
    for (const wc of todayWtChecks) {
      const zone = wc.detector?.location || wc.detector?.detectorCode || 'Unknown';
      if (!wtZoneMap[zone]) wtZoneMap[zone] = { pass: 0, fail: 0 };
      if (wc.status === 'pass' || wc.status === 'normal') {
        wtZoneMap[zone].pass++;
      } else {
        wtZoneMap[zone].fail++;
      }
    }
    const wtZones = Object.entries(wtZoneMap).slice(0, 6).map(([name, data]) => ({ name, ...data }));
    // Pad to 6 zones if needed
    while (wtZones.length < 6) {
      wtZones.push({ name: `Zone ${wtZones.length + 1}`, pass: 0, fail: 0 });
    }

    // ── Parking Lot Breakdown (latest report)
    const latestParking = await this.prisma.carParking.findFirst({ where: { isDeleted: false }, orderBy: { createdAt: 'desc' } });
    const latestLegacyCounts = latestParking?.id ? [] : [];
    // Parse lotCounts from latest parking
    const carLots = ['ลานรถยนต์ 1 (97 Slot)','ลานรถยนต์ 2 (114 Slot)','ลานรถยนต์ 3/1 (100 Slot)','ลานรถยนต์ 3/2 (264 Slot)','ลานรถยนต์ 4 (415 Slot)','ลานรถยนต์ 5 (53 Slot)','ลานรถยนต์ B.9 (129 Slot)'];
    const motoLots = ['ลานจอด 1 (296 Slot)','ลานจอด 2 (210 Slot)','ลานจอด 3/1 (251 Slot)'];
    const parkingLotBreakdown: Record<string, number> = {};
    const motoLotBreakdown: Record<string, number> = {};
    if (latestParking?.lotCounts && typeof latestParking.lotCounts === 'object') {
      const lc = latestParking.lotCounts as any;
      // Normalize to NFC: Thai keys written from different clients (web form,
      // psql imports, legacy dumps) may use different combining sequences.
      const normMap = new Map<string, any>();
      for (const [k, v] of Object.entries(lc)) normMap.set(k.normalize('NFC'), v);
      const lookup = (lot: string) => normMap.get(lot.normalize('NFC'));
      carLots.forEach(l => { const v = lookup(l); parkingLotBreakdown[l] = v ? parseInt(v.vehicleCount ?? v) || 0 : 0; });
      motoLots.forEach(l => { const v = lookup(l); motoLotBreakdown[l] = v ? parseInt(v.vehicleCount ?? v) || 0 : 0; });
    } else {
      // fallback from totalCars distributed
      carLots.forEach(l=> parkingLotBreakdown[l]=0);
      motoLots.forEach(l=> motoLotBreakdown[l]=0);
      if (latestParking) {
        parkingLotBreakdown[carLots[0]] = latestParking.totalCars || 0;
      }
    }
    // NVR compliance
    const allNvrRecordingsLatest = await this.prisma.nvrRecordingDay.findMany({ orderBy: { recordDate: 'desc' }, take: 100 });
    const latestByNvr = new Map<number, any>();
    for (const r of allNvrRecordingsLatest) { if (!latestByNvr.has(r.nvrId)) latestByNvr.set(r.nvrId, r); }
    let nvrCompliant = 0, nvrNonCompliant = 0;
    for (const v of latestByNvr.values()) { if (v.daysRecorded >= 62) nvrCompliant++; else nvrNonCompliant++; }
    const nvrCompliance = { compliant: nvrCompliant, nonCompliant: nvrNonCompliant, total: latestByNvr.size, targetDays: 62 };

    return {
      guards: {
        today: {
          total: mActual + eActual,
          morning: mActual,
          evening: eActual,
          morningContract: mContract,
          eveningContract: eContract,
          morningLastUpdate: mLastUpdate,
          eveningLastUpdate: eLastUpdate,
        },
        yesterday: { total: yesterdayGuards.morning + yesterdayGuards.evening, morning: yesterdayGuards.morning, evening: yesterdayGuards.evening },
        history: guardHistory,
      },
      parking: {
        car: { today: todayParking.car, yesterday: yesterdayParking.car, history: carHistory },
        motorcycle: { today: todayParking.moto, yesterday: yesterdayParking.moto, history: motoHistory },
        carCapacity: 1075,
        motorcycleCapacity: 757,
        parkingLotBreakdown,
        motorcycleLotBreakdown: motoLotBreakdown,
      },
      cctv: {
        online: cctvOnline,
        total: cctvTotal,
      },
      nvr: {
        passed: todayNvr,
        total: nvrTotalChannels,
        yesterday: yesterdayNvr,
        history: nvrHistory,
        compliance: nvrCompliance,
      },
      handheld: {
        passRate: hhHistory,
        totalChecks: todayHhChecks.length,
        subItems: hhSubItems,
      },
      walkthrough: {
        passRate: wtHistory,
        totalChecks: todayWtChecks.length,
        zones: wtZones,
      },
    };
  }

  async getVisualStats(query?: { range?: string; month?: string; year?: string }) {
    const range = query?.range || 'week';
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let dates: string[] = [];
    let isYearRange = range === 'year';

    // 1. Determine Date Range
    if (range === 'week') {
      // If query does not specify, default to the last 7 days of recent data or today
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // Check if data exists in last 7 days; if not, fallback to the latest available active week in DB (e.g. 2026-03)
      const latestRecord = await this.prisma.carParking.findFirst({
        orderBy: { recordDate: 'desc' },
      });
      if (latestRecord && (!query?.range || range === 'week')) {
        const latestDate = new Date(latestRecord.recordDate);
        // If today is far ahead of data, anchor weekly view to the latest data week
        if (now.getTime() - latestDate.getTime() > 14 * 24 * 3600 * 1000) {
          endDate = new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate(), 23, 59, 59);
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
        }
      }

      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
    } else if (range === 'month') {
      const selMonth = query?.month ? parseInt(query.month) : 3; // default March
      const selYear = query?.year ? parseInt(query.year) : 2026;
      startDate = new Date(selYear, selMonth - 1, 1);
      const daysInMonth = new Date(selYear, selMonth, 0).getDate();
      endDate = new Date(selYear, selMonth - 1, daysInMonth, 23, 59, 59);
      for (let i = 1; i <= daysInMonth; i++) {
        dates.push(`${selYear}-${String(selMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
      }
    } else {
      // Year range: show months
      isYearRange = true;
      const selYear = query?.year ? parseInt(query.year) : 2026;
      startDate = new Date(selYear, 0, 1);
      endDate = new Date(selYear, 11, 31, 23, 59, 59);
      for (let m = 1; m <= 12; m++) {
        dates.push(`${selYear}-${String(m).padStart(2, '0')}`);
      }
    }

    const formatLabel = (dateStr: string): string => {
      if (isYearRange) {
        const [y, m] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(m) - 1]} ${y}`;
      }
      const d = new Date(dateStr + 'T00:00:00');
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    };

    // Local-calendar day key (YYYY-MM-DD). toISOString() would shift the day
    // in UTC+X timezones (e.g. Asia/Bangkok), emptying the "today" bucket.
    const dateKey = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const getKey = (d: Date) => (isYearRange ? monthKey(d) : dateKey(d));

    // 1. Guard Counts
    const guardCounts = await this.prisma.guardCount.findMany({
      where: { recordDate: { gte: startDate, lte: endDate } },
      orderBy: { recordDate: 'asc' },
    });
    const securityMap: Record<string, { morning: number; evening: number; count: number }> = {};
    for (const gc of guardCounts) {
      const key = getKey(new Date(gc.recordDate));
      if (!securityMap[key]) securityMap[key] = { morning: 0, evening: 0, count: 0 };
      if (gc.shift === 'morning' || gc.shift === 'เช้า') {
        securityMap[key].morning += gc.presentGuards;
      } else {
        securityMap[key].evening += gc.presentGuards;
      }
      securityMap[key].count++;
    }

    // 2. Parking Counts (from parking_lot_counts via reportId or car_parkings)
    const parkingLots = await this.prisma.parkingLotCount.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'asc' },
    });

    const parkingMap: Record<string, { car: number; moto: number; count: number }> = {};

    for (const pl of parkingLots) {
      const key = getKey(new Date(pl.createdAt));
      if (!parkingMap[key]) parkingMap[key] = { car: 0, moto: 0, count: 0 };
      const val = pl.vehicleCount || 0;
      if (pl.vehicleType === 'car') {
        parkingMap[key].car += val;
      } else {
        parkingMap[key].moto += val;
      }
      parkingMap[key].count++;
    }

    // 3. CCTV Online Status (from cctv_reports)
    const cctvReports = await this.prisma.cctvReport.findMany({
      where: { reportDate: { gte: startDate, lte: endDate } },
      orderBy: { reportDate: 'asc' },
    });
    const cctvMap: Record<string, { totalPct: number; count: number }> = {};
    for (const cr of cctvReports) {
      const key = getKey(new Date(cr.reportDate));
      if (!cctvMap[key]) cctvMap[key] = { totalPct: 0, count: 0 };
      const tot = cr.totalNormal + cr.totalAbnormal;
      const pct = tot > 0 ? (cr.totalNormal / tot) * 100 : 100;
      cctvMap[key].totalPct += pct;
      cctvMap[key].count++;
    }

    // Fallback if no CCTV reports in exact period
    const totalCameras = await this.prisma.camera.count();
    const normalCameras = await this.prisma.camera.count({ where: { status: 'normal' } });
    const currentCameraPct = totalCameras > 0 ? (normalCameras / totalCameras) * 100 : 98.5;

    // 4. Handheld Check Pass Rate
    const handheldChecks = await this.prisma.handheldCheck.findMany({
      where: { checkDate: { gte: startDate, lte: endDate } },
      orderBy: { checkDate: 'asc' },
    });
    const hhMap: Record<string, { pass: number; total: number }> = {};
    for (const hc of handheldChecks) {
      const key = getKey(new Date(hc.checkDate));
      if (!hhMap[key]) hhMap[key] = { pass: 0, total: 0 };
      hhMap[key].total++;
      if (hc.status === 'pass' || hc.status === 'normal') hhMap[key].pass++;
    }

    // 5. Walkthrough Check Pass Rate
    const wtChecks = await this.prisma.walkthroughCheck.findMany({
      where: { checkDate: { gte: startDate, lte: endDate } },
      orderBy: { checkDate: 'asc' },
    });
    const wtMap: Record<string, { pass: number; total: number }> = {};
    for (const wc of wtChecks) {
      const key = getKey(new Date(wc.checkDate));
      if (!wtMap[key]) wtMap[key] = { pass: 0, total: 0 };
      wtMap[key].total++;
      if (wc.status === 'pass' || wc.status === 'normal') wtMap[key].pass++;
    }

    // Populate datasets
    const labels = dates.map(formatLabel);
    const datasets = {
      security_morning: [] as (number | null)[],
      security_evening: [] as (number | null)[],
      security_total: [] as (number | null)[],
      parking_car: [] as (number | null)[],
      parking_moto: [] as (number | null)[],
      cctv_online: [] as (number | null)[],
      hh_pass_rate: [] as (number | null)[],
      wt_pass_rate: [] as (number | null)[],
    };

    for (const date of dates) {
      const sec = securityMap[date];
      const morning = sec ? (isYearRange ? Math.round(sec.morning / sec.count) : sec.morning) : null;
      const evening = sec ? (isYearRange ? Math.round(sec.evening / sec.count) : sec.evening) : null;
      datasets.security_morning.push(morning);
      datasets.security_evening.push(evening);
      datasets.security_total.push(
        morning !== null || evening !== null
          ? (morning ?? 0) + (evening ?? 0)
          : null
      );

      const park = parkingMap[date];
      datasets.parking_car.push(
        park ? (isYearRange ? Math.round(park.car / park.count) : park.car) : null
      );
      datasets.parking_moto.push(
        park ? (isYearRange ? Math.round(park.moto / park.count) : park.moto) : null
      );

      const cctv = cctvMap[date];
      datasets.cctv_online.push(
        cctv && cctv.count > 0
          ? Math.round((cctv.totalPct / cctv.count) * 10) / 10
          : currentCameraPct > 0 ? Math.round(currentCameraPct * 10) / 10 : null
      );

      const hh = hhMap[date];
      datasets.hh_pass_rate.push(
        hh && hh.total > 0
          ? Math.round((hh.pass / hh.total) * 1000) / 10
          : 100
      );

      const wt = wtMap[date];
      datasets.wt_pass_rate.push(
        wt && wt.total > 0
          ? Math.round((wt.pass / wt.total) * 1000) / 10
          : 100
      );
    }

    return { labels, datasets };
  }
}
