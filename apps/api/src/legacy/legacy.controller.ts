import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LegacyService } from './legacy.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('legacy')
export class LegacyController {
  constructor(private readonly legacyService: LegacyService) {}

  @Get('parking-reports')
  async findAllParkingReports(@Query() query: { dateFrom?: string; dateTo?: string; limit?: string }) {
    return this.legacyService.findAllParkingReports({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('parking-lot-counts')
  async findAllParkingLotCounts(@Query() query: { reportId?: string; limit?: string }) {
    return this.legacyService.findAllParkingLotCounts({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('handheld-checks')
  async findAllHandheldChecks(@Query() query: { dateFrom?: string; dateTo?: string; building?: string; limit?: string }) {
    return this.legacyService.findAllHandheldChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('metal-detector-checks')
  async findAllMetalDetectorChecks(@Query() query: { dateFrom?: string; dateTo?: string; building?: string; limit?: string }) {
    return this.legacyService.findAllMetalDetectorChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('patrol-checks')
  async findAllPatrolChecks(@Query() query: { dateFrom?: string; dateTo?: string; building?: string; limit?: string }) {
    return this.legacyService.findAllPatrolChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('cctv-reports')
  async findAllCctvReports(@Query() query: { dateFrom?: string; dateTo?: string; building?: string; limit?: string }) {
    return this.legacyService.findAllCctvReports({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('cctv-report-details')
  async findAllCctvReportDetails(@Query() query: { reportId?: string; limit?: string }) {
    return this.legacyService.findAllCctvReportDetails({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('cctv-angle-reports')
  async findAllCctvAngleReports(@Query() query: { dateFrom?: string; dateTo?: string; building?: string; limit?: string }) {
    return this.legacyService.findAllCctvAngleReports({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('nvr-recording-reports')
  async findAllNvrRecordingReports(@Query() query: { building?: string; limit?: string }) {
    return this.legacyService.findAllNvrRecordingReports({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('nvr-recording-details')
  async findAllNvrRecordingDetails(@Query() query: { reportId?: string; limit?: string }) {
    return this.legacyService.findAllNvrRecordingDetails({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('nvr-status-reports')
  async findAllNvrStatusReports() {
    return this.legacyService.findAllNvrStatusReports();
  }

  @Get('nvr-status-report-details')
  async findAllNvrStatusReportDetails(@Query() query: { reportId?: string; limit?: string }) {
    return this.legacyService.findAllNvrStatusReportDetails({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }
}
