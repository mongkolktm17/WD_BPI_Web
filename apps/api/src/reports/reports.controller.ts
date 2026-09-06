import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { CreateBuildingReportDto } from './dto/create-building-report.dto';
import { UpdateBuildingReportDto } from './dto/update-building-report.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission('report_page:read')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @RequirePermission('report_page:read')
  @Get()
  async findAll(@Query() query: { type?: string }) {
    return this.reportsService.findAll(query);
  }

  @RequirePermission('report_page:read')
  @Get('visual')
  async getVisualReports() {
    return this.reportsService.getVisualReports();
  }

  @RequirePermission('report_page:read')
  @Get('building')
  async getBuildingReport() {
    return this.reportsService.getBuildingReport();
  }

  @RequirePermission('report_page:read')
  @Get('building-reports')
  async findAllBuildingReports(@Query() query: { building?: string; dateFrom?: string; dateTo?: string; limit?: string }) {
    return this.reportsService.findAllBuildingReports({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @RequirePermission('report_page:read')
  @Get('all-reports')
  async getAllRecentReports(@Query() query: { type?: string; submitter?: string; dateFrom?: string; dateTo?: string; page?: string; limit?: string }) {
    const rawLimit = query.limit ? parseInt(query.limit) : 10;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 5000) : 10;
    const rawPage = query.page ? parseInt(query.page) : 1;
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
    return this.reportsService.getAllRecentReports({ ...query, page, limit });
  }

  @RequirePermission('report_page:read')
  @Get('all-reports/export')
  async exportRecentReports(@Query() query: { type?: string; submitter?: string; dateFrom?: string; dateTo?: string }) {
    return this.reportsService.getAllRecentReports({ ...query, page: 1, limit: 5000 });
  }

  @RequirePermission('report_page:read')
  @Get('building-reports/:id')
  async findOneBuildingReport(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOneBuildingReport(id);
  }

  @RequirePermission('report_page:write')
  @Post('building-reports')
  async createBuildingReport(@Body() dto: CreateBuildingReportDto) {
    return this.reportsService.createBuildingReport(dto);
  }

  @RequirePermission('report_page:delete')
  @Delete('building-reports/:id')
  async removeBuildingReport(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.reportsService.removeBuildingReport(id, req.user?.username);
  }

  @RequirePermission('report_page:write')
  @Put('building-reports/:id')
  async updateBuildingReport(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBuildingReportDto) {
    return this.reportsService.updateBuildingReport(id, dto);
  }

  @RequirePermission('report_page:read')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOne(id);
  }

  @RequirePermission('report_page:write')
  @Post()
  async create(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }

  @RequirePermission('report_page:write')
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(id, dto);
  }

  @RequirePermission('report_page:delete')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.remove(id);
  }
}
