import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
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

@UseGuards(AuthGuard('jwt'))
@Controller('metal-detector')
export class MetalDetectorController {
  constructor(private readonly metalDetectorService: MetalDetectorService) {}

  @Get()
  async findAll() {
    return this.metalDetectorService.findAll();
  }

  @Get('handheld')
  async findAllHandheld() {
    return this.metalDetectorService.findAllHandheld();
  }

  @Get('handheld/status')
  async getHandheldStatus() {
    return this.metalDetectorService.getHandheldStatus();
  }

  @Get('handheld-checks')
  async findAllHandheldChecks(@Query() query: { equipmentId?: string; date?: string; limit?: string }) {
    return this.metalDetectorService.findAllHandheldChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('walkthrough')
  async findAllWalkthrough() {
    return this.metalDetectorService.findAllWalkthrough();
  }

  @Get('walkthrough/status')
  async getWalkthroughStatus() {
    return this.metalDetectorService.getWalkthroughStatus();
  }

  @Get('walkthrough-checks')
  async findAllWalkthroughChecks(@Query() query: { detectorId?: string; date?: string; limit?: string }) {
    return this.metalDetectorService.findAllWalkthroughChecks({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOne(id);
  }

  @Get('handheld/:id')
  async findOneHandheld(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOneHandheld(id);
  }

  @Get('walkthrough/:id')
  async findOneWalkthrough(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOneWalkthrough(id);
  }

  @Post()
  async create(@Body() dto: CreateMetalDetectorDto) {
    return this.metalDetectorService.create(dto);
  }

  @Post('handheld')
  async createHandheld(@Body() dto: CreateHandheldDto) {
    return this.metalDetectorService.createHandheld(dto);
  }

  @Post('handheld-checks')
  async createHandheldCheck(@Body() dto: CreateHandheldCheckDto) {
    return this.metalDetectorService.createHandheldCheck(dto);
  }

  @Post('walkthrough')
  async createWalkthrough(@Body() dto: CreateWalkthroughDto) {
    return this.metalDetectorService.createWalkthrough(dto);
  }

  @Post('walkthrough-checks')
  async createWalkthroughCheck(@Body() dto: CreateWalkthroughCheckDto) {
    return this.metalDetectorService.createWalkthroughCheck(dto);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMetalDetectorDto) {
    return this.metalDetectorService.update(id, dto);
  }

  @Put('handheld/:id')
  async updateHandheld(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHandheldDto) {
    return this.metalDetectorService.updateHandheld(id, dto);
  }

  @Put('walkthrough/:id')
  async updateWalkthrough(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWalkthroughDto) {
    return this.metalDetectorService.updateWalkthrough(id, dto);
  }

  @Put('handheld-checks/:id')
  async updateHandheldCheck(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.metalDetectorService.updateHandheldCheck(id, body);
  }

  @Put('walkthrough-checks/:id')
  async updateWalkthroughCheck(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.metalDetectorService.updateWalkthroughCheck(id, body);
  }

  @Get('handheld-checks/:id')
  async findOneHandheldCheck(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOneHandheldCheck(id);
  }

  @Get('walkthrough-checks/:id')
  async findOneWalkthroughCheck(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.findOneWalkthroughCheck(id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.remove(id);
  }

  @Delete('handheld-checks/:id')
  async removeHandheldCheck(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.removeHandheldCheck(id);
  }

  @Delete('walkthrough-checks/:id')
  async removeWalkthroughCheck(@Param('id', ParseIntPipe) id: number) {
    return this.metalDetectorService.removeWalkthroughCheck(id);
  }
}
