import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemController, MigrationController],
  providers: [MigrationService],
})
export class SystemModule {}