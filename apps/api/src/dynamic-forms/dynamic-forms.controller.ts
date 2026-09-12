import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  DynamicFormsService,
  CreateTemplateDto,
  UpdateTemplateDto,
  SubmitFormDto,
} from './dynamic-forms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('dynamic-forms')
@UseGuards(JwtAuthGuard)
export class DynamicFormsController {
  constructor(private readonly formsService: DynamicFormsService) {}

  // 1. Form Templates
  @Get('templates')
  async listTemplates(
    @Query('site_id') siteId?: string,
    @Query('category') category?: string,
    @Query('is_published') isPublished?: string,
  ) {
    return this.formsService.listTemplates({
      siteId: siteId ? Number(siteId) : undefined,
      category,
      isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
    });
  }

  @Get('templates/:id')
  async getTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.getTemplate(id);
  }

  @Post('templates')
  async createTemplate(@Body() body: CreateTemplateDto, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const data = await this.formsService.createTemplate(body, userId);
    return { success: true, data, message: 'สร้างแบบฟอร์มใหม่เรียบร้อยแล้ว' };
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateTemplateDto) {
    const data = await this.formsService.updateTemplate(id, body);
    return { success: true, data, message: 'บันทึกการแก้ไขแบบฟอร์มเรียบร้อยแล้ว' };
  }

  @Post('templates/:id/clone')
  async cloneTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { targetSiteId: number; title?: string; newCode?: string },
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const data = await this.formsService.cloneTemplate(
      id,
      Number(body.targetSiteId),
      body.title,
      body.newCode,
      userId,
    );
    return {
      success: true,
      data,
      message: `คัดลอกแบบฟอร์มสำเร็จ! สามารถแก้ไขเพิ่มเติมสำหรับ ${data.site?.name || 'สาขาเป้าหมาย'} ได้ทันที`,
    };
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    const data = await this.formsService.deleteTemplate(id);
    return { success: true, data, message: 'ลบแบบฟอร์มเรียบร้อยแล้ว' };
  }

  // 2. Form Submissions
  @Post('submissions')
  async submitForm(@Body() body: SubmitFormDto, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id || 1;
    const data = await this.formsService.submitForm(body, userId);
    return { success: true, data, message: 'ส่งแบบฟอร์มเรียบร้อยแล้ว' };
  }

  @Get('submissions')
  async listSubmissions(
    @Query('site_id') siteId?: string,
    @Query('template_id') templateId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.formsService.listSubmissions({
      siteId: siteId ? Number(siteId) : undefined,
      templateId: templateId ? Number(templateId) : undefined,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return { success: true, ...data };
  }

  @Get('submissions/:id')
  async getSubmission(@Param('id', ParseIntPipe) id: number) {
    const data = await this.formsService.getSubmission(id);
    return { success: true, data };
  }

  @Put('submissions/:id/status')
  async updateSubmissionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'approved' | 'rejected'; notes?: string },
    @Request() req: any,
  ) {
    const approverId = req.user?.sub || req.user?.id || 1;
    const data = await this.formsService.updateSubmissionStatus(
      id,
      body.status,
      approverId,
      body.notes,
    );
    return {
      success: true,
      data,
      message: body.status === 'approved' ? 'อนุมัติรายงานเรียบร้อยแล้ว' : 'ปฏิเสธรายงานเรียบร้อยแล้ว',
    };
  }
}
