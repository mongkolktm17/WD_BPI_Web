import { Module } from '@nestjs/common';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
