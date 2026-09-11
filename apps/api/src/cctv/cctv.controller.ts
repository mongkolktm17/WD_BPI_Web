import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { CctvService } from './cctv.service';
import { CreateCctvReportDto } from './dto/create-cctv-report.dto';
import { UpdateCctvReportDto } from './dto/update-cctv-report.dto';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { CreateCameraCheckDto } from './dto/create-camera-check.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { CreateNvrDeviceDto } from './dto/create-nvr-device.dto';
import { UpdateNvrDeviceDto } from './dto/update-nvr-device.dto';
import { CreateNvrRecordingDto } from './dto/create-nvr-recording.dto';
import { UpdateNvrRecordingDto } from './dto/update-nvr-recording.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('cctv')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class CctvController {
  constructor(private readonly cctvService: CctvService) {}

  // ─── CCTV Configurations & Metadata ──────────────────────────

  @RequirePermission('cctv_report:read')
  @Get('config')
  async getCctvConfig() {
    return this.cctvService.getCctvConfig();
  }

  @RequirePermission('cctv_report:read')
  @Get('latest-report/:building')
  async getLatestBuildingReport(@Param('building') building: string) {
    return this.cctvService.getLatestBuildingReport(building);
  }

  // ─── Image Map (for angle check page) ─────────────────────────

  @RequirePermission('cctv_angle_check:read')
  @Get('image-map')
  async getImageMap(@Query() query: { building?: string; nvr?: string }) {
    return this.cctvService.getImageMap(query);
  }

  // ─── Buildings ────────────────────────────────────────────────

  @RequirePermission('nvr_recording:read')
  @Get('buildings')
  async findAllBuildings() {
    return this.cctvService.findAllBuildings();
  }

  @RequirePermission('nvr_recording:write')
  @Post('buildings')
  async createBuilding(@Body() dto: CreateBuildingDto) {
    return this.cctvService.createBuilding(dto);
  }

  // ─── CCTV Reports ─────────────────────────────────────────────

  @RequirePermission('cctv_report:read')
  @Get('reports')
  async findAllReports(@Query() query: { dateFrom?: string; dateTo?: string }) {
    return this.cctvService.findAllReports(query);
  }

  @RequirePermission('cctv_report:read')
  @Get('reports/matrix')
  async getReportMatrix(@Query() query: { limit?: string }) {
    return this.cctvService.getReportMatrix(query.limit ? parseInt(query.limit) : 20);
  }

  @RequirePermission('cctv_report:read')
  @Get('reports/:id')
  async findOneReport(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneReport(id);
  }

  @RequirePermission('cctv_report:write')
  @Post('reports')
  async createReport(@Body() dto: CreateCctvReportDto) {
    return this.cctvService.createReport(dto);
  }

  @RequirePermission('cctv_report:write')
  @Put('reports/:id')
  async updateReport(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCctvReportDto) {
    return this.cctvService.updateReport(id, dto);
  }

  @RequirePermission('cctv_report:delete')
  @Delete('reports/:id')
  async removeReport(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.cctvService.removeReport(id, req.user?.username);
  }

  // ─── Cameras ──────────────────────────────────────────────────

  @RequirePermission('cctv_angle_check:read')
  @Get('cameras')
  async findAllCameras(@Query() query: { buildingId?: string }) {
    return this.cctvService.findAllCameras(query);
  }

  @RequirePermission('cctv_angle_check:read')
  @Get('cameras/:id')
  async findOneCamera(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneCamera(id);
  }

  @RequirePermission('cctv_angle_check:write')
  @Post('cameras')
  async createCamera(@Body() dto: CreateCameraDto) {
    return this.cctvService.createCamera(dto);
  }

  @RequirePermission('cctv_angle_check:write')
  @Post('cameras/import')
  async importCameras(@Body() dtos: CreateCameraDto[]) {
    return this.cctvService.importCameras(dtos);
  }

  @RequirePermission('cctv_angle_check:write')
  @Put('cameras/:id')
  async updateCamera(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCameraDto) {
    return this.cctvService.updateCamera(id, dto);
  }

  @RequirePermission('cctv_angle_check:delete')
  @Delete('cameras/:id')
  async removeCamera(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeCamera(id);
  }

  // ─── Camera Checks ────────────────────────────────────────────

  @RequirePermission('cctv_angle_check:read')
  @Get('camera-checks/rounds')
  async findAllCameraCheckRounds(@Query() query: { dateFrom?: string; dateTo?: string; limit?: string }) {
    return this.cctvService.findAllCameraCheckRounds({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @RequirePermission('cctv_angle_check:delete')
  @Delete('camera-checks/rounds/:roundKey')
  async removeCameraCheckRound(@Param('roundKey') roundKey: string, @Request() req: any) {
    return this.cctvService.removeCameraCheckRound(roundKey, req.user?.username);
  }

  @RequirePermission('cctv_angle_check:read')
  @Get('camera-checks')
  async findAllCameraChecks(@Query() query: { cameraId?: string; dateFrom?: string; dateTo?: string; limit?: string }) {
    return this.cctvService.findAllCameraChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @RequirePermission('cctv_angle_check:read')
  @Get('camera-checks/:id')
  async findOneCameraCheck(@Param('id', ParseIntPipe) id: number) {
    const angleReport = await this.cctvService.findCctvAngleReportById(id);
    if (angleReport) return angleReport;
    return this.cctvService.findOneCameraCheck(id);
  }

  @RequirePermission('cctv_angle_check:write')
  @Post('camera-checks')
  async createCameraCheck(@Body() dto: CreateCameraCheckDto) {
    return this.cctvService.createCameraCheck(dto);
  }

  @RequirePermission('cctv_angle_check:write')
  @Post('camera-checks/batch')
  async batchCreateCameraChecks(@Body() dtos: CreateCameraCheckDto[]) {
    return this.cctvService.batchCreateCameraChecks(dtos);
  }

  @RequirePermission('cctv_angle_check:write')
  @Post('angle-checks')
  async createAngleCheck(@Body() dto: any) {
    return this.cctvService.createAngleCheck(dto);
  }

  @RequirePermission('cctv_angle_check:delete')
  @Delete('camera-checks/:id')
  async removeCameraCheck(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.cctvService.removeCameraCheck(id, req.user?.username);
  }

  @RequirePermission('cctv_angle_check:write')
  @Put('camera-checks/:id')
  async updateCameraCheck(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.cctvService.updateCameraCheck(id, body);
  }

  // ─── CCTV Inspections ─────────────────────────────────────────

  @RequirePermission('cctv_inspection:read')
  @Get('inspections')
  async findAllInspections(@Query() query: { limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const offset = query.offset ? parseInt(query.offset) : undefined;
    return this.cctvService.findAllInspections(limit, offset);
  }

  @RequirePermission('cctv_inspection:read')
  @Get('inspections/:id')
  async findOneInspection(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneInspection(id);
  }

  @RequirePermission('cctv_inspection:write')
  @Post('inspections')
  async createInspection(@Body() dto: CreateInspectionDto) {
    return this.cctvService.createInspection(dto);
  }

  @RequirePermission('cctv_inspection:write')
  @Put('inspections/:id')
  async updateInspection(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInspectionDto) {
    return this.cctvService.updateInspection(id, dto);
  }

  @RequirePermission('cctv_inspection:delete')
  @Delete('inspections/:id')
  async removeInspection(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.cctvService.removeInspection(id, req.user?.username);
  }

  // ─── NVR Devices ──────────────────────────────────────────────

  @RequirePermission('nvr_recording:read')
  @Get('nvr-devices')
  async findAllNvrDevices(@Query() query: { buildingId?: string }) {
    return this.cctvService.findAllNvrDevices(query);
  }

  @RequirePermission('nvr_recording:read')
  @Get('nvr-devices/:id')
  async findOneNvrDevice(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneNvrDevice(id);
  }

  @RequirePermission('nvr_recording:write')
  @Post('nvr-devices')
  async createNvrDevice(@Body() dto: CreateNvrDeviceDto) {
    return this.cctvService.createNvrDevice(dto);
  }

  @RequirePermission('nvr_recording:write')
  @Put('nvr-devices/:id')
  async updateNvrDevice(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNvrDeviceDto) {
    return this.cctvService.updateNvrDevice(id, dto);
  }

  @RequirePermission('nvr_recording:delete')
  @Delete('nvr-devices/:id')
  async removeNvrDevice(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeNvrDevice(id);
  }

  // ─── NVR Recordings ───────────────────────────────────────────

  @RequirePermission('nvr_recording:read')
  @Get('nvr-recordings/rounds')
  async findAllNvrRecordingRounds(@Query() query: { dateFrom?: string; dateTo?: string; limit?: string }) {
    return this.cctvService.findAllNvrRecordingRounds({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @RequirePermission('nvr_recording:delete')
  @Delete('nvr-recordings/rounds/:roundId')
  async removeNvrRecordingRound(@Param('roundId') roundId: string) {
    return this.cctvService.removeNvrRecordingRound(roundId);
  }

  @RequirePermission('nvr_recording:write')
  @Put('nvr-recordings/rounds/:roundId')
  async updateNvrRecordingRound(@Param('roundId') roundId: string, @Body() body: { days: Record<string, number> }) {
    return this.cctvService.updateNvrRecordingRound(roundId, body.days || {});
  }

  @RequirePermission('nvr_recording:read')
  @Get('nvr-recordings')
  async findAllNvrRecordings(@Query() query: { nvrId?: string; dateFrom?: string; dateTo?: string }) {
    return this.cctvService.findAllNvrRecordings(query);
  }

  @RequirePermission('nvr_recording:read')
  @Get('nvr-recordings/status')
  async getNvrRecordingStatus() {
    return this.cctvService.getNvrRecordingStatus();
  }

  @RequirePermission('nvr_recording:read')
  @Get('nvr-recordings/:id')
  async findOneNvrRecording(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneNvrRecording(id);
  }

  @RequirePermission('nvr_recording:write')
  @Post('nvr-recordings')
  async createNvrRecording(@Body() dto: CreateNvrRecordingDto) {
    return this.cctvService.createNvrRecording(dto);
  }

  @RequirePermission('nvr_recording:write')
  @Post('nvr-recordings/batch')
  async batchCreateNvrRecordings(@Body() dtos: CreateNvrRecordingDto[]) {
    return this.cctvService.batchCreateNvrRecordings(dtos);
  }

  @RequirePermission('nvr_recording:write')
  @Put('nvr-recordings/:id')
  async updateNvrRecording(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNvrRecordingDto) {
    return this.cctvService.updateNvrRecording(id, dto);
  }

  @RequirePermission('nvr_recording:delete')
  @Delete('nvr-recordings/:id')
  async removeNvrRecording(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeNvrRecording(id);
  }
}
