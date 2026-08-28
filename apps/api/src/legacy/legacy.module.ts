import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LegacyController } from './legacy.controller';
import { LegacyService } from './legacy.service';

@Module({
  imports: [PrismaModule],
  controllers: [LegacyController],
  providers: [LegacyService],
  exports: [LegacyService],
})
export class LegacyModule {}
