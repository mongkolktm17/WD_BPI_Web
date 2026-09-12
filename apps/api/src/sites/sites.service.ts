import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const sites = await this.prisma.site.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    const results = await Promise.all(
      sites.map(async (site) => {
        const [officersCount, buildingsCount, camerasCount] = await Promise.all([
          this.prisma.officer.count({ where: { siteId: site.id, status: 'active' } }),
          this.prisma.building.count({ where: { siteId: site.id } }),
          this.prisma.camera.count({ where: { siteId: site.id } }),
        ]);

        return {
          ...site,
          stats: {
            officersCount,
            buildingsCount,
            camerasCount,
          },
        };
      }),
    );

    return results;
  }

  async findOne(id: number) {
    const site = await this.prisma.site.findUnique({
      where: { id },
    });
    if (!site) {
      throw new NotFoundException(`ไม่พบข้อมูลสาขารหัส ${id}`);
    }

    const [officers, buildings] = await Promise.all([
      this.prisma.officer.findMany({
        where: { siteId: id, status: 'active' },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.building.findMany({
        where: { siteId: id },
        include: { _count: { select: { cameras: true, nvrDevices: true } } },
      }),
    ]);

    return {
      ...site,
      officers,
      buildings,
    };
  }

  async update(id: number, data: { name?: string; nameEn?: string; description?: string; address?: string; configJson?: any }) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException(`ไม่พบข้อมูลสาขารหัส ${id}`);

    return this.prisma.site.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.nameEn !== undefined && { nameEn: data.nameEn }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.configJson && { configJson: data.configJson }),
      },
    });
  }
}
