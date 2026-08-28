import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { GuardsService } from './guards.service';
import { CreateDutyLogDto } from './dto/create-duty-log.dto';
import { UpdateDutyLogDto } from './dto/update-duty-log.dto';
import { CreateGuardCountDto } from './dto/create-guard-count.dto';
import { UpdateGuardCountDto } from './dto/update-guard-count.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('guards')
export class GuardsController {
  constructor(private readonly guardsService: GuardsService) {}

  // ─── Duty Logs ────────────────────────────────────────────────

  @Get('duty-logs')
  async findAllDutyLogs(@Query() query: { date?: string; shift?: string }) {
    return this.guardsService.findAllDutyLogs(query);
  }

  @Get('duty-logs/:id')
  async findOneDutyLog(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.findOneDutyLog(id);
  }

  @Post('duty-logs')
  async createDutyLog(@Body() dto: CreateDutyLogDto) {
    return this.guardsService.createDutyLog(dto);
  }

  @Put('duty-logs/:id')
  async updateDutyLog(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDutyLogDto) {
    return this.guardsService.updateDutyLog(id, dto);
  }

  @Delete('duty-logs/:id')
  async removeDutyLog(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.removeDutyLog(id);
  }

  // ─── Guard Counts ─────────────────────────────────────────────

  @Get('counts')
  async findAllCounts(@Query() query: { date?: string; shift?: string; limit?: string }) {
    return this.guardsService.findAllCounts({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('counts/:id')
  async findOneCount(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.findOneCount(id);
  }

  @Get('counts/latest')
  async findLatestCount() {
    return this.guardsService.findLatestCount();
  }

  @Post('counts')
  async createCount(@Body() dto: CreateGuardCountDto) {
    return this.guardsService.createCount(dto);
  }

  @Put('counts/:id')
  async updateCount(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGuardCountDto) {
    return this.guardsService.updateCount(id, dto);
  }

  @Delete('counts/:id')
  async removeCount(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.removeCount(id);
  }

  @Get('status')
  async getSecurityStatus() {
    return this.guardsService.getSecurityStatus();
  }
}
