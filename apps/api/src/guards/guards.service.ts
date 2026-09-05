import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDutyLogDto } from './dto/create-duty-log.dto';
import { UpdateDutyLogDto } from './dto/update-duty-log.dto';
import { CreateGuardCountDto } from './dto/create-guard-count.dto';
import { UpdateGuardCountDto } from './dto/update-guard-count.dto';

@Injectable()
export class GuardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Duty Logs ────────────────────────────────────────────────

  async findAllDutyLogs(query?: { date?: string; shift?: string }) {
    const where: any = {};
    if (query?.date) where.logDate = new Date(query.date);
    if (query?.shift) where.shift = query.shift;
    return this.prisma.guardDutyLog.findMany({
      where,
      orderBy: { logDate: 'desc' },
    });
  }

  async findOneDutyLog(id: number) {
    const log = await this.prisma.guardDutyLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('ไม่พบข้อมูลบันทึกการปฏิบัติหน้าที่');
    return log;
  }

  async createDutyLog(dto: CreateDutyLogDto) {
    return this.prisma.guardDutyLog.create({
      data: {
        logDate: new Date(dto.logDate),
        shift: dto.shift,
        guardName: dto.guardName,
        dutyPost: dto.dutyPost,
        eventLog: dto.eventLog,
      },
    });
  }

  async updateDutyLog(id: number, dto: UpdateDutyLogDto) {
    await this.findOneDutyLog(id);
    return this.prisma.guardDutyLog.update({
      where: { id },
      data: {
        ...(dto.logDate && { logDate: new Date(dto.logDate) }),
        ...(dto.shift && { shift: dto.shift }),
        ...(dto.guardName && { guardName: dto.guardName }),
        ...(dto.dutyPost && { dutyPost: dto.dutyPost }),
        ...(dto.eventLog && { eventLog: dto.eventLog }),
      },
    });
  }

  async removeDutyLog(id: number) {
    await this.findOneDutyLog(id);
    await this.prisma.guardDutyLog.delete({ where: { id } });
    return { message: 'ลบข้อมูลบันทึกการปฏิบัติหน้าที่เรียบร้อยแล้ว' };
  }

  // ─── Guard Counts ─────────────────────────────────────────────

  async findAllCounts(query?: { date?: string; shift?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.date) where.recordDate = new Date(query.date);
    if (query?.shift) where.shift = query.shift;
    return this.prisma.guardCount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findLatestCount() {
    const count = await this.prisma.guardCount.findFirst({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!count) throw new NotFoundException('ไม่พบข้อมูลจำนวนยาม');
    return count;
  }

  async findOneCount(id: number) {
    const count = await this.prisma.guardCount.findUnique({ where: { id } });
    if (!count) throw new NotFoundException('ไม่พบข้อมูลจำนวนยาม');
    return count;
  }

  async createCount(dto: CreateGuardCountDto) {
    return this.prisma.guardCount.create({
      data: {
        recordDate: new Date(dto.recordDate),
        shift: dto.shift,
        totalGuards: dto.totalGuards,
        presentGuards: dto.presentGuards,
        absentGuards: dto.absentGuards,
        remark: dto.remark,
      },
    });
  }

  async updateCount(id: number, dto: UpdateGuardCountDto) {
    const existing = await this.prisma.guardCount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('ไม่พบข้อมูลจำนวนยาม');
    return this.prisma.guardCount.update({
      where: { id },
      data: {
        ...(dto.recordDate && { recordDate: new Date(dto.recordDate) }),
        ...(dto.shift && { shift: dto.shift }),
        ...(dto.totalGuards !== undefined && { totalGuards: dto.totalGuards }),
        ...(dto.presentGuards !== undefined && { presentGuards: dto.presentGuards }),
        ...(dto.absentGuards !== undefined && { absentGuards: dto.absentGuards }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
  }

  async removeCount(id: number, deletedBy?: string) {
    const count = await this.prisma.guardCount.findUnique({ where: { id } });
    if (!count) throw new NotFoundException('ไม่พบข้อมูลจำนวนยาม');
    await this.prisma.guardCount.update({ where: { id }, data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() } });
    return { message: 'ลบข้อมูลจำนวนยามเรียบร้อยแล้ว' };
  }

  async getSecurityStatus() {
    const [morningCount, eveningCount] = await Promise.all([
      this.prisma.guardCount.findFirst({
        where: { shift: { in: ['morning', 'เช้า'] }, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guardCount.findFirst({
        where: { shift: { in: ['evening', 'night', 'ดึก', 'ค่ำ'] }, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const contractGuards = await this.prisma.officer.count({
      where: { status: 'active', company: { not: null } },
    });

    return {
      morning_shift: morningCount,
      evening_shift: eveningCount,
      contractGuards,
    };
  }
}
