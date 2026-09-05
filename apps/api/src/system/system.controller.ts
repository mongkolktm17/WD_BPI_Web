import { Controller, Get, Put, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard('jwt'))
@Controller('system')
export class SystemController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('server-time')
  async getServerTime() {
    return {
      serverTime: new Date().toISOString(),
      timezone: 'Asia/Bangkok',
    };
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('schema')
  async getSchema() {
    const tables = await this.prisma.$queryRaw`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    return { tables };
  }

  @Put('profile')
  async updateProfile(@Request() req: any, @Res() res: Response) {
    const userId = req.user.id;
    const { fullName, department, phone, email } = req.body;

    if (!fullName && !department && !phone && !email) {
      return res.status(400).json({ message: 'Must provide fullName, department, phone, or email' });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(department && { department }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        department: true,
        phone: true,
        email: true,
        roleId: true,
        isActive: true,
      },
    });

    return { user: updatedUser };
  }
}