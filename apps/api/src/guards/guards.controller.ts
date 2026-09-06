import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { GuardsService } from './guards.service';
import { CreateDutyLogDto } from './dto/create-duty-log.dto';
import { UpdateDutyLogDto } from './dto/update-duty-log.dto';
import { CreateGuardCountDto } from './dto/create-guard-count.dto';
import { UpdateGuardCountDto } from './dto/update-guard-count.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission('guard_duty_log:read')
@Controller('guards')
export class GuardsController {
  constructor(private readonly guardsService: GuardsService) {}

  // ─── Duty Logs ────────────────────────────────────────────────

  @RequirePermission('guard_duty_log:read')
  @Get('duty-logs')
  async findAllDutyLogs(@Query() query: { date?: string; shift?: string }) {
    return this.guardsService.findAllDutyLogs(query);
  }

  @RequirePermission('guard_duty_log:read')
  @Get('duty-logs/:id')
  async findOneDutyLog(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.findOneDutyLog(id);
  }

  @RequirePermission('guard_duty_log:write')
  @Post('duty-logs')
  async createDutyLog(@Body() dto: CreateDutyLogDto) {
    return this.guardsService.createDutyLog(dto);
  }

  @RequirePermission('guard_duty_log:write')
  @Put('duty-logs/:id')
  async updateDutyLog(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDutyLogDto) {
    return this.guardsService.updateDutyLog(id, dto);
  }

  @RequirePermission('guard_duty_log:delete')
  @Delete('duty-logs/:id')
  async removeDutyLog(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.removeDutyLog(id);
  }

  // ─── Guard Counts ─────────────────────────────────────────────

  @RequirePermission('guard_duty_log:read')
  @Get('counts')
  async findAllCounts(@Query() query: { date?: string; shift?: string; limit?: string }) {
    return this.guardsService.findAllCounts({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @RequirePermission('guard_duty_log:read')
  @Get('counts/latest')
  async findLatestCount() {
    return this.guardsService.findLatestCount();
  }

  @RequirePermission('guard_duty_log:read')
  @Get('counts/:id')
  async findOneCount(@Param('id', ParseIntPipe) id: number) {
    return this.guardsService.findOneCount(id);
  }

  @RequirePermission('guard_duty_log:write')
  @Post('counts')
  async createCount(@Body() dto: CreateGuardCountDto) {
    return this.guardsService.createCount(dto);
  }

  @RequirePermission('guard_duty_log:write')
  @Put('counts/:id')
  async updateCount(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGuardCountDto) {
    return this.guardsService.updateCount(id, dto);
  }

  @RequirePermission('guard_duty_log:delete')
  @Delete('counts/:id')
  async removeCount(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.guardsService.removeCount(id, req.user?.username);
  }

  @RequirePermission('guard_duty_log:read')
  @Get('status')
  async getSecurityStatus() {
    return this.guardsService.getSecurityStatus();
  }
}
