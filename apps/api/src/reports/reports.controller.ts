import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { CreateBuildingReportDto } from './dto/create-building-report.dto';
import { UpdateBuildingReportDto } from './dto/update-building-report.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async findAll(@Query() query: { type?: string }) {
    return this.reportsService.findAll(query);
  }

  @Get('visual')
  async getVisualReports() {
    return this.reportsService.getVisualReports();
  }

  @Get('building')
  async getBuildingReport() {
    return this.reportsService.getBuildingReport();
  }

  @Get('building-reports')
  async findAllBuildingReports(@Query() query: { building?: string; dateFrom?: string; dateTo?: string; limit?: string }) {
    return this.reportsService.findAllBuildingReports({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('all-reports')
  async getAllRecentReports(@Query() query: { type?: string; submitter?: string; dateFrom?: string; dateTo?: string; page?: string; limit?: string }) {
    return this.reportsService.getAllRecentReports({
      ...query,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    });
  }

  @Get('building-reports/:id')
  async findOneBuildingReport(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOneBuildingReport(id);
  }

  @Post('building-reports')
  async createBuildingReport(@Body() dto: CreateBuildingReportDto) {
    return this.reportsService.createBuildingReport(dto);
  }

  @Delete('building-reports/:id')
  async removeBuildingReport(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.removeBuildingReport(id);
  }

  @Put('building-reports/:id')
  async updateBuildingReport(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBuildingReportDto) {
    return this.reportsService.updateBuildingReport(id, dto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.remove(id);
  }
}
