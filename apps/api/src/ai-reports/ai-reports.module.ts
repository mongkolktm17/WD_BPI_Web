import { Module } from '@nestjs/common';
import { AiReportsController } from './ai-reports.controller';
import { AiReportsService } from './ai-reports.service';
import { AiAggregatorService } from './ai-aggregator.service';
import { AiRetrieverService } from './ai-retriever.service';
import { AiGeneratorService } from './ai-generator.service';

@Module({
  controllers: [AiReportsController],
  providers: [
    AiReportsService,
    AiAggregatorService,
    AiRetrieverService,
    AiGeneratorService,
  ],
  exports: [AiReportsService],
})
export class AiReportsModule {}
