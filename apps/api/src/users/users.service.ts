import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeId: true,
        roleId: true,
        department: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        role: {
          select: { id: true, roleName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeId: true,
        roleId: true,
        department: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        role: {
          select: { id: true, roleName: true },
        },
      },
    });
    if (!user) throw new NotFoundException('ไม่พบข้อมูลผู้ใช้');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { username: dto.username },
    });
    if (existing) {
      throw new BadRequestException('มีชื่อผู้ใช้นี้อยู่แล้ว');
    }

    if (dto.employeeId) {
      const dupEmployee = await this.prisma.user.findFirst({
        where: { employeeId: dto.employeeId },
      });
      if (dupEmployee) throw new BadRequestException('มีรหัสพนักงานนี้อยู่แล้ว');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        fullName: dto.fullName,
        employeeId: dto.employeeId ?? null,
        roleId: dto.roleId,
        department: dto.department,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeId: true,
        roleId: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('ไม่พบข้อมูลผู้ใช้');

    if (dto.username && dto.username !== user.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: dto.username },
      });
      if (existing) throw new BadRequestException('มีชื่อผู้ใช้นี้อยู่แล้ว');
    }

    if (dto.employeeId && dto.employeeId !== user.employeeId) {
      const dupEmployee = await this.prisma.user.findFirst({
        where: { employeeId: dto.employeeId, NOT: { id } },
      });
      if (dupEmployee) throw new BadRequestException('มีรหัสพนักงานนี้อยู่แล้ว');
    }

    const updateData: any = {};
    if (dto.username) updateData.username = dto.username;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 10);
    if (dto.fullName) updateData.fullName = dto.fullName;
    if (dto.roleId) updateData.roleId = dto.roleId;
    if (dto.department !== undefined) updateData.department = dto.department;
    if (dto.employeeId !== undefined) updateData.employeeId = dto.employeeId || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeId: true,
        roleId: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('ไม่พบข้อมูลผู้ใช้');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'ลบผู้ใช้เรียบร้อยแล้ว' };
  }

  async autocompleteSearch(query: string) {
    if (!query || query.length < 2) return [];
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: { fullName: true, username: true },
      take: 20,
    });
    const officers = await this.prisma.officer.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { employeeId: { contains: query, mode: 'insensitive' } },
        ],
        status: 'active',
      },
      select: { firstName: true, lastName: true, employeeId: true },
      take: 20,
    });
    const names = new Set<string>();
    users.forEach(u => { if (u.fullName) names.add(u.fullName); });
    officers.forEach(o => {
      const name = [o.firstName, o.lastName].filter(Boolean).join(' ');
      if (name) names.add(name);
    });
    return Array.from(names).slice(0, 20);
  }

  async importUsers(dtos: CreateUserDto[]) {
    const results = { created: 0, failed: 0, errors: [] as string[] };
    for (const dto of dtos) {
      try {
        await this.create(dto);
        results.created++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${dto.username}: ${e.message}`);
      }
    }
    return results;
  }

  async exportCsv() {
    const users = await this.prisma.user.findMany({
      include: { role: { select: { roleName: true } } },
      orderBy: { id: 'asc' },
    });

    const header = 'ID,Username,FullName,Department,Role,IsActive,CreatedAt\n';
    const rows = users.map((u) =>
      [u.id, u.username, u.fullName, u.department || '', u.role.roleName, u.isActive, u.createdAt.toISOString()].join(',')
    );
    return header + rows.join('\n');
  }
}
