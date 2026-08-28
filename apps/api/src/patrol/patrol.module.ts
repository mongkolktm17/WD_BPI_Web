import { Module } from '@nestjs/common';
import { PatrolService } from './patrol.service';
import { PatrolController } from './patrol.controller';

@Module({
  controllers: [PatrolController],
  providers: [PatrolService],
  exports: [PatrolService],
})
export class PatrolModule {}
