import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTemplateDto {
  code: string;
  title: string;
  description?: string;
  category: string;
  siteId?: number | null;
  schemaJson: any;
  allowedRoles?: string[];
  isPublished?: boolean;
}

export interface UpdateTemplateDto {
  title?: string;
  description?: string;
  category?: string;
  siteId?: number | null;
  schemaJson?: any;
  allowedRoles?: string[];
  isPublished?: boolean;
}

export interface SubmitFormDto {
  templateId: number;
  siteId: number;
  dataJson: any;
  attachmentsJson?: any;
  notes?: string;
}

@Injectable()
export class DynamicFormsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(filters?: { siteId?: number; category?: string; isPublished?: boolean }) {
    const where: any = {};

    if (filters?.siteId !== undefined && filters?.siteId !== null) {
      where.OR = [
        { siteId: null }, // Global templates
        { siteId: filters.siteId },
      ];
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }

    return this.prisma.formTemplate.findMany({
      where,
      include: {
        site: {
          select: { id: true, code: true, name: true },
        },
        clonedFrom: {
          select: { id: true, title: true, code: true },
        },
        _count: {
          select: { submissions: true, clones: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTemplate(id: number) {
    const template = await this.prisma.formTemplate.findUnique({
      where: { id },
      include: {
        site: true,
        clonedFrom: {
          select: { id: true, title: true, code: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`ไม่พบแบบฟอร์มรหัส ${id}`);
    }

    return template;
  }

  async createTemplate(dto: CreateTemplateDto, userId?: number) {
    const existing = await this.prisma.formTemplate.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`รหัสแบบฟอร์ม '${dto.code}' มีอยู่ในระบบแล้ว`);
    }

    return this.prisma.formTemplate.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description || null,
        category: dto.category,
        siteId: dto.siteId || null,
        schemaJson: dto.schemaJson,
        allowedRoles: dto.allowedRoles || [],
        isPublished: dto.isPublished ?? false,
        createdById: userId || null,
      },
      include: {
        site: true,
      },
    });
  }

  async updateTemplate(id: number, dto: UpdateTemplateDto) {
    const template = await this.prisma.formTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException(`ไม่พบแบบฟอร์มรหัส ${id}`);

    return this.prisma.formTemplate.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.siteId !== undefined && { siteId: dto.siteId }),
        ...(dto.schemaJson !== undefined && { schemaJson: dto.schemaJson, version: template.version + 1 }),
        ...(dto.allowedRoles !== undefined && { allowedRoles: dto.allowedRoles }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: {
        site: true,
      },
    });
  }

  async cloneTemplate(id: number, targetSiteId: number, title?: string, newCode?: string, userId?: number) {
    const source = await this.prisma.formTemplate.findUnique({ where: { id } });
    if (!source) throw new NotFoundException(`ไม่พบแบบฟอร์มต้นแบบรหัส ${id}`);

    const targetSite = await this.prisma.site.findUnique({ where: { id: targetSiteId } });
    if (!targetSite) throw new NotFoundException(`ไม่พบสาขาเป้าหมายรหัส ${targetSiteId}`);

    const timestamp = Date.now().toString().slice(-4);
    const code = newCode || `${source.code}_${targetSite.code}_${timestamp}`;
    const cloneTitle = title || `${source.title} (${targetSite.name})`;

    return this.prisma.formTemplate.create({
      data: {
        code,
        title: cloneTitle,
        description: source.description ? `คัดลอกจาก: ${source.title}. ${source.description}` : `คัดลอกจาก ${source.title}`,
        category: source.category,
        siteId: targetSiteId,
        clonedFromId: source.id,
        version: 1,
        isPublished: false, // New clone starts as draft
        allowedRoles: source.allowedRoles as any,
        schemaJson: source.schemaJson as any,
        createdById: userId || null,
      },
      include: {
        site: true,
        clonedFrom: true,
      },
    });
  }

  async deleteTemplate(id: number) {
    const template = await this.prisma.formTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException(`ไม่พบแบบฟอร์มรหัส ${id}`);

    // If it has submissions, prevent hard delete or unpublish
    const subCount = await this.prisma.formSubmission.count({ where: { templateId: id } });
    if (subCount > 0) {
      return this.prisma.formTemplate.update({
        where: { id },
        data: { isPublished: false },
      });
    }

    return this.prisma.formTemplate.delete({ where: { id } });
  }

  async submitForm(dto: SubmitFormDto, userId: number) {
    const template = await this.prisma.formTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) throw new NotFoundException(`ไม่พบแบบฟอร์มรหัส ${dto.templateId}`);

    return this.prisma.formSubmission.create({
      data: {
        templateId: dto.templateId,
        templateVersion: template.version,
        siteId: dto.siteId,
        submittedById: userId,
        status: 'submitted',
        dataJson: dto.dataJson,
        attachmentsJson: dto.attachmentsJson || null,
        notes: dto.notes || null,
      },
      include: {
        template: {
          select: { id: true, code: true, title: true, category: true },
        },
        site: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  async listSubmissions(query?: {
    siteId?: number;
    templateId?: number;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.siteId) where.siteId = Number(query.siteId);
    if (query?.templateId) where.templateId = Number(query.templateId);
    if (query?.status) where.status = query.status;

    const [total, items] = await Promise.all([
      this.prisma.formSubmission.count({ where }),
      this.prisma.formSubmission.findMany({
        where,
        skip,
        take: limit,
        include: {
          template: {
            select: { id: true, code: true, title: true, category: true },
          },
          site: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSubmission(id: number) {
    const item = await this.prisma.formSubmission.findUnique({
      where: { id },
      include: {
        template: true,
        site: true,
      },
    });
    if (!item) throw new NotFoundException(`ไม่พบรายการส่งแบบฟอร์มรหัส ${id}`);
    return item;
  }

  async updateSubmissionStatus(id: number, status: string, approverId: number, notes?: string) {
    const item = await this.prisma.formSubmission.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`ไม่พบรายการส่งแบบฟอร์มรหัส ${id}`);

    return this.prisma.formSubmission.update({
      where: { id },
      data: {
        status,
        approvedById: approverId,
        approvedAt: new Date(),
        ...(notes !== undefined && { notes }),
      },
    });
  }
}
