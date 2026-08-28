import { Module } from '@nestjs/common';
import { MetalDetectorService } from './metal-detector.service';
import { MetalDetectorController } from './metal-detector.controller';

@Module({
  controllers: [MetalDetectorController],
  providers: [MetalDetectorService],
  exports: [MetalDetectorService],
})
export class MetalDetectorModule {}
