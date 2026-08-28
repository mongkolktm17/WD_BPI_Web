import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { UpdateOfficerDto } from './dto/update-officer.dto';

@Injectable()
export class OfficersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfficerDto) {
    const existing = await this.prisma.officer.findUnique({
      where: { employeeId: dto.employeeId },
    });
    if (existing) {
      throw new ConflictException('รหัสพนักงานนี้มีในระบบแล้ว');
    }
    return this.prisma.officer.create({ data: dto });
  }

  async findAll() {
    return this.prisma.officer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const officer = await this.prisma.officer.findUnique({
      where: { id },
    });
    if (!officer) {
      throw new NotFoundException('ไม่พบข้อมูลเจ้าหน้าที่');
    }
    return officer;
  }

  async update(id: number, dto: UpdateOfficerDto) {
    await this.findOne(id);
    if (dto.employeeId) {
      const existing = await this.prisma.officer.findFirst({
        where: { employeeId: dto.employeeId, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('รหัสพนักงานนี้มีในระบบแล้ว');
      }
    }
    return this.prisma.officer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.officer.delete({ where: { id } });
  }
}
