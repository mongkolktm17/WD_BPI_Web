import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRadioInspectionDto } from './dto/create-radio-inspection.dto';

@Injectable()
export class RadioService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Equipment master ─────────────────────────────────────────

  async findAllEquipment(query?: { q?: string; brand?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.brand) where.brand = query.brand;
    if (query?.q) {
      where.OR = [
        { assetNumber: { contains: query.q, mode: 'insensitive' } },
        { assetName: { contains: query.q, mode: 'insensitive' } },
        { serialNumber: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.radioEquipment.findMany({
      where,
      orderBy: { assetNumber: 'asc' },
      take: query?.limit || 500,
    });
  }

  async equipmentBrands() {
    const rows = await this.prisma.radioEquipment.findMany({
      where: { isDeleted: false },
      select: { brand: true },
      distinct: ['brand'],
    });
    return rows.map((r) => r.brand).filter(Boolean);
  }

  async createEquipment(data: { assetNumber: string; assetName: string; brand?: string; model?: string; serialNumber?: string; location?: string }) {
    if (!data.assetNumber?.trim() || !data.assetName?.trim()) {
      throw new BadRequestException('กรุณาระบุ Asset number และชื่ออุปกรณ์');
    }
    const existing = await this.prisma.radioEquipment.findUnique({ where: { assetNumber: data.assetNumber.trim() } });
    if (existing) throw new BadRequestException('มี Asset number นี้อยู่แล้ว');
    return this.prisma.radioEquipment.create({
      data: {
        assetNumber: data.assetNumber.trim(),
        assetName: data.assetName.trim(),
        brand: data.brand?.trim() || null,
        model: data.model?.trim() || null,
        serialNumber: data.serialNumber?.trim() || null,
        location: data.location?.trim() || null,
      },
    });
  }

  // ─── Inspections (one header + many items per round) ──────────

  async findAllInspections(query?: { dateFrom?: string; dateTo?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.dateFrom || query?.dateTo) {
      where.inspectionDate = {};
      if (query.dateFrom) where.inspectionDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.inspectionDate.lte = new Date(query.dateTo);
    }
    return this.prisma.radioInspection.findMany({
      where,
      include: { items: { include: { equipment: true } } },
      orderBy: { inspectionDate: 'desc' },
      take: query?.limit || 50,
    });
  }

  async findOneInspection(id: number) {
    const item = await this.prisma.radioInspection.findUnique({
      where: { id },
      include: { items: { include: { equipment: true } } },
    });
    if (!item || item.isDeleted) throw new NotFoundException('ไม่พบข้อมูลการตรวจวิทยุ');
    return item;
  }

  private summarize(items: { isPresent: boolean; isWorking: boolean }[]) {
    const totalChecked = items.length;
    const totalPresent = items.filter((i) => i.isPresent).length;
    const totalWorking = items.filter((i) => i.isPresent && i.isWorking).length;
    const totalFailed = items.filter((i) => !i.isPresent || !i.isWorking).length;
    return { totalChecked, totalPresent, totalWorking, totalFailed };
  }

  async createInspection(dto: CreateRadioInspectionDto, submittedById?: number) {
    const ids = dto.items.map((i) => i.equipmentId);
    const found = await this.prisma.radioEquipment.count({ where: { id: { in: ids }, isDeleted: false } });
    if (found !== new Set(ids).size) throw new BadRequestException('พบรหัสเครื่องวิทยุที่ไม่ถูกต้อง');
    const s = this.summarize(dto.items);
    return this.prisma.radioInspection.create({
      data: {
        inspectionDate: new Date(dto.inspectionDate),
        shift: dto.shift,
        inspectorName: dto.inspectorName,
        ...s,
        summary: dto.summary || null,
        submittedById: submittedById ?? null,
        items: {
          create: dto.items.map((i) => ({
            equipmentId: i.equipmentId,
            isPresent: i.isPresent,
            isWorking: i.isPresent ? i.isWorking : false,
            remark: i.remark || null,
            photoUrl: i.photoUrl || null,
          })),
        },
      },
      include: { items: { include: { equipment: true } } },
    });
  }

  async updateInspection(id: number, dto: CreateRadioInspectionDto, updatedBy?: string) {
    await this.findOneInspection(id);
    const s = this.summarize(dto.items);
    await this.prisma.radioInspectionItem.deleteMany({ where: { inspectionId: id } });
    return this.prisma.radioInspection.update({
      where: { id },
      data: {
        inspectionDate: new Date(dto.inspectionDate),
        shift: dto.shift,
        inspectorName: dto.inspectorName,
        ...s,
        summary: dto.summary || null,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date(),
        items: {
          create: dto.items.map((i) => ({
            equipmentId: i.equipmentId,
            isPresent: i.isPresent,
            isWorking: i.isPresent ? i.isWorking : false,
            remark: i.remark || null,
            photoUrl: i.photoUrl || null,
          })),
        },
      },
      include: { items: { include: { equipment: true } } },
    });
  }

  async removeInspection(id: number, deletedBy?: string) {
    await this.findOneInspection(id);
    return this.prisma.radioInspection.update({
      where: { id },
      data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() },
    });
  }
}
