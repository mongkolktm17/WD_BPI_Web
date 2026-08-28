import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { StatsModule } from './stats/stats.module';
import { OfficersModule } from './officers/officers.module';
import { RolesModule } from './roles/roles.module';
import { CctvModule } from './cctv/cctv.module';
import { ParkingModule } from './parking/parking.module';
import { GuardsModule } from './guards/guards.module';
import { MetalDetectorModule } from './metal-detector/metal-detector.module';
import { PatrolModule } from './patrol/patrol.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { SystemModule } from './system/system.module';
import { LegacyModule } from './legacy/legacy.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    StatsModule,
    OfficersModule,
    RolesModule,
    CctvModule,
    ParkingModule,
    GuardsModule,
    MetalDetectorModule,
    PatrolModule,
    ReportsModule,
    UsersModule,
    SystemModule,
    LegacyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
