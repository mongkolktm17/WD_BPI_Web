import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { RadioService } from './radio.service';
import { CreateRadioInspectionDto } from './dto/create-radio-inspection.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('radio')
export class RadioController {
  constructor(private readonly radioService: RadioService) {}

  @RequirePermission('radio_inspection:read')
  @Get('equipments')
  async findAllEquipment(@Query() query: { q?: string; brand?: string; limit?: string }) {
    return this.radioService.findAllEquipment({
      ...query,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  }

  @RequirePermission('radio_inspection:read')
  @Get('equipments/brands')
  async equipmentBrands() {
    return this.radioService.equipmentBrands();
  }

  @RequirePermission('radio_inspection:write')
  @Post('equipments')
  async createEquipment(@Body() body: any) {
    return this.radioService.createEquipment(body);
  }

  @RequirePermission('radio_inspection:read')
  @Get('inspections')
  async findAllInspections(@Query() query: { dateFrom?: string; dateTo?: string; limit?: string }) {
    return this.radioService.findAllInspections({
      ...query,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  }

  @RequirePermission('radio_inspection:read')
  @Get('inspections/:id')
  async findOneInspection(@Param('id', ParseIntPipe) id: number) {
    return this.radioService.findOneInspection(id);
  }

  @RequirePermission('radio_inspection:write')
  @Post('inspections')
  async createInspection(@Body() dto: CreateRadioInspectionDto, @Request() req: any) {
    return this.radioService.createInspection(dto, req.user?.sub ?? req.user?.id);
  }

  @RequirePermission('radio_inspection:write')
  @Put('inspections/:id')
  async updateInspection(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateRadioInspectionDto, @Request() req: any) {
    return this.radioService.updateInspection(id, dto, req.user?.username);
  }

  @RequirePermission('radio_inspection:delete')
  @Delete('inspections/:id')
  async removeInspection(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.radioService.removeInspection(id, req.user?.username);
  }
}
