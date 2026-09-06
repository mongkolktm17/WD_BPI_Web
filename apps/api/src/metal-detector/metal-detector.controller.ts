import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { MetalDetectorService } from './metal-detector.service';
import { CreateHandheldDto } from './dto/create-handheld.dto';
import { UpdateHandheldDto } from './dto/update-handheld.dto';
import { CreateHandheldCheckDto } from './dto/create-handheld-check.dto';
import { CreateWalkthroughDto } from './dto/create-walkthrough.dto';
import { UpdateWalkthroughDto } from './dto/update-walkthrough.dto';
import { CreateWalkthroughCheckDto } from './dto/create-walkthrough-check.dto';
import { CreateMetalDetectorDto } from './dto/create-metal-detector.dto';
import { UpdateMetalDetectorDto } from './dto/update-metal-detector.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('metal-detector')
export class MetalDetectorController {
  constructor(private readonly metalDetectorService: MetalDetectorService) {}

  @RequirePermission('metal_detector:read')
  @Get()
  async findAll() {
    return this.metalDetectorService.findAll();
  }

  @RequirePermission('metal_detector:read')
  @Get('handheld')
  async findAllHandheld() {
    return this.metalDetectorService.findAllHandheld();
  }

  @RequirePermission('metal_detector:read')
  @Get('handheld/status')
  async getHandheldStatus() {
    return this.metalDetectorService.getHandheldStatus();
  }

  @RequirePermission('metal_detector:read')
  @Get('handheld-checks')
  async findAllHandheldChecks(@Query() query: { equipmentId?: string; date?: string; limit?: string }) {
    return this.metalDetectorService.findAllHandheldChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @RequirePermission('walkthrough_detector:read')
  @Get('walkthrough')
  async findAllWalkthrough() {
    return this.metalDetectorService.findAllWalkthrough();
  }

  @RequirePermission('walkthrough_detector:read')
  @Get('walkthrough/status')
  async getWalkthroughStatus() {
    return this.metalDetectorService.getWalkthroughStatus();
  }

  @RequirePermission('walkthrough_detector:read')
  @Get('walkthrough-checks')
  async findAllWalkthroughChecks(@Query() query: { detectorId?: string; date?: string; limit?: string }) {
    return this.metalDetectorService.findAllWalkthroughChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @RequirePermission('metal_detector:read')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOne(id);
  }

  @RequirePermission('metal_detector:read')
  @Get('handheld/:id')
  async findOneHandheld(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOneHandheld(id);
  }

  @RequirePermission('walkthrough_detector:read')
  @Get('walkthrough/:id')
  async findOneWalkthrough(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOneWalkthrough(id);
  }

  @RequirePermission('metal_detector:write')
  @Post()
  async create(@Body() dto: CreateMetalDetectorDto) {
    return this.metalDetectorService.create(dto);
  }

  @RequirePermission('metal_detector:write')
  @Post('handheld')
  async createHandheld(@Body() dto: CreateHandheldDto) {
    return this.metalDetectorService.createHandheld(dto);
  }

  @RequirePermission('metal_detector:write')
  @Post('handheld-checks')
  async createHandheldCheck(@Body() dto: CreateHandheldCheckDto) {
    return this.metalDetectorService.createHandheldCheck(dto);
  }

  @RequirePermission('walkthrough_detector:write')
  @Post('walkthrough')
  async createWalkthrough(@Body() dto: CreateWalkthroughDto) {
    return this.metalDetectorService.createWalkthrough(dto);
  }

  @RequirePermission('walkthrough_detector:write')
  @Post('walkthrough-checks')
  async createWalkthroughCheck(@Body() dto: CreateWalkthroughCheckDto) {
    return this.metalDetectorService.createWalkthroughCheck(dto);
  }

  @RequirePermission('metal_detector:write')
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMetalDetectorDto) {
    return this.metalDetectorService.update(id, dto);
  }

  @RequirePermission('metal_detector:write')
  @Put('handheld/:id')
  async updateHandheld(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHandheldDto) {
    return this.metalDetectorService.updateHandheld(id, dto);
  }

  @RequirePermission('walkthrough_detector:write')
  @Put('walkthrough/:id')
  async updateWalkthrough(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWalkthroughDto) {
    return this.metalDetectorService.updateWalkthrough(id, dto);
  }

  @RequirePermission('metal_detector:write')
  @Put('handheld-checks/:id')
  async updateHandheldCheck(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.metalDetectorService.updateHandheldCheck(id, body);
  }

  @RequirePermission('walkthrough_detector:write')
  @Put('walkthrough-checks/:id')
  async updateWalkthroughCheck(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.metalDetectorService.updateWalkthroughCheck(id, body);
  }

  @RequirePermission('metal_detector:read')
  @Get('handheld-checks/:id')
  async findOneHandheldCheck(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOneHandheldCheck(id);
  }

  @RequirePermission('walkthrough_detector:read')
  @Get('walkthrough-checks/:id')
  async findOneWalkthroughCheck(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOneWalkthroughCheck(id);
  }

  @RequirePermission('metal_detector:delete')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.remove(id);
  }

  @RequirePermission('metal_detector:delete')
  @Delete('handheld-checks/:id')
  async removeHandheldCheck(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.metalDetectorService.removeHandheldCheck(id, req.user?.username);
  }

  @RequirePermission('walkthrough_detector:delete')
  @Delete('walkthrough-checks/:id')
  async removeWalkthroughCheck(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.metalDetectorService.removeWalkthroughCheck(id, req.user?.username);
  }
}
