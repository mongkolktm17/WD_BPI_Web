import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
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

@Controller('cctv')
export class CctvController {
  constructor(private readonly cctvService: CctvService) {}

  // ─── CCTV Configurations & Metadata ──────────────────────────

  @Get('config')
  async getCctvConfig() {
    return this.cctvService.getCctvConfig();
  }

  @Get('latest-report/:building')
  async getLatestBuildingReport(@Param('building') building: string) {
    return this.cctvService.getLatestBuildingReport(building);
  }

  // ─── Image Map (for angle check page) ─────────────────────────

  @Get('image-map')
  async getImageMap(@Query() query: { building?: string; nvr?: string }) {
    return this.cctvService.getImageMap(query);
  }

  // ─── Buildings ────────────────────────────────────────────────

  @Get('buildings')
  async findAllBuildings() {
    return this.cctvService.findAllBuildings();
  }

  @Post('buildings')
  async createBuilding(@Body() dto: CreateBuildingDto) {
    return this.cctvService.createBuilding(dto);
  }

  // ─── CCTV Reports ─────────────────────────────────────────────

  @Get('reports')
  async findAllReports(@Query() query: { dateFrom?: string; dateTo?: string }) {
    return this.cctvService.findAllReports(query);
  }

  @Get('reports/matrix')
  async getReportMatrix(@Query() query: { limit?: string }) {
    return this.cctvService.getReportMatrix(query.limit ? parseInt(query.limit) : 20);
  }

  @Get('reports/:id')
  async findOneReport(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneReport(id);
  }

  @Post('reports')
  async createReport(@Body() dto: CreateCctvReportDto) {
    return this.cctvService.createReport(dto);
  }

  @Put('reports/:id')
  async updateReport(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCctvReportDto) {
    return this.cctvService.updateReport(id, dto);
  }

  @Delete('reports/:id')
  async removeReport(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeReport(id);
  }

  // ─── Cameras ──────────────────────────────────────────────────

  @Get('cameras')
  async findAllCameras(@Query() query: { buildingId?: string }) {
    return this.cctvService.findAllCameras(query);
  }

  @Get('cameras/:id')
  async findOneCamera(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneCamera(id);
  }

  @Post('cameras')
  async createCamera(@Body() dto: CreateCameraDto) {
    return this.cctvService.createCamera(dto);
  }

  @Put('cameras/:id')
  async updateCamera(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCameraDto) {
    return this.cctvService.updateCamera(id, dto);
  }

  @Delete('cameras/:id')
  async removeCamera(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeCamera(id);
  }

  // ─── Camera Checks ────────────────────────────────────────────

  @Get('camera-checks')
  async findAllCameraChecks(@Query() query: { cameraId?: string; dateFrom?: string; dateTo?: string; limit?: string }) {
    return this.cctvService.findAllCameraChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('camera-checks/:id')
  async findOneCameraCheck(@Param('id', ParseIntPipe) id: number) {
    const angleReport = await this.cctvService.findCctvAngleReportById(id);
    if (angleReport) return angleReport;
    return this.cctvService.findOneCameraCheck(id);
  }

  @Post('camera-checks')
  async createCameraCheck(@Body() dto: CreateCameraCheckDto) {
    return this.cctvService.createCameraCheck(dto);
  }

  @Post('camera-checks/batch')
  async batchCreateCameraChecks(@Body() dtos: CreateCameraCheckDto[]) {
    return this.cctvService.batchCreateCameraChecks(dtos);
  }

  @Post('angle-checks')
  async createAngleCheck(@Body() dto: any) {
    return this.cctvService.createAngleCheck(dto);
  }

  @Delete('camera-checks/:id')
  async removeCameraCheck(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeCameraCheck(id);
  }

  @Put('camera-checks/:id')
  async updateCameraCheck(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.cctvService.updateCameraCheck(id, body);
  }

  // ─── CCTV Inspections ─────────────────────────────────────────

  @Get('inspections')
  async findAllInspections(@Query() query: { limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const offset = query.offset ? parseInt(query.offset) : undefined;
    return this.cctvService.findAllInspections(limit, offset);
  }

  @Get('inspections/:id')
  async findOneInspection(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneInspection(id);
  }

  @Post('inspections')
  async createInspection(@Body() dto: CreateInspectionDto) {
    return this.cctvService.createInspection(dto);
  }

  @Put('inspections/:id')
  async updateInspection(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInspectionDto) {
    return this.cctvService.updateInspection(id, dto);
  }

  @Delete('inspections/:id')
  async removeInspection(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeInspection(id);
  }

  // ─── NVR Devices ──────────────────────────────────────────────

  @Get('nvr-devices')
  async findAllNvrDevices(@Query() query: { buildingId?: string }) {
    return this.cctvService.findAllNvrDevices(query);
  }

  @Get('nvr-devices/:id')
  async findOneNvrDevice(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneNvrDevice(id);
  }

  @Post('nvr-devices')
  async createNvrDevice(@Body() dto: CreateNvrDeviceDto) {
    return this.cctvService.createNvrDevice(dto);
  }

  @Put('nvr-devices/:id')
  async updateNvrDevice(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNvrDeviceDto) {
    return this.cctvService.updateNvrDevice(id, dto);
  }

  @Delete('nvr-devices/:id')
  async removeNvrDevice(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeNvrDevice(id);
  }

  // ─── NVR Recordings ───────────────────────────────────────────

  @Get('nvr-recordings')
  async findAllNvrRecordings(@Query() query: { nvrId?: string; dateFrom?: string; dateTo?: string }) {
    return this.cctvService.findAllNvrRecordings(query);
  }

  @Get('nvr-recordings/status')
  async getNvrRecordingStatus() {
    return this.cctvService.getNvrRecordingStatus();
  }

  @Get('nvr-recordings/:id')
  async findOneNvrRecording(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.findOneNvrRecording(id);
  }

  @Post('nvr-recordings')
  async createNvrRecording(@Body() dto: CreateNvrRecordingDto) {
    return this.cctvService.createNvrRecording(dto);
  }

  @Post('nvr-recordings/batch')
  async batchCreateNvrRecordings(@Body() dtos: CreateNvrRecordingDto[]) {
    return this.cctvService.batchCreateNvrRecordings(dtos);
  }

  @Put('nvr-recordings/:id')
  async updateNvrRecording(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNvrRecordingDto) {
    return this.cctvService.updateNvrRecording(id, dto);
  }

  @Delete('nvr-recordings/:id')
  async removeNvrRecording(@Param('id', ParseIntPipe) id: number) {
    return this.cctvService.removeNvrRecording(id);
  }
}
