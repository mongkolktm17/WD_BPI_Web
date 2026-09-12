import { Controller, Get, Param, ParseIntPipe, Put, Body, UseGuards } from '@nestjs/common';
import { SitesService } from './sites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('sites')
@UseGuards(JwtAuthGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  async findAll() {
    return this.sitesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sitesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; nameEn?: string; description?: string; address?: string; configJson?: any },
  ) {
    const data = await this.sitesService.update(id, body);
    return { success: true, data, message: 'บันทึกข้อมูลสาขาเรียบร้อยแล้ว' };
  }
}
