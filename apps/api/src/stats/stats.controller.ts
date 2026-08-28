import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getStats() {
    return this.statsService.getDashboardStats();
  }

  @Get('dashboard')
  async getDashboardData() {
    return this.statsService.getDashboardData();
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
