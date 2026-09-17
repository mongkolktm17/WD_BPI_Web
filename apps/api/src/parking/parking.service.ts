import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParkingDto } from './dto/create-parking.dto';
import { CreateParkingBatchDto } from './dto/create-parking-batch.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';

@Injectable()
export class ParkingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { date?: string; status?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.date) {
      where.recordDate = new Date(query.date);
    }
    if (query?.status) {
      where.status = query.status;
    }
    const newParking = await this.prisma.carParking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });

    const legacyReports = await this.prisma.carParkingReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });

    const legacyMapped = legacyReports.map((r) => ({
      id: r.id,
      recordDate: r.inspectionDate,
      slotNo: r.parkingLot || ' Legacy Report',
      carLicense: r.licensePlates || '-',
      driverName: `ตรวจโดย: ${r.inspectorName}`,
      timeIn: null,
      timeOut: null,
      status: r.spareTireStatus === 'ครบถ้วน' ? 'parked' : 'flagged',
      createdAt: r.createdAt,
      inspectorName: r.inspectorName,
      inspectorCode: r.inspectorCode,
      shift: r.shift,
      parkingLot: r.parkingLot,
      totalCars: r.totalCars,
      spareTireStatus: r.spareTireStatus,
      licensePlates: r.licensePlates,
      motorcycleParkingLot: r.motorcycleParkingLot,
      motorcycleCount1: r.motorcycleCount1,
      motorcycleCount2: r.motorcycleCount2,
      motorcycleCount3: r.motorcycleCount3,
      _legacy: true,
    }));

    return [...newParking, ...legacyMapped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, query?.limit || 200);
  }

  async findOne(id: number) {
    const parking = await this.prisma.carParking.findUnique({ where: { id } });
    if (parking) return parking;

    const legacy = await this.prisma.carParkingReport.findUnique({ where: { id } });
    if (legacy) {
      return {
        id: legacy.id,
        recordDate: legacy.inspectionDate,
        slotNo: legacy.parkingLot || 'Legacy Report',
        carLicense: legacy.licensePlates || '-',
        driverName: `ตรวจโดย: ${legacy.inspectorName}`,
        timeIn: null,
        timeOut: null,
        status: legacy.spareTireStatus === 'ครบถ้วน' ? 'parked' : 'flagged',
        createdAt: legacy.createdAt,
        inspectorName: legacy.inspectorName,
        inspectorCode: legacy.inspectorCode,
        shift: legacy.shift,
        parkingLot: legacy.parkingLot,
        totalCars: legacy.totalCars,
        spareTireStatus: legacy.spareTireStatus,
        licensePlates: legacy.licensePlates,
        motorcycleParkingLot: legacy.motorcycleParkingLot,
        motorcycleCount1: legacy.motorcycleCount1,
        motorcycleCount2: legacy.motorcycleCount2,
        motorcycleCount3: legacy.motorcycleCount3,
        _legacy: true,
      };
    }

    throw new NotFoundException('ไม่พบข้อมูลที่จอดรถ');
  }

  async create(dto: CreateParkingDto) {
    return this.prisma.carParking.create({
      data: {
        recordDate: new Date(dto.recordDate),
        slotNo: dto.slotNo,
        carLicense: dto.carLicense,
        driverName: dto.driverName,
        timeIn: dto.timeIn ? new Date(dto.timeIn) : null,
        status: dto.status ?? 'parked',
        lotCounts: dto.lotCounts ?? undefined,
        totalCars: dto.totalCars ?? 0,
        inspectorCode: dto.inspectorCode ?? undefined,
        inspectorName: dto.inspectorName ?? undefined,
        shift: dto.shift ?? undefined,
        parkingLot: dto.parkingLot ?? undefined,
        spareTireStatus: dto.spareTireStatus ?? undefined,
        licensePlates: dto.licensePlates ?? undefined,
        motorcycleParkingLot: dto.motorcycleParkingLot ?? undefined,
        motorcycleCount1: dto.motorcycleCount1 ?? 0,
        motorcycleCount2: dto.motorcycleCount2 ?? 0,
        motorcycleCount3: dto.motorcycleCount3 ?? 0,
      },
    });
  }

  async createBatch(dto: CreateParkingBatchDto) {
    const carLotCounts = dto.carLotCounts || {};
    const motoLotCounts = dto.motorcycleLotCounts || {};
    const vehicles = dto.vehicles || [];

    // Normalize lotCounts for storage
    const lotCounts: Record<string, any> = {};
    Object.entries(carLotCounts).forEach(([lot, count]) => {
      lotCounts[lot] = { vehicleType: 'car', vehicleCount: String(count) };
    });
    Object.entries(motoLotCounts).forEach(([lot, count]) => {
      lotCounts[lot] = { vehicleType: 'moto', vehicleCount: String(count) };
    });
    // Merge legacy lotCounts if provided
    if (dto.lotCounts) {
      Object.assign(lotCounts, dto.lotCounts);
    }

    const totalCars = Object.values(carLotCounts).reduce((s, v) => s + (Number(v) || 0), 0);
    const licensePlates = vehicles.length > 0
      ? vehicles.map((v) => v.plateNumber).join(', ')
      : dto.licensePlates || undefined;

    const parkingLotNames = Object.keys(carLotCounts).filter((k) => carLotCounts[k] > 0).join(', ') || dto.parkingLot || undefined;
    const motoLotNames = Object.keys(motoLotCounts).filter((k) => motoLotCounts[k] > 0).join(', ') || dto.motorcycleParkingLot || undefined;

    // Derive motorcycleCount fields from motoLotCounts order L1,L2,L3/1 or fallback
    const motoKeys = Object.keys(motoLotCounts);
    const mc1 = motoKeys.length >= 1 ? Number(motoLotCounts[motoKeys[0]] || 0) : dto.motorcycleCount1 ?? 0;
    const mc2 = motoKeys.length >= 2 ? Number(motoLotCounts[motoKeys[1]] || 0) : dto.motorcycleCount2 ?? 0;
    const mc3 = motoKeys.length >= 3 ? Number(motoLotCounts[motoKeys[2]] || 0) : dto.motorcycleCount3 ?? 0;

    // Single transaction: create CarParking (new) + CarParkingReport (legacy compat) + ParkingLotCounts (only once)
    return this.prisma.$transaction(async (tx) => {
      const carParking = await tx.carParking.create({
        data: {
          recordDate: new Date(dto.recordDate),
          slotNo: `${dto.shift?.includes('เช้า') ? 'AM' : 'PM'}-INSPECTION`,
          carLicense: vehicles.length > 0 ? vehicles[0].plateNumber : (licensePlates || '-'),
          driverName: dto.inspectorName ? `ตรวจโดย: ${dto.inspectorName}` : undefined,
          status: dto.spareTireStatus === 'ไม่ครบถ้วน' ? 'flagged' : 'parked',
          lotCounts: Object.keys(lotCounts).length > 0 ? lotCounts : undefined,
          totalCars: totalCars || 0,
          inspectorCode: dto.inspectorCode,
          inspectorName: dto.inspectorName,
          shift: dto.shift,
          parkingLot: parkingLotNames,
          spareTireStatus: dto.spareTireStatus,
          licensePlates,
          motorcycleParkingLot: motoLotNames,
          motorcycleCount1: mc1,
          motorcycleCount2: mc2,
          motorcycleCount3: mc3,
        },
      });

      // Also create legacy report for backward compat
      const legacyReport = await tx.carParkingReport.create({
        data: {
          inspectionDate: new Date(dto.recordDate),
          inspectorCode: dto.inspectorCode || 'unknown',
          inspectorName: dto.inspectorName || 'unknown',
          shift: dto.shift || 'ไม่ระบุ',
          parkingLot: parkingLotNames || 'ไม่ระบุ',
          totalCars: totalCars || 0,
          spareTireStatus: dto.spareTireStatus || 'ครบถ้วน',
          licensePlates: licensePlates || null,
          motorcycleParkingLot: motoLotNames || null,
          motorcycleCount1: mc1,
          motorcycleCount2: mc2,
          motorcycleCount3: mc3,
        },
      });

      // Create ParkingLotCounts only once per lot (critical fix for duplication)
      const lotCountRows: any[] = [];
      Object.entries(carLotCounts).forEach(([lot, count]) => {
        if (Number(count) > 0) lotCountRows.push({ reportId: legacyReport.id, lotName: lot, vehicleType: 'car', vehicleCount: Number(count) });
      });
      Object.entries(motoLotCounts).forEach(([lot, count]) => {
        if (Number(count) > 0) lotCountRows.push({ reportId: legacyReport.id, lotName: lot, vehicleType: 'moto', vehicleCount: Number(count) });
      });
      if (lotCountRows.length > 0) {
        await tx.parkingLotCount.createMany({ data: lotCountRows });
      }

      // Store vehicles as separate CarParking flagged entries linked via licensePlates? For V1 we store them as single joined record;
      // If vehicles contain multiple plates with details, create additional CarParking entries without duplicating lotCounts
      if (vehicles.length > 1) {
        for (let i = 1; i < vehicles.length; i++) {
          const v = vehicles[i];
          await tx.carParking.create({
            data: {
              recordDate: new Date(dto.recordDate),
              slotNo: `VEHICLE-${i + 1}`,
              carLicense: v.plateNumber,
              driverName: `ตรวจโดย: ${dto.inspectorName} (${v.reason || ''})`.trim(),
              status: 'flagged',
              lotCounts: {}, // empty to avoid duplication
              totalCars: 0,
              inspectorCode: dto.inspectorCode,
              inspectorName: dto.inspectorName,
              shift: dto.shift,
              parkingLot: v.lot || undefined,
              spareTireStatus: v.spareTireStatus || dto.spareTireStatus,
              licensePlates: v.plateNumber,
              motorcycleParkingLot: undefined,
              motorcycleCount1: 0,
              motorcycleCount2: 0,
              motorcycleCount3: 0,
            },
          });
        }
      }

      return { carParking, legacyReport, vehiclesCount: vehicles.length, lotCountsCreated: lotCountRows.length };
    });
  }

  async getHistory(limit = 20, offset = 0) {
    try {
      const where: any = { isDeleted: false };
      // Fetch both new and legacy, merge and paginate like findAll but with offset support
      const [newItems, legacyReports] = await Promise.all([
        this.prisma.carParking.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit + offset,
        }),
        this.prisma.carParkingReport.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit + offset,
        }),
      ]);

      const legacyReportIds = legacyReports.map((r) => r.id);
      const lotCountRecords = legacyReportIds.length > 0
        ? await this.prisma.parkingLotCount.findMany({
            where: { reportId: { in: legacyReportIds } },
          })
        : [];

      const lotCountsByReportId: Record<number, Record<string, any>> = {};
      lotCountRecords.forEach((lc) => {
        if (!lotCountsByReportId[lc.reportId]) lotCountsByReportId[lc.reportId] = {};
        lotCountsByReportId[lc.reportId][lc.lotName] = {
          vehicleType: lc.vehicleType,
          vehicleCount: lc.vehicleCount,
        };
      });

      const legacyMapped = legacyReports.map((r) => {
        const counts = lotCountsByReportId[r.id] || {};
        return {
          id: r.id,
          recordDate: r.inspectionDate,
          slotNo: r.parkingLot || 'Legacy Report',
          carLicense: r.licensePlates || '-',
          driverName: `ตรวจโดย: ${r.inspectorName}`,
          timeIn: null,
          timeOut: null,
          status: r.spareTireStatus === 'ครบถ้วน' ? 'parked' : 'flagged',
          createdAt: r.createdAt,
          inspectorName: r.inspectorName,
          inspectorCode: r.inspectorCode,
          shift: r.shift,
          parkingLot: r.parkingLot,
          totalCars: r.totalCars,
          spareTireStatus: r.spareTireStatus,
          licensePlates: r.licensePlates,
          motorcycleParkingLot: r.motorcycleParkingLot,
          motorcycleCount1: r.motorcycleCount1,
          motorcycleCount2: r.motorcycleCount2,
          motorcycleCount3: r.motorcycleCount3,
          lotCounts: Object.keys(counts).length > 0 ? counts : undefined,
          _legacy: true,
        };
      });

      const merged = [...newItems, ...legacyMapped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = merged.length;
      const data = merged.slice(offset, offset + limit);
      return { data, total, limit, offset };
    } catch {
      // Fallback raw query if isDeleted column missing or other error
      const raw = await this.prisma.$queryRawUnsafe<any[]>(`SELECT id, record_date as "recordDate", slot_no as "slotNo", car_license as "carLicense", driver_name as "driverName", status, lot_counts as "lotCounts", total_cars as "totalCars", inspector_code as "inspectorCode", inspector_name as "inspectorName", shift, parking_lot as "parkingLot", spare_tire_status as "spareTireStatus", license_plates as "licensePlates", motorcycle_parking_lot as "motorcycleParkingLot", motorcycle_count_1 as "motorcycleCount1", motorcycle_count_2 as "motorcycleCount2", motorcycle_count_3 as "motorcycleCount3", created_at as "createdAt" FROM car_parkings ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
      return { data: raw, total: raw.length, limit, offset };
    }
  }

  async update(id: number, dto: UpdateParkingDto) {
    await this.findOne(id);
    return this.prisma.carParking.update({
      where: { id },
      data: {
        ...(dto.recordDate && { recordDate: new Date(dto.recordDate) }),
        ...(dto.slotNo && { slotNo: dto.slotNo }),
        ...(dto.carLicense && { carLicense: dto.carLicense }),
        ...(dto.driverName !== undefined && { driverName: dto.driverName }),
        ...(dto.timeIn && { timeIn: new Date(dto.timeIn) }),
        ...(dto.timeOut && { timeOut: new Date(dto.timeOut) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.inspectorCode !== undefined && { inspectorCode: dto.inspectorCode }),
        ...(dto.inspectorName !== undefined && { inspectorName: dto.inspectorName }),
        ...(dto.shift !== undefined && { shift: dto.shift }),
        ...(dto.spareTireStatus !== undefined && { spareTireStatus: dto.spareTireStatus }),
        ...(dto.licensePlates !== undefined && { licensePlates: dto.licensePlates }),
        ...(dto.totalCars !== undefined && { totalCars: dto.totalCars }),
        ...(dto.motorcycleCount1 !== undefined && { motorcycleCount1: dto.motorcycleCount1 }),
        ...(dto.motorcycleCount2 !== undefined && { motorcycleCount2: dto.motorcycleCount2 }),
        ...(dto.motorcycleCount3 !== undefined && { motorcycleCount3: dto.motorcycleCount3 }),
        ...(dto.lotCounts !== undefined && { lotCounts: dto.lotCounts as any }),
      },
    });
  }

  async remove(id: number, deletedBy?: string) {
    const existingNew = await this.prisma.carParking.findUnique({ where: { id } });
    if (existingNew) {
      await this.prisma.carParking.update({
        where: { id },
        data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() },
      });
      return { message: 'ลบข้อมูลที่จอดรถเรียบร้อยแล้ว' };
    }

    const existingLegacy = await this.prisma.carParkingReport.findUnique({ where: { id } });
    if (existingLegacy) {
      await this.prisma.parkingLotCount.deleteMany({ where: { reportId: id } });
      await this.prisma.carParkingReport.delete({ where: { id } });
      return { message: 'ลบข้อมูลรายงานที่จอดรถเรียบร้อยแล้ว' };
    }

    throw new NotFoundException('ไม่พบข้อมูลที่จอดรถ');
  }

  async getStatusSummary() {
    const [total, parked, vacated] = await Promise.all([
      this.prisma.carParking.count({ where: { isDeleted: false } }),
      this.prisma.carParking.count({ where: { status: 'parked', isDeleted: false } }),
      this.prisma.carParking.count({ where: { status: 'vacated', isDeleted: false } }),
    ]);

    return {
      totalSlots: total,
      parked,
      vacated,
      occupancy: total > 0 ? ((parked / total) * 100).toFixed(2) : '0.00',
    };
  }
}
