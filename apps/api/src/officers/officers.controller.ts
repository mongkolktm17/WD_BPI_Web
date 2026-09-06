import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { OfficersService } from './officers.service';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { UpdateOfficerDto } from './dto/update-officer.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission('report_page:read')
@Controller('officers')
export class OfficersController {
  constructor(private readonly officersService: OfficersService) {}

  @RequirePermission('officers:write')
  @Post()
  async create(@Body() dto: CreateOfficerDto) {
    return this.officersService.create(dto);
  }

  @RequirePermission('report_page:read')
  @Get()
  async findAll() {
    return this.officersService.findAll();
  }

  @RequirePermission('report_page:read')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.officersService.findOne(id);
  }

  @RequirePermission('officers:write')
  @Post('import')
  async importOfficers(@Body() dtos: CreateOfficerDto[]) {
    return this.officersService.importOfficers(dtos);
  }

  @RequirePermission('officers:write')
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOfficerDto) {
    return this.officersService.update(id, dto);
  }

  @RequirePermission('officers:delete')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.officersService.remove(id);
  }
}
