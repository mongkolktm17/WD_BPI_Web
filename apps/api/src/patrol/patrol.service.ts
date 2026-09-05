import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatrolDto } from './dto/create-patrol.dto';
import { UpdatePatrolDto } from './dto/update-patrol.dto';

@Injectable()
export class PatrolService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { date?: string; status?: string; route?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.date) where.patrolDate = new Date(query.date);
    if (query?.status) where.status = query.status;
    if (query?.route) where.patrolRoute = { contains: query.route };
    return this.prisma.patrolReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findOne(id: number) {
    const report = await this.prisma.patrolReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('ไม่พบข้อมูลรายงานลาดตระเวน');
    return report;
  }

  async create(dto: CreatePatrolDto) {
    return this.prisma.patrolReport.create({
      data: {
        patrolDate: new Date(dto.patrolDate),
        patrolRoute: dto.patrolRoute,
        officerName: dto.officerName,
        status: dto.status,
        notes: dto.notes,
      },
    });
  }

  async update(id: number, dto: UpdatePatrolDto) {
    await this.findOne(id);
    return this.prisma.patrolReport.update({
      where: { id },
      data: {
        ...(dto.patrolDate && { patrolDate: new Date(dto.patrolDate) }),
        ...(dto.patrolRoute && { patrolRoute: dto.patrolRoute }),
        ...(dto.officerName && { officerName: dto.officerName }),
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(id: number, deletedBy?: string) {
    await this.findOne(id);
    await this.prisma.patrolReport.update({ where: { id }, data: { isDeleted: true, deletedBy: deletedBy ?? null, deletedAt: new Date() } });
    return { message: 'ลบข้อมูลรายงานลาดตระเวนเรียบร้อยแล้ว' };
  }
}
