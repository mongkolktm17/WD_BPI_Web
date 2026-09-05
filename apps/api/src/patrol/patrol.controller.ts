import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { PatrolService } from './patrol.service';
import { CreatePatrolDto } from './dto/create-patrol.dto';
import { UpdatePatrolDto } from './dto/update-patrol.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('patrol')
export class PatrolController {
  constructor(private readonly patrolService: PatrolService) {}

  @Get()
  async findAll(@Query() query: { date?: string; status?: string; route?: string; limit?: string }) {
    return this.patrolService.findAll({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.patrolService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePatrolDto) {
    return this.patrolService.create(dto);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatrolDto) {
    return this.patrolService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.patrolService.remove(id, req.user?.username);
  }
}
