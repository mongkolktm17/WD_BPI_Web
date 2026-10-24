import { Controller, Get, Post, UseGuards, Query, Sse, MessageEvent } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@UseGuards(AuthGuard('jwt'))
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Sse('stream')
  streamTelemetry(): Observable<MessageEvent> {
    return this.statsService.getTelemetryStream();
  }

  @Get()
  async getStats() {
    return this.statsService.getDashboardStats();
  }

  @Get('dashboard')
  async getDashboardData(@Query('site_id') siteId?: string) {
    return this.statsService.getDashboardData(siteId ? Number(siteId) : 1);
  }

  @Get('executive')
  async getExecutiveOverview() {
    return this.statsService.getExecutiveOverview();
  }

  @Get('visual')
  async getVisualStats(@Query() query: { range?: string; month?: string; year?: string }) {
    return this.statsService.getVisualStats(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('clear-cache')
  async clearCache() {
    return this.statsService.clearStatsCache();
  }
}
