import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  AiReportsService,
  GenerateReportDto,
  ApproveReportDto,
  FeedbackReportDto,
  UpdateSettingsDto,
} from './ai-reports.service';

@Controller('ai-reports')
export class AiReportsController {
  constructor(private readonly reportsService: AiReportsService) {}

  @Post('generate')
  async generateReport(@Body() dto: GenerateReportDto) {
    return this.reportsService.generateReport(dto);
  }

  @Get('latest')
  async getLatestReport(
    @Query('type') type?: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    @Query('tenantId') tenantId?: string,
  ) {
    return this.reportsService.getLatestReport(type, tenantId);
  }

  @Post(':id/approve')
  async approveReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveReportDto,
    @Req() req: any,
  ) {
    const user = req.user?.fullName || req.user?.username || 'Security Administrator';
    return this.reportsService.approveReport(id, dto, user);
  }

  @Post(':id/feedback')
  async submitFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FeedbackReportDto,
  ) {
    return this.reportsService.submitFeedback(id, dto);
  }

  @Get('settings')
  async getSettings() {
    return this.reportsService.getSettings();
  }

  @Get('live-models')
  async getLiveModels(
    @Query('provider') provider: string = 'gemini',
    @Query('apiKey') apiKey?: string,
  ) {
    return this.reportsService.getLiveModels(provider, apiKey);
  }

  @Post('test-connection')
  async testConnection(
    @Body() dto: { provider: string; apiKey?: string; model?: string },
  ) {
    return this.reportsService.testConnection(dto.provider, dto.apiKey, dto.model);
  }

  @Post('settings')
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.reportsService.updateSettings(dto);
  }

  @Get('context')
  async getContextList(@Query('tenantId') tenantId?: string) {
    return this.reportsService.getContextList(tenantId);
  }

  @Post('context')
  async saveContextItem(
    @Body()
    dto: {
      id?: number;
      category: string;
      title?: string;
      content: string;
      isActive?: boolean;
      tenantId?: string;
    },
  ) {
    return this.reportsService.saveContextItem(dto);
  }

  @Delete('context/:id')
  async deleteContextItem(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.deleteContextItem(id);
  }
}
