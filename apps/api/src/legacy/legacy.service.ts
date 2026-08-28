import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LegacyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllParkingReports(query?: { dateFrom?: string; dateTo?: string; limit?: number }) {
    const where: any = {};
    if (query?.dateFrom || query?.dateTo) {
      where.inspectionDate = {};
      if (query.dateFrom) where.inspectionDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.inspectionDate.lte = new Date(query.dateTo);
    }
    return this.prisma.carParkingReport.findMany({
      where,
      orderBy: { inspectionDate: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findAllParkingLotCounts(query?: { reportId?: string; limit?: number }) {
    const where: any = {};
    if (query?.reportId) where.reportId = parseInt(query.reportId);
    return this.prisma.parkingLotCount.findMany({
      where,
      orderBy: { id: 'asc' },
      take: query?.limit || 500,
    });
  }

  async findAllHandheldChecks(query?: { dateFrom?: string; dateTo?: string; building?: string; limit?: number }) {
    const where: any = {};
    if (query?.dateFrom || query?.dateTo) {
      where.inspectionDate = {};
      if (query.dateFrom) where.inspectionDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.inspectionDate.lte = new Date(query.dateTo);
    }
    if (query?.building) where.building = query.building;
    return this.prisma.handHeldCheckLegacy.findMany({
      where,
      orderBy: { inspectionDate: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findAllMetalDetectorChecks(query?: { dateFrom?: string; dateTo?: string; building?: string; limit?: number }) {
    const where: any = {};
    if (query?.dateFrom || query?.dateTo) {
      where.inspectionDate = {};
      if (query.dateFrom) where.inspectionDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.inspectionDate.lte = new Date(query.dateTo);
    }
    if (query?.building) where.building = query.building;
    return this.prisma.metalDetectorCheckLegacy.findMany({
      where,
      orderBy: { inspectionDate: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findAllPatrolChecks(query?: { dateFrom?: string; dateTo?: string; building?: string; limit?: number }) {
    const where: any = {};
    if (query?.dateFrom || query?.dateTo) {
      where.inspectionDate = {};
      if (query.dateFrom) where.inspectionDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.inspectionDate.lte = new Date(query.dateTo);
    }
    if (query?.building) where.building = query.building;
    return this.prisma.patrolCheckLegacy.findMany({
      where,
      orderBy: { inspectionDate: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findAllCctvReports(query?: { dateFrom?: string; dateTo?: string; building?: string; limit?: number }) {
    const where: any = {};
    if (query?.dateFrom || query?.dateTo) {
      where.reportDate = {};
      if (query.dateFrom) where.reportDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.reportDate.lte = new Date(query.dateTo);
    }
    if (query?.building) where.building = query.building;
    return this.prisma.cctvReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findAllCctvReportDetails(query?: { reportId?: string; limit?: number }) {
    const where: any = {};
    if (query?.reportId) where.reportId = parseInt(query.reportId);
    return this.prisma.cctvReportDetail.findMany({
      where,
      orderBy: { id: 'asc' },
      take: query?.limit || 500,
    });
  }

  async findAllCctvAngleReports(query?: { dateFrom?: string; dateTo?: string; building?: string; limit?: number }) {
    const where: any = {};
    if (query?.dateFrom || query?.dateTo) {
      where.reportDate = {};
      if (query.dateFrom) where.reportDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.reportDate.lte = new Date(query.dateTo);
    }
    if (query?.building) where.building = query.building;
    return this.prisma.cctvAngleReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findAllNvrRecordingReports(query?: { building?: string; limit?: number }) {
    const where: any = {};
    if (query?.building) where.building = query.building;
    return this.prisma.nvrRecordingReport.findMany({
      where,
      orderBy: { reportTime: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findAllNvrRecordingDetails(query?: { reportId?: string; limit?: number }) {
    const where: any = {};
    if (query?.reportId) where.reportId = parseInt(query.reportId);
    return this.prisma.nvrRecordingDetail.findMany({
      where,
      orderBy: { id: 'asc' },
      take: query?.limit || 500,
    });
  }

  async findAllNvrStatusReports() {
    return this.prisma.nvrStatusReport.findMany({
      orderBy: { reportTime: 'desc' },
    });
  }

  async findAllNvrStatusReportDetails(query?: { reportId?: string; limit?: number }) {
    const where: any = {};
    if (query?.reportId) where.reportId = parseInt(query.reportId);
    return this.prisma.nvrStatusReportDetail.findMany({
      where,
      orderBy: { id: 'asc' },
      take: query?.limit || 500,
    });
  }
}
