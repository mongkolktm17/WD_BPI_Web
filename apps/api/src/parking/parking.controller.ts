import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { CreateParkingDto } from './dto/create-parking.dto';
import { CreateParkingBatchDto } from './dto/create-parking-batch.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get()
  async findAll(@Query() query: { date?: string; status?: string; limit?: string }) {
    return this.parkingService.findAll({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get('status/summary')
  async getStatusSummary() {
    return this.parkingService.getStatusSummary();
  }

  @Get('history')
  async getHistory(@Query() query: { limit?: string; offset?: string }) {
    const rawLimit = query.limit ? parseInt(query.limit) : 20;
    const rawOffset = query.offset ? parseInt(query.offset) : 0;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 20;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
    return this.parkingService.getHistory(limit, offset);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parkingService.findOne(id);
  }

  @Post('batch')
  async createBatch(@Body() dto: CreateParkingBatchDto) {
    return this.parkingService.createBatch(dto);
  }

  @Post()
  async create(@Body() dto: CreateParkingDto) {
    return this.parkingService.create(dto);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateParkingDto) {
    return this.parkingService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.parkingService.remove(id, req.user?.username);
  }
}
