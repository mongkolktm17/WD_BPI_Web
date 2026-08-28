import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });
    if (!role) {
      throw new NotFoundException('ไม่พบข้อมูลบทบาท');
    }
    return role;
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { roleName: dto.roleName },
    });
    if (existing) {
      throw new BadRequestException('มีชื่อบทบาทนี้อยู่แล้ว');
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          roleName: dto.roleName,
          description: dto.description,
        },
      });

      if (dto.permissions && dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((p) => ({
            roleId: role.id,
            moduleName: p.moduleName,
            canRead: p.canRead ?? false,
            canWrite: p.canWrite ?? false,
            canDelete: p.canDelete ?? false,
          })),
        });
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: { permissions: true },
      });
    });
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('ไม่พบข้อมูลบทบาท');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          roleName: dto.roleName,
          description: dto.description,
        },
      });

      if (dto.permissions) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissions.map((p) => ({
              roleId: id,
              moduleName: p.moduleName,
              canRead: p.canRead ?? false,
              canWrite: p.canWrite ?? false,
              canDelete: p.canDelete ?? false,
            })),
          });
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: { permissions: true },
      });
    });
  }

  async remove(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('ไม่พบข้อมูลบทบาท');
    }
    await this.prisma.role.delete({ where: { id } });
    return { message: 'ลบบทบาทเรียบร้อยแล้ว' };
  }

  getAvailablePages() {
    return [
      'dashboard',
      'cctv_report',
      'cctv_angle_check',
      'cctv_inspection',
      'nvr_recording',
      'car_parking',
      'guard_duty_log',
      'metal_detector',
      'walkthrough_detector',
      'patrol_checklist',
      'report_page',
      'report_visual',
    ];
  }
}
