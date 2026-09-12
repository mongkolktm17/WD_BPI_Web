import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const isExecutive =
      user.roleId === 1 ||
      user.roleId === 6 ||
      user.role.roleName.includes('ผู้บริหาร') ||
      user.role.roleName.includes('Admin');

    const allSites = await this.prisma.site.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, nameEn: true },
      orderBy: { id: 'asc' },
    });

    const currentSiteId = user.defaultSiteId || 1;
    const assignedSites = isExecutive
      ? allSites
      : allSites.filter((s) => s.id === currentSiteId);

    const payload = {
      sub: user.id,
      username: user.username,
      fullName: user.fullName,
      employeeId: user.employeeId,
      roleId: user.roleId,
      roleName: user.role.roleName,
      defaultSiteId: currentSiteId,
      isExecutive,
    };

    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        employeeId: user.employeeId,
        department: user.department,
        defaultSiteId: currentSiteId,
        isExecutive,
        assignedSites,
        role: {
          id: user.role.id,
          name: user.role.roleName,
          permissions: user.role.permissions,
        },
      },
    };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: 'ไม่พบข้อมูลผู้ใช้' };
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return { success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้');
    }

    const isExecutive =
      user.roleId === 1 ||
      user.roleId === 6 ||
      user.role.roleName.includes('ผู้บริหาร') ||
      user.role.roleName.includes('Admin');

    const allSites = await this.prisma.site.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, nameEn: true },
      orderBy: { id: 'asc' },
    });

    const currentSiteId = user.defaultSiteId || 1;
    const assignedSites = isExecutive
      ? allSites
      : allSites.filter((s) => s.id === currentSiteId);

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      employeeId: user.employeeId,
      department: user.department,
      phone: user.phone,
      email: user.email,
      defaultSiteId: currentSiteId,
      isExecutive,
      assignedSites,
      role: {
        id: user.role.id,
        name: user.role.roleName,
        permissions: user.role.permissions,
      },
    };
  }
}
