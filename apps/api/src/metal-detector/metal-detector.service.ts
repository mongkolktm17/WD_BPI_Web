import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHandheldDto } from './dto/create-handheld.dto';
import { UpdateHandheldDto } from './dto/update-handheld.dto';
import { CreateHandheldCheckDto } from './dto/create-handheld-check.dto';
import { CreateWalkthroughDto } from './dto/create-walkthrough.dto';
import { UpdateWalkthroughDto } from './dto/update-walkthrough.dto';
import { CreateWalkthroughCheckDto } from './dto/create-walkthrough-check.dto';
import { CreateMetalDetectorDto } from './dto/create-metal-detector.dto';
import { UpdateMetalDetectorDto } from './dto/update-metal-detector.dto';

@Injectable()
export class MetalDetectorService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Handheld Equipment ───────────────────────────────────────

  async findAllHandheld() {
    return this.prisma.handheldEquipment.findMany({
      orderBy: { deviceCode: 'asc' },
    });
  }

  async findOneHandheld(id: number) {
    const item = await this.prisma.handheldEquipment.findUnique({
      where: { id },
      include: { checks: { orderBy: { checkDate: 'desc' }, take: 10 } },
    });
    if (!item) throw new NotFoundException('ไม่พบข้อมูลอุปกรณ์ handheld');
    return item;
  }

  async createHandheld(dto: CreateHandheldDto) {
    const existing = await this.prisma.handheldEquipment.findFirst({
      where: { deviceCode: dto.deviceCode },
    });
    if (existing) throw new BadRequestException('มีรหัสอุปกรณ์นี้อยู่แล้ว');
    return this.prisma.handheldEquipment.create({
      data: {
        deviceCode: dto.deviceCode,
        deviceName: dto.deviceName,
        status: dto.status ?? 'normal',
        location: dto.location,
      },
    });
  }

  async updateHandheld(id: number, dto: UpdateHandheldDto) {
    await this.findOneHandheld(id);
    return this.prisma.handheldEquipment.update({
      where: { id },
      data: dto,
    });
  }

  async removeHandheld(id: number) {
    await this.findOneHandheld(id);
    await this.prisma.handheldEquipment.delete({ where: { id } });
    return { message: 'ลบข้อมูลอุปกรณ์ handheld เรียบร้อยแล้ว' };
  }

  // ─── Handheld Checks ──────────────────────────────────────────

  async findAllHandheldChecks(query?: { equipmentId?: string; date?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.equipmentId) where.equipmentId = parseInt(query.equipmentId);
    if (query?.date) where.checkDate = new Date(query.date);
    const newChecks = await this.prisma.handheldCheck.findMany({
      where,
      include: { equipment: true },
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });

    const legacyChecks = await this.prisma.handHeldCheckLegacy.findMany({
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });

    const legacyMapped = legacyChecks.map((c) => ({
      id: c.id,
      equipmentId: null,
      checkDate: c.inspectionDate,
      status: [c.batteryStatus, c.ledStatus, c.detectionTestStatus, c.alarmStatus].every((v) => v === 'พร้อมใช้งาน' || v === 'ผ่านการทดสอบ') ? 'normal' : 'abnormal',
      remark: c.remarks || `${c.batteryStatus}, ${c.ledStatus}, ${c.detectionTestStatus}, ${c.alarmStatus}`,
      inspector: c.inspectorName,
      createdAt: c.createdAt,
      equipment: null,
      _legacy: true,
      legacy: {
        inspectionDate: c.inspectionDate,
        building: c.building,
        guardPost: c.guardPost,
        inspectorCode: c.inspectorCode,
        inspectorName: c.inspectorName,
        shift: c.shift,
        batteryStatus: c.batteryStatus,
        ledStatus: c.ledStatus,
        detectionTestStatus: c.detectionTestStatus,
        alarmStatus: c.alarmStatus,
        remarks: c.remarks,
      },
    }));

    return [...newChecks, ...legacyMapped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, query?.limit || 200);
  }

  async createHandheldCheck(dto: CreateHandheldCheckDto) {
    const equipment = await this.prisma.handheldEquipment.findUnique({ where: { id: dto.equipmentId } });
    if (!equipment) throw new NotFoundException('ไม่พบข้อมูลอุปกรณ์');
    return this.prisma.handheldCheck.create({
      data: {
        equipmentId: dto.equipmentId,
        checkDate: new Date(dto.checkDate),
        status: dto.status,
        remark: dto.remark,
        inspector: dto.inspector,
      },
    });
  }

  async findOneHandheldCheck(id: number) {
    const check = await this.prisma.handHeldCheckLegacy.findUnique({ where: { id } });
    if (!check) {
      const newCheck = await this.prisma.handheldCheck.findUnique({ where: { id } });
      if (!newCheck) throw new NotFoundException('ไม่พบข้อมูล handheld check');
      return newCheck;
    }
    return {
      id: check.id,
      inspectionDate: check.inspectionDate,
      building: check.building,
      guardPost: check.guardPost,
      inspectorCode: check.inspectorCode,
      inspectorName: check.inspectorName,
      shift: check.shift,
      batteryStatus: check.batteryStatus,
      ledStatus: check.ledStatus,
      detectionTestStatus: check.detectionTestStatus,
      alarmStatus: check.alarmStatus,
      remarks: check.remarks,
      createdAt: check.createdAt,
      _legacy: true,
    };
  }

  async findOneWalkthroughCheck(id: number) {
    const check = await this.prisma.walkthroughCheck.findUnique({ where: { id } });
    if (check) return check;

    const legacy = await this.prisma.metalDetectorCheckLegacy.findUnique({ where: { id } });
    if (legacy) {
      return {
        id: legacy.id,
        checkDate: legacy.inspectionDate,
        status: 'normal',
        remark: `อาคาร: ${legacy.building}, จุด: ${legacy.guardPost}, ยี่ห้อ: ${legacy.scannerBrand}`,
        inspector: legacy.employeeName,
        createdAt: legacy.createdAt,
        _legacy: true,
        legacy: {
          inspectionDate: legacy.inspectionDate,
          shift: legacy.shift,
          employeeId: legacy.employeeId,
          employeeName: legacy.employeeName,
          building: legacy.building,
          guardPost: legacy.guardPost,
          scannerBrand: legacy.scannerBrand,
          zone1Status: legacy.zone1Status,
          zone2Status: legacy.zone2Status,
          zone3Status: legacy.zone3Status,
          zone4Status: legacy.zone4Status,
          zone5Status: legacy.zone5Status,
          zone6Status: legacy.zone6Status,
        },
      };
    }

    throw new NotFoundException('ไม่พบข้อมูล walkthrough check');
  }

  async getHandheldStatus() {
    const checks = await this.prisma.handheldCheck.findMany({
      where: { isDeleted: false },
      include: { equipment: true },
      orderBy: { checkDate: 'desc' },
    });

    const latestChecks = new Map<number, any>();
    for (const check of checks) {
      if (!latestChecks.has(check.equipmentId)) {
        latestChecks.set(check.equipmentId, check);
      }
    }

    const statusSummary = {
      total: latestChecks.size,
      pass: 0,
      fail: 0,
      battery: { pass: 0, fail: 0 },
      led: { pass: 0, fail: 0 },
      detection: { pass: 0, fail: 0 },
      audio: { pass: 0, fail: 0 },
    };

    for (const check of latestChecks.values()) {
      if (check.status === 'pass' || check.status === 'normal') {
        statusSummary.pass++;
      } else {
        statusSummary.fail++;
      }
    }

    return statusSummary;
  }

  // ─── Walkthrough Detectors ────────────────────────────────────

  async findAllWalkthrough() {
    await this.ensureDefaultDetectors();
    return this.prisma.walkthroughDetector.findMany({
      orderBy: { detectorCode: 'asc' },
    });
  }

  async findOneWalkthrough(id: number) {
    const item = await this.prisma.walkthroughDetector.findUnique({
      where: { id },
      include: { checks: { orderBy: { checkDate: 'desc' }, take: 10 } },
    });
    if (!item) throw new NotFoundException('ไม่พบข้อมูลเครื่องตรวจ walkthrough');
    return item;
  }

  async createWalkthrough(dto: CreateWalkthroughDto) {
    const existing = await this.prisma.walkthroughDetector.findFirst({
      where: { detectorCode: dto.detectorCode },
    });
    if (existing) throw new BadRequestException('มีรหัสเครื่องตรวจนี้อยู่แล้ว');
    return this.prisma.walkthroughDetector.create({
      data: {
        detectorCode: dto.detectorCode,
        location: dto.location,
        status: dto.status ?? 'normal',
      },
    });
  }

  async updateWalkthrough(id: number, dto: UpdateWalkthroughDto) {
    await this.findOneWalkthrough(id);
    return this.prisma.walkthroughDetector.update({
      where: { id },
      data: dto,
    });
  }

  async removeWalkthrough(id: number) {
    await this.findOneWalkthrough(id);
    await this.prisma.walkthroughDetector.delete({ where: { id } });
    return { message: 'ลบข้อมูลเครื่องตรวจ walkthrough เรียบร้อยแล้ว' };
  }

  // ─── Walkthrough Checks ───────────────────────────────────────

  async findAllWalkthroughChecks(query?: { detectorId?: string; date?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.detectorId) where.detectorId = parseInt(query.detectorId);
    if (query?.date) where.checkDate = new Date(query.date);
    const newChecks = await this.prisma.walkthroughCheck.findMany({
      where,
      include: { detector: true },
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });

    const legacyChecks = await this.prisma.metalDetectorCheckLegacy.findMany({
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });

    const legacyMapped = legacyChecks.map((c) => ({
      id: c.id,
      detectorId: null,
      checkDate: c.inspectionDate,
      status: [c.zone1Status, c.zone2Status, c.zone3Status, c.zone4Status, c.zone5Status, c.zone6Status].every((v) => {
        if (!v) return true;
        const lower = v.trim().toLowerCase();
        return lower === 'พร้อมใช้งาน' || lower === 'pass' || lower === 'normal' || lower === 'ผ่าน' || lower === 'ปกติ' || lower === 'ผ่านการทดสอบ';
      }) ? 'normal' : 'abnormal',
      remark: `${c.building} ${c.guardPost} | ${c.scannerBrand} | Z1:${c.zone1Status}, Z2:${c.zone2Status}, Z3:${c.zone3Status}, Z4:${c.zone4Status}, Z5:${c.zone5Status}, Z6:${c.zone6Status}`,
      inspector: c.employeeName,
      createdAt: c.createdAt,
      detector: null,
      _legacy: true,
      legacy: {
        inspectionDate: c.inspectionDate,
        shift: c.shift,
        employeeId: c.employeeId,
        employeeName: c.employeeName,
        building: c.building,
        guardPost: c.guardPost,
        scannerBrand: c.scannerBrand,
        zone1Status: c.zone1Status,
        zone2Status: c.zone2Status,
        zone3Status: c.zone3Status,
        zone4Status: c.zone4Status,
        zone5Status: c.zone5Status,
        zone6Status: c.zone6Status,
      },
    }));

    return [...newChecks, ...legacyMapped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, query?.limit || 200);
  }

  async createWalkthroughCheck(dto: CreateWalkthroughCheckDto & { detectorCode?: string; location?: string }) {
    let detectorId = dto.detectorId;
    let detector = detectorId ? await this.prisma.walkthroughDetector.findUnique({ where: { id: detectorId } }) : null;
    if (!detector) {
      // Fallback: auto-create/find by detectorCode or location or remark
      const code = (dto as any).detectorCode || (dto.remark?.match(/\[([^\]]+)\]/)?.[1]) || dto.location || 'AUTO-01';
      const loc = (dto as any).location || dto.remark?.split('|')[0]?.trim() || 'Auto Location';
      detector = await this.prisma.walkthroughDetector.findFirst({ where: { detectorCode: code } });
      if (!detector) {
        detector = await this.prisma.walkthroughDetector.findFirst({ where: { location: loc } });
      }
      if (!detector) {
        detector = await this.prisma.walkthroughDetector.create({
          data: { detectorCode: code, location: loc, status: 'normal' },
        });
      }
      detectorId = detector.id;
    }
    return this.prisma.walkthroughCheck.create({
      data: {
        detectorId: detectorId!,
        checkDate: new Date(dto.checkDate),
        status: dto.status,
        remark: dto.remark,
        inspector: dto.inspector,
      },
    });
  }

  // Seed default detectors if empty
  async ensureDefaultDetectors() {
    const count = await this.prisma.walkthroughDetector.count();
    if (count === 0) {
      const defaults = [
        { detectorCode: 'WT-B2-01', location: 'B2 Main Entrance' },
        { detectorCode: 'WT-B2-02', location: 'B2 Side Entrance' },
        { detectorCode: 'WT-B3-01', location: 'B3 Main Entrance' },
        { detectorCode: 'WT-B4-01', location: 'B4 Main Entrance' },
      ];
      for (const d of defaults) {
        await this.prisma.walkthroughDetector.create({ data: { ...d, status: 'normal' } });
      }
    }
  }

  async getWalkthroughStatus() {
    const checks = await this.prisma.walkthroughCheck.findMany({
      where: { isDeleted: false },
      include: { detector: true },
      orderBy: { checkDate: 'desc' },
    });

    const latestChecks = new Map<number, any>();
    for (const check of checks) {
      if (!latestChecks.has(check.detectorId)) {
        latestChecks.set(check.detectorId, check);
      }
    }

    const statusByZone: Record<string, { pass: number; fail: number; other: number }> = {};
    for (const check of latestChecks.values()) {
      const zone = check.detector?.location || 'unknown';
      if (!statusByZone[zone]) {
        statusByZone[zone] = { pass: 0, fail: 0, other: 0 };
      }
      if (check.status === 'pass' || check.status === 'normal') {
        statusByZone[zone].pass++;
      } else if (check.status === 'fail') {
        statusByZone[zone].fail++;
      } else {
        statusByZone[zone].other++;
      }
    }

    return statusByZone;
  }

  // ─── Metal Detectors ──────────────────────────────────────────

  async findAll() {
    return this.prisma.metalDetector.findMany({
      orderBy: { deviceCode: 'asc' },
    });
  }

  async findOne(id: number) {
    const detector = await this.prisma.metalDetector.findUnique({ where: { id } });
    if (!detector) throw new NotFoundException('ไม่พบข้อมูลเครื่องตรวจโลหะ');
    return detector;
  }

  async create(dto: CreateMetalDetectorDto) {
    const existing = await this.prisma.metalDetector.findFirst({
      where: { deviceCode: dto.deviceCode },
    });
    if (existing) throw new BadRequestException('มีรหัสอุปกรณ์นี้อยู่แล้ว');
    return this.prisma.metalDetector.create({
      data: {
        deviceCode: dto.deviceCode,
        location: dto.location,
        status: dto.status ?? 'normal',
        lastCheck: dto.lastCheck ? new Date(dto.lastCheck) : null,
      },
    });
  }

  async update(id: number, dto: UpdateMetalDetectorDto) {
    await this.findOne(id);
    return this.prisma.metalDetector.update({
      where: { id },
      data: {
        ...(dto.deviceCode && { deviceCode: dto.deviceCode }),
        ...(dto.location && { location: dto.location }),
        ...(dto.status && { status: dto.status }),
        ...(dto.lastCheck && { lastCheck: new Date(dto.lastCheck) }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.metalDetector.delete({ where: { id } });
    return { message: 'ลบข้อมูลเครื่องตรวจโลหะเรียบร้อยแล้ว' };
  }

  // ─── Update Handheld Check ──────────────────────────────────
  async updateHandheldCheck(id: number, data: any) {
    const existing = await this.prisma.handheldCheck.findUnique({ where: { id } });
    if (!existing) {
      const legacy = await this.prisma.handHeldCheckLegacy.findUnique({ where: { id } });
      if (legacy) {
        return this.prisma.handHeldCheckLegacy.update({
          where: { id },
          data: {
            inspectionDate: data.checkDate ? new Date(data.checkDate) : undefined,
            batteryStatus: data.status || undefined,
          },
        });
      }
      throw new NotFoundException('ไม่พบข้อมูลการตรวจ handheld');
    }
    return this.prisma.handheldCheck.update({
      where: { id },
      data: {
        checkDate: data.checkDate ? new Date(data.checkDate) : undefined,
        status: data.status || undefined,
        remark: data.remark || undefined,
      },
    });
  }

  // ─── Update Walkthrough Check ───────────────────────────────
  async updateWalkthroughCheck(id: number, data: any) {
    const existing = await this.prisma.walkthroughCheck.findUnique({ where: { id } });
    if (!existing) {
      const legacy = await this.prisma.metalDetectorCheckLegacy.findUnique({ where: { id } });
      if (legacy) {
        return this.prisma.metalDetectorCheckLegacy.update({
          where: { id },
          data: {
            inspectionDate: data.checkDate ? new Date(data.checkDate) : undefined,
          },
        });
      }
      throw new NotFoundException('ไม่พบข้อมูลการตรวจ walkthrough');
    }
    return this.prisma.walkthroughCheck.update({
      where: { id },
      data: {
        checkDate: data.checkDate ? new Date(data.checkDate) : undefined,
        status: data.status || undefined,
        remark: data.remark || undefined,
      },
    });
  }

  // ─── Soft Delete Handheld Check ─────────────────────────────
  async removeHandheldCheck(id: number, deletedBy?: string) {
    const check = await this.prisma.handheldCheck.findUnique({ where: { id } });
    if (check) {
      return this.prisma.handheldCheck.update({ where: { id }, data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() } });
    }
    const legacy = await this.prisma.handHeldCheckLegacy.findUnique({ where: { id } });
    if (legacy) {
      return this.prisma.handHeldCheckLegacy.delete({ where: { id } });
    }
    throw new NotFoundException('ไม่พบข้อมูลการตรวจ handheld');
  }

  // ─── Soft Delete Walkthrough Check ──────────────────────────
  async removeWalkthroughCheck(id: number, deletedBy?: string) {
    const check = await this.prisma.walkthroughCheck.findUnique({ where: { id } });
    if (check) {
      return this.prisma.walkthroughCheck.update({ where: { id }, data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() } });
    }
    const legacy = await this.prisma.metalDetectorCheckLegacy.findUnique({ where: { id } });
    if (legacy) {
      return this.prisma.metalDetectorCheckLegacy.delete({ where: { id } });
    }
    throw new NotFoundException('ไม่พบข้อมูลการตรวจ walkthrough');
  }
}
