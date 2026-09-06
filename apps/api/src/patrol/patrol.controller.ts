import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { PatrolService } from './patrol.service';
import { CreatePatrolDto } from './dto/create-patrol.dto';
import { UpdatePatrolDto } from './dto/update-patrol.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission('patrol_checklist:read')
@Controller('patrol')
export class PatrolController {
  constructor(private readonly patrolService: PatrolService) {}

  @RequirePermission('patrol_checklist:read')
  @Get()
  async findAll(@Query() query: { date?: string; status?: string; route?: string; limit?: string }) {
    return this.patrolService.findAll({ ...query, limit: query.limit ? parseInt(query.limit) : undefined });
  }

  @RequirePermission('patrol_checklist:read')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.patrolService.findOne(id);
  }

  @RequirePermission('patrol_checklist:write')
  @Post()
  async create(@Body() dto: CreatePatrolDto) {
    return this.patrolService.create(dto);
  }

  @RequirePermission('patrol_checklist:write')
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatrolDto) {
    return this.patrolService.update(id, dto);
  }

  @RequirePermission('patrol_checklist:delete')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.patrolService.remove(id, req.user?.username);
  }
}
