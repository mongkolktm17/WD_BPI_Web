import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCctvReportDto } from './dto/create-cctv-report.dto';
import { UpdateCctvReportDto } from './dto/update-cctv-report.dto';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { CreateCameraCheckDto } from './dto/create-camera-check.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { CreateNvrDeviceDto } from './dto/create-nvr-device.dto';
import { UpdateNvrDeviceDto } from './dto/update-nvr-device.dto';
import { CreateNvrRecordingDto } from './dto/create-nvr-recording.dto';
import { UpdateNvrRecordingDto } from './dto/update-nvr-recording.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CctvService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CCTV Configuration (Buildings, NVRs, Camera Names) ───────

  private readonly CCTV_DEVICES = [
    { building: 'B2', nvrName: 'NVR-1', area: 'Centen Canteen กลาง+Canteen B2L4', channels: 31, driveCapacity: '8TB (2ลูก),4TB (4ลูก)', totalCapacityTb: 36.387, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-2', area: 'Relialab lab room B2L3+ภายใน Lift', channels: 32, driveCapacity: '8TB (4ลูก),4TB (4ลูก)', totalCapacityTb: 43.664, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-3', area: 'แนวรั้วด้านนอกอาคาร 1-2-6', channels: 61, driveCapacity: '10TB (6ลูก),8TB (2ลูก)', totalCapacityTb: 69.129, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-4', area: 'ภายในห้องครัว+ลานจอดรถ Park 1,Park 2', channels: 64, driveCapacity: '10TB (8ลูก)', totalCapacityTb: 72.765, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-5', area: 'ภายในอาคาร 6 ชั้น 1-2-3 เพิ่มกล้อง 2 ตัว', channels: 38, driveCapacity: '10TB (3ลูก),8TB (5ลูก)', totalCapacityTb: 63.674, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-6', area: 'ภายในอาคาร 1 ชั้น 1', channels: 32, driveCapacity: '8TB (8ลูก)', totalCapacityTb: 58.219, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-7', area: 'ลานจอดรถ Park 1,Park 2', channels: 32, driveCapacity: '8TB (5ลูก),4TB (3ลูก)', totalCapacityTb: 47.303, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-8', area: 'แนว Locker อาคาร 1-2-6+ภายในอาคาร2 ชั้น 3', channels: 63, driveCapacity: '10TB (8ลูก)', totalCapacityTb: 72.765, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-9', area: 'Receiving อาคาร 2 + หน้า Lift อาคาร 2', channels: 32, driveCapacity: '8TB (4ลูก),4TB (3ลูก)', totalCapacityTb: 40.025, targetDays: 62 },
    { building: 'B2', nvrName: 'NVR-10', area: 'ภายในอาคาร 2 ชั้น 2', channels: 32, driveCapacity: '8TB (4ลูก),4TB (4ลูก)', totalCapacityTb: 43.664, targetDays: 62 },
    { building: 'B3', nvrName: 'NVR-1', area: 'ภายในอาคาร 3+แนวรั้ว', channels: 32, driveCapacity: '4TB(6 ลูก) 10TB(2 ลูก)', totalCapacityTb: 40.023, targetDays: 62 },
    { building: 'B3', nvrName: 'NVR-2', area: 'Park 4', channels: 46, driveCapacity: '8TB(3 ลูก) 10TB(5 ลูก)', totalCapacityTb: 67.310, targetDays: 62 },
    { building: 'B4', nvrName: 'NVR-1', area: 'Office ชั้น ลอย,ชั้นลอยจุดพักผ่อน', channels: 64, driveCapacity: '8 TB (3ลูก),10 TB (5ลูก)', totalCapacityTb: 67.310, targetDays: 62 },
    { building: 'B4', nvrName: 'NVR-2', area: 'Scrap park 3/1,จุดรวมพล+เต็นท์มาเลย์', channels: 32, driveCapacity: '4 TB (4ลูก),8 TB (4ลูก)', totalCapacityTb: 43.664, targetDays: 62 },
    { building: 'B4', nvrName: 'NVR-3', area: 'Transfer room+ด้านใน Lift ของอาคาร 4', channels: 62, driveCapacity: '8 TB (8ลูก)', totalCapacityTb: 58.219, targetDays: 62 },
    { building: 'B4', nvrName: 'NVR-4', area: 'แนวรั้วด้านนอกอาคาร 4+Receiving อาคาร 4', channels: 32, driveCapacity: '4 TB (3ลูก),8 TB (5ลูก)', totalCapacityTb: 47.303, targetDays: 62 },
    { building: 'B4', nvrName: 'NVR-5', area: 'Packing+แนวทางเดินเข้าอาคาร 4 ชั้น 1', channels: 62, driveCapacity: '8 TB (1ลูก),10 TB (7ลูก)', totalCapacityTb: 70.947, targetDays: 62 },
    { building: 'B4', nvrName: 'NVR-6', area: 'ห้อง IT DATA เพิ่มกล้อง 4 ตัว', channels: 29, driveCapacity: '4 TB (2ลูก),8 TB (6ลูก)', totalCapacityTb: 50.941, targetDays: 62 },
    { building: 'B9', nvrName: 'NVR-1', area: 'ทุกพื้นที่ของอาคาร 8 + แนวถนนทางเข้าซอย 2', channels: 41, driveCapacity: '8 TB (7ลูก) 4 TB (1ลูก)', totalCapacityTb: 54.580, targetDays: 62 },
  ];

  loadCameraNames(): Record<string, string> {
    const cameraNames: Record<string, string> = {};
    const baseCandidates = [
      path.join(process.cwd(), 'report_assets', 'CCTV'),
      path.join(process.cwd(), 'apps', 'web', 'public', 'report_assets', 'CCTV'),
      path.join('/app', 'report_assets', 'CCTV'),
    ];

    let baseDir = '';
    for (const cand of baseCandidates) {
      if (fs.existsSync(cand)) {
        baseDir = cand;
        break;
      }
    }

    if (!baseDir) return cameraNames;

    const csvFiles = [
      { bldg: 'B2', nvr: 'NVR-1', file: 'B2/B2_NVR1.csv' },
      { bldg: 'B2', nvr: 'NVR-2', file: 'B2/B2_NVR2.csv' },
      { bldg: 'B2', nvr: 'NVR-3', file: 'B2/B2_NVR3.csv' },
      { bldg: 'B2', nvr: 'NVR-4', file: 'B2/B2_NVR4.csv' },
      { bldg: 'B2', nvr: 'NVR-5', file: 'B2/B2_NVR5.csv' },
      { bldg: 'B2', nvr: 'NVR-6', file: 'B2/B2_NVR6.csv' },
      { bldg: 'B2', nvr: 'NVR-7', file: 'B2/B2_NVR7.csv' },
      { bldg: 'B2', nvr: 'NVR-8', file: 'B2/B2_NVR8.csv' },
      { bldg: 'B2', nvr: 'NVR-9', file: 'B2/B2_NVR9.csv' },
      { bldg: 'B2', nvr: 'NVR-10', file: 'B2/B2_NVR10.csv' },
      { bldg: 'B3', nvr: 'NVR-1', file: 'B3/B3_NVR1.csv' },
      { bldg: 'B3', nvr: 'NVR-2', file: 'B3/B3_NVR2.csv' },
      { bldg: 'B4', nvr: 'NVR-1', file: 'B4/B4_NVR1.csv' },
      { bldg: 'B4', nvr: 'NVR-2', file: 'B4/B4_NVR2.csv' },
      { bldg: 'B4', nvr: 'NVR-3', file: 'B4/B4_NVR3.csv' },
      { bldg: 'B4', nvr: 'NVR-4', file: 'B4/B4_NVR4.csv' },
      { bldg: 'B4', nvr: 'NVR-5', file: 'B4/B4_NVR5.csv' },
      { bldg: 'B4', nvr: 'NVR-6', file: 'B4/B4_NVR6.csv' },
      { bldg: 'B9', nvr: 'NVR-1', file: 'B9/B9_NVR1.csv' },
    ];

    for (const { bldg, nvr, file } of csvFiles) {
      const fullPath = path.join(baseDir, file);
      if (!fs.existsSync(fullPath)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (let i = 4; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length >= 3) {
            const ch = parseInt(parts[1], 10);
            const name = parts.slice(2).join(',').trim();
            if (ch > 0 && name) {
              const key = `${bldg}_${nvr}_${ch}`;
              cameraNames[key] = name;
            }
          }
        }
      } catch (err) {
        // silent fallback
      }
    }
    return cameraNames;
  }

  getCctvConfig() {
    const buildingConfigs: Record<string, any> = {
      B2: { name: 'B2', label: 'อาคาร B2', description: 'ศูนย์กลางโรงงานและการผลิตหลัก', nvrs: [] },
      B3: { name: 'B3', label: 'อาคาร B3', description: 'อาคารสำนักงานและสิ่งอำนวยความสะดวก', nvrs: [] },
      B4: { name: 'B4', label: 'อาคาร B4', description: 'อาคารผลิต ชิ้นส่วน และคลังสินค้า', nvrs: [] },
      B9: { name: 'B9', label: 'อาคาร B9', description: 'Bio Building และพื้นที่สนับสนุน', nvrs: [] },
    };

    this.CCTV_DEVICES.forEach((d, idx) => {
      if (buildingConfigs[d.building]) {
        buildingConfigs[d.building].nvrs.push({ id: idx + 1, ...d });
      }
    });

    const cameraNames = this.loadCameraNames();
    const allNvrs = this.CCTV_DEVICES.map((d) => {
      const num = d.nvrName.replace(/[^0-9]/g, '').replace(/^0+/, '');
      return {
        building: d.building,
        nvrName: d.nvrName,
        label: `${d.building}-N${num}`,
        channels: d.channels,
        area: d.area,
      };
    });

    return { buildingConfigs, allNvrs, cameraNames };
  }

  // ─── CCTV Reports ─────────────────────────────────────────────

  async findAllReports(query?: { dateFrom?: string; dateTo?: string }) {
    const where: any = { isDeleted: false };
    if (query?.dateFrom || query?.dateTo) {
      where.reportDate = {};
      if (query.dateFrom) where.reportDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.reportDate.lte = new Date(query.dateTo);
    }
    return this.prisma.cctvReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
    });
  }

  async findOneReport(id: number) {
    const report = await this.prisma.cctvReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('ไม่พบข้อมูลรายงาน CCTV');
    const details = await this.prisma.cctvReportDetail.findMany({ where: { reportId: id } });
    return { ...report, details };
  }

  async createReport(dto: any) {
    // Supports both legacy format and modern DTO format
    const building = dto.building || (dto.stats?.building) || 'B2';
    const reportDate = dto.reportDate ? new Date(dto.reportDate) : new Date();
    
    let totalNormal = dto.totalNormal ?? 0;
    let totalAbnormal = dto.totalAbnormal ?? 0;
    let nvrStatsList: any[] = [];

    if (dto.stats) {
      totalNormal = dto.stats.online ?? 0;
      totalAbnormal = dto.stats.offline ?? 0;
      if (dto.stats.nvrStats) {
        nvrStatsList = Object.entries(dto.stats.nvrStats).map(([nvrName, nvrData]: [string, any]) => ({
          nvrName,
          onlineChannels: nvrData.online_channels ?? nvrData.onlineChannels ?? 0,
          totalChannels: nvrData.total_channels ?? nvrData.totalChannels ?? 0,
          channelStatuses: dto.stats.fullChannelStatusByNVR?.[nvrName] || null,
        }));
      }
    } else if (Array.isArray(dto.details)) {
      nvrStatsList = dto.details;
      totalNormal = nvrStatsList.reduce((sum, d) => sum + (d.onlineChannels ?? d.online ?? 0), 0);
      const totalAll = nvrStatsList.reduce((sum, d) => sum + (d.totalChannels ?? d.total ?? 0), 0);
      totalAbnormal = totalAll - totalNormal;
    }

    const report = await this.prisma.cctvReport.create({
      data: {
        reportDate,
        totalNormal,
        totalAbnormal,
        reporterName: dto.reporterName || dto.username || 'System Admin',
        remark: dto.remark || `Building ${building}`,
      },
    });

    for (const nvrItem of nvrStatsList) {
      const nvrName = nvrItem.nvrName || nvrItem.nvr || 'Unknown';
      const online = nvrItem.onlineChannels ?? nvrItem.online ?? 0;
      const total = nvrItem.totalChannels ?? nvrItem.total ?? 0;
      const statuses = nvrItem.channelStatuses || nvrItem.channelStatusesJson;
      const jsonStr = typeof statuses === 'object' ? JSON.stringify(statuses) : (statuses || null);

      await this.prisma.cctvReportDetail.create({
        data: {
          reportId: report.id,
          nvrName,
          onlineChannels: online,
          totalChannels: total,
          channelStatusesJson: jsonStr,
        },
      });
    }

    return report;
  }

  async getReportMatrix(limit = 30) {
    const config = this.getCctvConfig();
    const reports = await this.prisma.cctvReport.findMany({
      where: { isDeleted: false },
      orderBy: { reportDate: 'desc' },
      take: limit,
    });

    const result = [];
    for (const r of reports) {
      const details = await this.prisma.cctvReportDetail.findMany({ where: { reportId: r.id } });
      const detailsMap: Record<string, any> = {};

      // Detect building from remark or matching NVR names
      let building = 'B2';
      if (r.remark && r.remark.includes('Building')) {
        const bMatch = r.remark.match(/Building\s+([A-Z0-9]+)/i);
        if (bMatch) building = bMatch[1].toUpperCase();
      } else {
        // Deduce building from details count & NVRs
        if (details.length === 10) building = 'B2';
        else if (details.length === 2) building = 'B3';
        else if (details.length === 6) building = 'B4';
        else if (details.length === 1) building = 'B9';
      }

      let totalChannels = 0;
      let onlineChannels = 0;

      for (const d of details) {
        let channelStatuses: Record<string, boolean> = {};
        if (d.channelStatusesJson) {
          try {
            channelStatuses = JSON.parse(d.channelStatusesJson);
          } catch {}
        }
        detailsMap[d.nvrName] = {
          online_channels: d.onlineChannels,
          total_channels: d.totalChannels,
          channel_statuses: channelStatuses,
        };
        totalChannels += d.totalChannels;
        onlineChannels += d.onlineChannels;
      }

      if (totalChannels === 0) {
        totalChannels = r.totalNormal + r.totalAbnormal;
        onlineChannels = r.totalNormal;
      }

      const onlinePercentage = totalChannels > 0 ? parseFloat(((onlineChannels / totalChannels) * 100).toFixed(2)) : 100;

      result.push({
        id: r.id,
        report_time: r.createdAt || r.reportDate,
        building,
        username: r.reporterName || 'System Admin',
        total_channels: totalChannels,
        online_channels: onlineChannels,
        offline_channels: totalChannels - onlineChannels,
        online_percentage: onlinePercentage,
        details: detailsMap,
      });
    }

    return {
      reports: result,
      allNvrs: config.allNvrs,
      buildingConfigs: config.buildingConfigs,
    };
  }

  async getLatestBuildingReport(building: string) {
    const config = this.getCctvConfig();
    const matrix = await this.getReportMatrix(50);
    const latest = matrix.reports.find((r) => r.building.toUpperCase() === building.toUpperCase());
    return {
      building,
      latestReport: latest || null,
      cameraNames: config.cameraNames,
      buildingConfig: config.buildingConfigs[building] || null,
    };
  }

  async updateReport(id: number, dto: UpdateCctvReportDto) {
    await this.findOneReport(id);
    return this.prisma.cctvReport.update({
      where: { id },
      data: {
        ...(dto.reportDate && { reportDate: new Date(dto.reportDate) }),
        ...(dto.totalNormal !== undefined && { totalNormal: dto.totalNormal }),
        ...(dto.totalAbnormal !== undefined && { totalAbnormal: dto.totalAbnormal }),
        ...(dto.reporterName && { reporterName: dto.reporterName }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
  }

  async removeReport(id: number, deletedBy?: string) {
    await this.findOneReport(id);
    await this.prisma.cctvReport.update({ where: { id }, data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() } });
    return { message: 'ลบรายงาน CCTV เรียบร้อยแล้ว' };
  }

  // ─── Cameras ──────────────────────────────────────────────────

  async findAllCameras(query?: { buildingId?: string }) {
    const where: any = {};
    if (query?.buildingId) where.buildingId = parseInt(query.buildingId);
    return this.prisma.camera.findMany({
      where,
      include: { building: true },
      orderBy: { cameraNo: 'asc' },
    });
  }

  async findOneCamera(id: number) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      include: { checks: { orderBy: { checkDate: 'desc' }, take: 10 }, building: true },
    });
    if (!camera) throw new NotFoundException('ไม่พบข้อมูลกล้อง');
    return camera;
  }

  async createCamera(dto: CreateCameraDto) {
    return this.prisma.camera.create({
      data: {
        buildingId: dto.buildingId,
        cameraNo: dto.cameraNo,
        cameraName: dto.cameraName,
        location: dto.location,
        status: dto.status ?? 'normal',
      },
    });
  }

  async importCameras(dtos: CreateCameraDto[]) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const dto of dtos) {
      try {
        if (!dto.buildingId || !dto.cameraNo || !dto.cameraName) {
          results.skipped++;
          continue;
        }
        await this.prisma.camera.create({
          data: {
            buildingId: dto.buildingId,
            cameraNo: dto.cameraNo,
            cameraName: dto.cameraName,
            location: dto.location,
            status: dto.status ?? 'normal',
          },
        });
        results.created++;
      } catch (e: any) {
        results.skipped++;
        results.errors.push(`${dto.cameraNo || '?'}: ${e.message}`);
      }
    }
    return results;
  }

  async updateCamera(id: number, dto: UpdateCameraDto) {
    await this.findOneCamera(id);
    return this.prisma.camera.update({
      where: { id },
      data: dto,
    });
  }

  async removeCamera(id: number) {
    await this.findOneCamera(id);
    await this.prisma.camera.delete({ where: { id } });
    return { message: 'ลบกล้องเรียบร้อยแล้ว' };
  }

  // ─── Camera Checks ────────────────────────────────────────────

  async findAllCameraChecks(query?: { cameraId?: string; dateFrom?: string; dateTo?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.cameraId) where.cameraId = parseInt(query.cameraId);
    if (query?.dateFrom || query?.dateTo) {
      where.checkDate = {};
      if (query.dateFrom) where.checkDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.checkDate.lte = new Date(query.dateTo);
    }
    return this.prisma.cameraCheck.findMany({
      where,
      include: { camera: true },
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });
  }

  async createCameraCheck(dto: CreateCameraCheckDto & { buildingName?: string }) {
    let cameraId = dto.cameraId;
    let camera = cameraId ? await this.prisma.camera.findUnique({ where: { id: cameraId } }) : null;
    // Dynamic building resolution fallback: if camera not found and buildingName provided, auto-find/create camera
    if (!camera && (dto as any).buildingName) {
      const bName = (dto as any).buildingName as string;
      let building = await this.prisma.building.findFirst({ where: { buildingCode: { equals: bName, mode: 'insensitive' } } });
      if (!building) {
        building = await this.prisma.building.findFirst({ where: { buildingName: { equals: bName, mode: 'insensitive' } } });
      }
      if (!building) {
        building = await this.prisma.building.create({ data: { buildingCode: bName.toUpperCase(), buildingName: `อาคาร ${bName.toUpperCase()}` } });
      }
      // Try find camera by remark CH number within building, else create placeholder
      const chMatch = dto.remark?.match(/CH[-\s]*(\d+)/i);
      const chNum = chMatch ? chMatch[1].padStart(2,'0') : '01';
      const cameraNo = `CH-${chNum}`;
      camera = await this.prisma.camera.findFirst({ where: { buildingId: building.id, cameraNo } });
      if (!camera) {
        camera = await this.prisma.camera.create({ data: { buildingId: building.id, cameraNo, cameraName: `${building.buildingCode} ${cameraNo}`, status: 'normal' } });
      }
      cameraId = camera.id;
    }
    if (!camera) throw new NotFoundException('ไม่พบข้อมูลกล้อง');
    return this.prisma.cameraCheck.create({
      data: {
        cameraId: cameraId!,
        checkDate: new Date(dto.checkDate),
        status: dto.status,
        remark: dto.remark,
        checkedBy: dto.checkedBy,
      },
    });
  }

  async batchCreateCameraChecks(dtos: (CreateCameraCheckDto & { buildingName?: string })[]) {
    const results = [];
    for (const dto of dtos) {
      try {
        const result = await this.createCameraCheck(dto);
        results.push(result);
      } catch (e:any) {
        // If cameraId missing, try auto-create placeholder camera
        if ((dto as any).buildingName || dto.remark) {
          const fallbackDto = { ...dto, buildingName: (dto as any).buildingName || dto.remark?.match(/Building\s+(B\d+)/i)?.[1] } as any;
          const r2 = await this.createCameraCheck(fallbackDto);
          results.push(r2);
        } else throw e;
      }
    }
    return results;
  }

  // New endpoint for angle-checks with buildingName dynamic
  async createAngleCheck(dto: any) {
    // dto: { buildingName, nvr, channel, status, remark, checkedBy, checkDate }
    if (dto.buildingName) {
      return this.createCameraCheck({
        cameraId: dto.cameraId,
        checkDate: dto.checkDate || new Date().toISOString().split('T')[0],
        status: dto.status,
        remark: dto.remark || `Building ${dto.buildingName} ${dto.nvr || ''} CH-${dto.channel || ''}`,
        checkedBy: dto.checkedBy,
        buildingName: dto.buildingName,
      } as any);
    }
    return this.createCameraCheck(dto);
  }

  async removeCameraCheck(id: number, deletedBy?: string) {
    const check = await this.prisma.cameraCheck.findUnique({ where: { id } });
    if (!check) throw new NotFoundException('ไม่พบข้อมูลการตรวจสอบมุมกล้อง');
    await this.prisma.cameraCheck.update({ where: { id }, data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() } });
    return { message: 'ลบข้อมูลเรียบร้อยแล้ว' };
  }

  async findOneCameraCheck(id: number) {
    const check = await this.prisma.cameraCheck.findUnique({ where: { id } });
    if (!check) throw new NotFoundException('ไม่พบข้อมูล camera check');
    return check;
  }

  async findCctvAngleReportById(id: number) {
    try {
      return await this.prisma.cctvAngleReport.findUnique({ where: { id } });
    } catch {
      return null;
    }
  }

  async updateCameraCheck(id: number, data: any) {
    const check = await this.prisma.cameraCheck.findUnique({ where: { id } });
    if (!check) throw new NotFoundException('ไม่พบข้อมูลการตรวจสอบมุมกล้อง');
    return this.prisma.cameraCheck.update({
      where: { id },
      data: {
        checkDate: data.checkDate ? new Date(data.checkDate) : undefined,
        status: data.status || undefined,
        remark: data.remark || undefined,
      },
    });
  }

  // ─── CCTV Inspections ─────────────────────────────────────────

  async findAllInspections(limit?: number, offset?: number) {
    return this.prisma.cctvInspection.findMany({
      where: { isDeleted: false },
      orderBy: { inspectionDate: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async findOneInspection(id: number) {
    const inspection = await this.prisma.cctvInspection.findUnique({ where: { id } });
    if (!inspection) throw new NotFoundException('ไม่พบข้อมูลการตรวจสอบ CCTV');
    return inspection;
  }

  async createInspection(dto: CreateInspectionDto) {
    return this.prisma.cctvInspection.create({
      data: {
        inspectionDate: new Date(dto.inspectionDate),
        inspectorName: dto.inspectorName,
        totalChecked: dto.totalChecked,
        totalPassed: dto.totalPassed,
        totalFailed: dto.totalFailed,
        summary: dto.summary,
      },
    });
  }

  async updateInspection(id: number, dto: UpdateInspectionDto) {
    await this.findOneInspection(id);
    return this.prisma.cctvInspection.update({
      where: { id },
      data: {
        ...(dto.inspectionDate && { inspectionDate: new Date(dto.inspectionDate) }),
        ...(dto.inspectorName && { inspectorName: dto.inspectorName }),
        ...(dto.totalChecked !== undefined && { totalChecked: dto.totalChecked }),
        ...(dto.totalPassed !== undefined && { totalPassed: dto.totalPassed }),
        ...(dto.totalFailed !== undefined && { totalFailed: dto.totalFailed }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
      },
    });
  }

  async removeInspection(id: number, deletedBy?: string) {
    await this.findOneInspection(id);
    await this.prisma.cctvInspection.update({ where: { id }, data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() } });
    return { message: 'ลบข้อมูลการตรวจสอบ CCTV เรียบร้อยแล้ว' };
  }

  // ─── NVR Devices ──────────────────────────────────────────────

  async findAllNvrDevices(query?: { buildingId?: string }) {
    const where: any = {};
    if (query?.buildingId) where.buildingId = parseInt(query.buildingId);
    return this.prisma.nvrDevice.findMany({
      where,
      include: { building: true },
      orderBy: { nvrName: 'asc' },
    });
  }

  async findOneNvrDevice(id: number) {
    const nvr = await this.prisma.nvrDevice.findUnique({
      where: { id },
      include: { recordings: { orderBy: { recordDate: 'desc' }, take: 10 }, building: true },
    });
    if (!nvr) throw new NotFoundException('ไม่พบข้อมูล NVR');
    return nvr;
  }

  async createNvrDevice(dto: CreateNvrDeviceDto) {
    return this.prisma.nvrDevice.create({
      data: {
        buildingId: dto.buildingId,
        nvrName: dto.nvrName,
        ipAddress: dto.ipAddress,
        totalChannels: dto.totalChannels ?? 16,
      },
    });
  }

  async updateNvrDevice(id: number, dto: UpdateNvrDeviceDto) {
    await this.findOneNvrDevice(id);
    return this.prisma.nvrDevice.update({
      where: { id },
      data: dto,
    });
  }

  async removeNvrDevice(id: number) {
    await this.findOneNvrDevice(id);
    await this.prisma.nvrDevice.delete({ where: { id } });
    return { message: 'ลบข้อมูล NVR เรียบร้อยแล้ว' };
  }

  // ─── NVR Recordings ───────────────────────────────────────────

  async findAllNvrRecordings(query?: { nvrId?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (query?.nvrId) where.nvrId = parseInt(query.nvrId);
    if (query?.dateFrom || query?.dateTo) {
      where.recordDate = {};
      if (query.dateFrom) where.recordDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.recordDate.lte = new Date(query.dateTo);
    }
    return this.prisma.nvrRecordingDay.findMany({
      where,
      include: { nvr: { include: { building: true } } },
      orderBy: { recordDate: 'desc' },
    });
  }

  async getNvrRecordingStatus() {
    const results = await this.prisma.nvrDevice.findMany({
      include: {
        building: true,
        recordings: {
          orderBy: { recordDate: 'desc' },
          take: 1,
        },
      },
    });

    return results.map((nvr) => ({
      nvrId: nvr.id,
      nvrName: nvr.nvrName,
      buildingName: nvr.building.buildingName,
      latestRecording: nvr.recordings[0] || null,
      isHealthy: nvr.recordings[0] ? nvr.recordings[0].daysRecorded >= 62 : false,
    }));
  }

  async findOneNvrRecording(id: number) {
    const recording = await this.prisma.nvrRecordingDay.findUnique({
      where: { id },
      include: { nvr: true },
    });
    if (recording) return recording;

    const legacyReport = await this.prisma.nvrRecordingReport.findUnique({ where: { id } });
    if (legacyReport) {
      const details = await this.prisma.nvrRecordingDetail.findMany({ where: { reportId: id } });
      return { ...legacyReport, details, _legacy: true };
    }

    throw new NotFoundException('ไม่พบข้อมูลการบันทึก NVR');
  }

  async createNvrRecording(dto: CreateNvrRecordingDto) {
    const nvr = await this.prisma.nvrDevice.findUnique({ where: { id: dto.nvrId } });
    if (!nvr) throw new NotFoundException('ไม่พบข้อมูล NVR');
    return this.prisma.nvrRecordingDay.create({
      data: {
        nvrId: dto.nvrId,
        recordDate: new Date(dto.recordDate),
        daysRecorded: dto.daysRecorded,
        status: dto.status,
        remark: dto.remark,
      },
    });
  }

  async batchCreateNvrRecordings(dtos: CreateNvrRecordingDto[]) {
    const results = [];
    for (const dto of dtos) {
      const result = await this.createNvrRecording(dto);
      results.push(result);
    }
    return results;
  }

  async updateNvrRecording(id: number, dto: UpdateNvrRecordingDto) {
    await this.findOneNvrRecording(id);
    return this.prisma.nvrRecordingDay.update({
      where: { id },
      data: {
        ...(dto.nvrId && { nvrId: dto.nvrId }),
        ...(dto.recordDate && { recordDate: new Date(dto.recordDate) }),
        ...(dto.daysRecorded !== undefined && { daysRecorded: dto.daysRecorded }),
        ...(dto.status && { status: dto.status }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
  }

  async removeNvrRecording(id: number) {
    await this.findOneNvrRecording(id);
    await this.prisma.nvrRecordingDay.delete({ where: { id } });
    return { message: 'ลบข้อมูลการบันทึก NVR เรียบร้อยแล้ว' };
  }

  // ─── Buildings ────────────────────────────────────────────────

  async findAllBuildings() {
    return this.prisma.building.findMany({
      include: { cameras: true, nvrDevices: true },
      orderBy: { buildingCode: 'asc' },
    });
  }

  async createBuilding(dto: CreateBuildingDto) {
    const existing = await this.prisma.building.findFirst({
      where: { buildingCode: dto.buildingCode },
    });
    if (existing) {
      throw new BadRequestException('มีรหัสอาคารนี้อยู่แล้ว');
    }
    return this.prisma.building.create({
      data: {
        buildingCode: dto.buildingCode,
        buildingName: dto.buildingName,
        description: dto.description,
      },
    });
  }

  // ─── Image Map (for angle check page) ─────────────────────────

  async getImageMap(query?: { building?: string; nvr?: string }) {
    const imagesBase = path.join(process.cwd(), 'report_assets', 'Images');
    const imageMap: Record<string, string> = {};

    if (!fs.existsSync(imagesBase)) {
      return { imageMap, total: 0 };
    }

    const buildingDirs = fs.readdirSync(imagesBase).filter((d) => {
      const full = path.join(imagesBase, d);
      return fs.statSync(full).isDirectory() && /^B\d+$/i.test(d);
    });

    for (const bldg of buildingDirs) {
      if (query?.building && bldg.toUpperCase() !== query.building.toUpperCase()) continue;

      const bldgPath = path.join(imagesBase, bldg);
      const nvrDirs = fs.readdirSync(bldgPath).filter((d) => {
        const full = path.join(bldgPath, d);
        return fs.statSync(full).isDirectory() && /^NVR\d+$/i.test(d);
      });

      for (const nvr of nvrDirs) {
        if (query?.nvr) {
          const nvrNum = nvr.replace(/^NVR/i, '');
          if (`NVR-${nvrNum}` !== query.nvr && `NVR ${nvrNum}` !== query.nvr && nvr.toUpperCase() !== query.nvr.toUpperCase()) continue;
        }

        const nvrPath = path.join(bldgPath, nvr);
        const files = fs.readdirSync(nvrPath).filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f));

        for (const file of files) {
          const match = file.match(/CH[\s-]*(\d+)/i);
          if (match) {
            const channel = parseInt(match[1], 10);
            const nvrNum = parseInt(nvr.replace(/^NVR/i, ''), 10);
            const key = `${bldg}-${nvrNum}-${channel}`;
            imageMap[key] = `/cctv-images/${bldg}/${nvr}/${encodeURIComponent(file)}`;
          }
        }
      }
    }

    return { imageMap, total: Object.keys(imageMap).length };
  }
}
