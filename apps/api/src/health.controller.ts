import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // Liveness: is the process running?
  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Readiness: can it serve traffic? (503 when DB or Redis is down)
  @Get('ready')
  async ready() {
    const [db, redis] = await Promise.all([this.checkDatabase(), this.redis.ping()]);
    const body = {
      status: db && redis ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: db ? 'connected' : 'disconnected',
      redis: redis ? 'connected' : 'disconnected',
    };
    if (!db || !redis) {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }

  // Legacy health endpoint (kept for existing monitors; now truthful)
  @Get()
  async check() {
    return this.ready();
  }
}
