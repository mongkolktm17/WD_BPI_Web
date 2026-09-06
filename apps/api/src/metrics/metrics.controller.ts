import { Controller, Get, Header, Headers, ForbiddenException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';

@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async prometheus(@Headers('x-metrics-token') token?: string) {
    // If METRICS_TOKEN is set, scrapers must send it (keeps stats off public internet).
    const expected = process.env.METRICS_TOKEN;
    if (expected && token !== expected) {
      throw new ForbiddenException('metrics token required');
    }
    return this.metrics.metrics();
  }
}
