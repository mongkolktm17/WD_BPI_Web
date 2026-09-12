import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PermissionGuard } from './common/guards/permission.guard';
import { AdminGuard } from './common/guards/admin.guard';
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
import { MetricsModule } from './metrics/metrics.module';
import { SitesModule } from './sites/sites.module';
import { DynamicFormsModule } from './dynamic-forms/dynamic-forms.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 1000,
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
    MetricsModule,
    SitesModule,
    DynamicFormsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    PermissionGuard,
    AdminGuard,
  ],
})
export class AppModule {}
