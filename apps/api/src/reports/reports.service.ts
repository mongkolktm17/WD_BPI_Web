import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { CreateBuildingReportDto } from './dto/create-building-report.dto';
import { UpdateBuildingReportDto } from './dto/update-building-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { type?: string }) {
    const where: any = {};
    if (query?.type) where.reportType = query.type;
    return this.prisma.reportVisual.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const report = await this.prisma.reportVisual.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('ไม่พบข้อมูลรายงาน');
    return report;
  }

  async create(dto: CreateReportDto) {
    return this.prisma.reportVisual.create({
      data: {
        reportType: dto.reportType,
        title: dto.title,
        dataJson: dto.dataJson,
      },
    });
  }

  async update(id: number, dto: UpdateReportDto) {
    await this.findOne(id);
    return this.prisma.reportVisual.update({
      where: { id },
      data: {
        ...(dto.reportType && { reportType: dto.reportType }),
        ...(dto.title && { title: dto.title }),
        ...(dto.dataJson !== undefined && { dataJson: dto.dataJson }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.reportVisual.delete({ where: { id } });
    return { message: 'ลบข้อมูลรายงานเรียบร้อยแล้ว' };
  }

  async getVisualReports() {
    return this.prisma.reportVisual.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBuildingReport() {
    const buildings = await this.prisma.building.findMany({
      include: {
        cameras: true,
        nvrDevices: true,
      },
    });

    return buildings.map((building) => ({
      buildingId: building.id,
      buildingCode: building.buildingCode,
      buildingName: building.buildingName,
      totalCameras: building.cameras.length,
      normalCameras: building.cameras.filter((c) => c.status === 'normal').length,
      abnormalCameras: building.cameras.filter((c) => c.status !== 'normal').length,
      totalNvrs: building.nvrDevices.length,
    }));
  }

  // ─── Building Daily Reports ───────────────────────────────────

  async findAllBuildingReports(query?: { building?: string; dateFrom?: string; dateTo?: string; limit?: number }) {
    const where: any = { isDeleted: false };
    if (query?.building) where.building = query.building;
    if (query?.dateFrom || query?.dateTo) {
      where.reportDate = {};
      if (query.dateFrom) where.reportDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.reportDate.lte = new Date(query.dateTo);
    }
    return this.prisma.buildingReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 200,
    });
  }

  async findOneBuildingReport(id: number) {
    const report = await this.prisma.buildingReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('ไม่พบข้อมูลรายงานอาคาร');
    return report;
  }

  async createBuildingReport(dto: CreateBuildingReportDto) {
    return this.prisma.buildingReport.create({
      data: {
        reportDate: new Date(dto.reportDate),
        employeeId: dto.employeeId,
        fullName: dto.fullName,
        shift: dto.shift,
        building: dto.building,
        guardPost: dto.guardPost,
        reportTime: dto.reportTime,
        incidentReport: dto.incidentReport,
        specialIncident: dto.specialIncident || null,
        emergencyIncident: dto.emergencyIncident || null,
      },
    });
  }

  async updateBuildingReport(id: number, dto: UpdateBuildingReportDto) {
    await this.findOneBuildingReport(id);
    return this.prisma.buildingReport.update({
      where: { id },
      data: {
        ...(dto.reportDate && { reportDate: new Date(dto.reportDate) }),
        ...(dto.employeeId && { employeeId: dto.employeeId }),
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.shift && { shift: dto.shift }),
        ...(dto.building && { building: dto.building }),
        ...(dto.guardPost && { guardPost: dto.guardPost }),
        ...(dto.reportTime && { reportTime: dto.reportTime }),
        ...(dto.incidentReport && { incidentReport: dto.incidentReport }),
        ...(dto.specialIncident !== undefined && { specialIncident: dto.specialIncident || null }),
        ...(dto.emergencyIncident !== undefined && { emergencyIncident: dto.emergencyIncident || null }),
      },
    });
  }

  async removeBuildingReport(id: number) {
    await this.findOneBuildingReport(id);
    await this.prisma.buildingReport.update({ where: { id }, data: { isDeleted: true } });
    return { message: 'ลบข้อมูลรายงานเรียบร้อยแล้ว' };
  }

  // ─── Unified Recent Reports (like legacy UNION ALL) ──────────
  async getAllRecentReports(query?: { type?: string; submitter?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    const type = query?.type || 'all';
    const submitter = query?.submitter || '';
    const dateFrom = query?.dateFrom || '';
    const dateTo = query?.dateTo || '';
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (submitter) {
      conditions.push(`(subq.submitted_by ILIKE $${paramIdx})`);
      params.push(`%${submitter}%`);
      paramIdx++;
    }
    if (dateFrom) {
      conditions.push(`DATE(subq.submission_time) >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`DATE(subq.submission_time) <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const reportQueries: string[] = [];

    if (type === 'all' || type === 'general') {
      reportQueries.push(`
        SELECT id, created_at AS submission_time, 'รายงานทั่วไป' AS report_type, 'general' AS type_key,
          CONCAT('อาคาร: ', building, ', จุด: ', guard_post, ' - ', incident_report) AS details,
          full_name AS submitted_by, 'reports/building-reports' AS api_path
        FROM building_reports WHERE (is_deleted = false OR is_deleted IS NULL)
      `);
    }
    if (type === 'all' || type === 'car_parking') {
      reportQueries.push(`
        SELECT id, created_at AS submission_time, 'ตรวจลานจอดรถ' AS report_type, 'car_parking' AS type_key,
          CONCAT('กะ: ', shift, ', สถานะยางอะไหล่: ', spare_tire_status) AS details,
          inspector_name AS submitted_by, 'parking' AS api_path
        FROM car_parking_reports
        UNION ALL
        SELECT id, created_at AS submission_time, 'ตรวจลานจอดรถ' AS report_type, 'car_parking' AS type_key,
          CONCAT('รถ: ', COALESCE(total_cars::text, '0'), ' | มอไซค์: ', COALESCE(motorcycle_count_1::text, '0'), '/', COALESCE(motorcycle_count_2::text, '0'), '/', COALESCE(motorcycle_count_3::text, '0')) AS details,
          COALESCE(inspector_name, driver_name, '-') AS submitted_by, 'parking' AS api_path
        FROM car_parkings WHERE (is_deleted = false OR is_deleted IS NULL)
      `);
    }
    if (type === 'all' || type === 'cctv_inspection') {
      reportQueries.push(`
        SELECT id, created_at AS submission_time, 'ตรวจห้อง CCTV' AS report_type, 'cctv_inspection' AS type_key,
          CONCAT('ผ่าน: ', total_passed, '/', total_checked, ' | ผิดปกติ: ', total_failed) AS details,
          inspector_name AS submitted_by, 'cctv/inspections' AS api_path
        FROM cctv_inspections WHERE (is_deleted = false OR is_deleted IS NULL)
      `);
    }
    if (type === 'all' || type === 'hand_held') {
      reportQueries.push(`
        SELECT id, created_at AS submission_time, 'ตรวจ Hand Held' AS report_type, 'hand_held' AS type_key,
          CONCAT('อาคาร: ', building, ', จุด: ', guard_post, ', กะ: ', shift) AS details,
          inspector_name AS submitted_by, 'metal-detector/handheld-checks' AS api_path
        FROM hand_held_checks
        UNION ALL
        SELECT hc.id, hc.created_at AS submission_time, 'ตรวจ Hand Held' AS report_type, 'hand_held' AS type_key,
          CONCAT('อุปกรณ์: ', COALESCE(he.device_name, '-'), ', สถานะ: ', hc.status) AS details,
          COALESCE(hc.inspector, '-') AS submitted_by, 'metal-detector/handheld-checks' AS api_path
        FROM handheld_checks hc LEFT JOIN handheld_equipment he ON hc.equipment_id = he.id
        WHERE (hc.is_deleted = false OR hc.is_deleted IS NULL)
      `);
    }
    if (type === 'all' || type === 'patrol') {
      reportQueries.push(`
        SELECT id, created_at AS submission_time, 'Checklist Patrol' AS report_type, 'patrol' AS type_key,
          CONCAT('เส้นทาง: ', patrol_route, ', สถานะ: ', status) AS details,
          officer_name AS submitted_by, 'patrol' AS api_path
        FROM patrol_reports WHERE (is_deleted = false OR is_deleted IS NULL)
      `);
    }
    if (type === 'all' || type === 'guard_count') {
      reportQueries.push(`
        SELECT id, created_at AS submission_time, 'บันทึกจำนวน รปภ.' AS report_type, 'guard_count' AS type_key,
          CONCAT('กะ: ', shift, ', มา: ', present_guards, '/', total_guards) AS details,
          COALESCE(remark, 'N/A') AS submitted_by, 'guards/counts' AS api_path
        FROM guard_counts WHERE (is_deleted = false OR is_deleted IS NULL)
      `);
    }
    if (type === 'all' || type === 'cctv_report') {
      reportQueries.push(`
        SELECT id, report_date AS submission_time, 'NVR Recording' AS report_type, 'cctv_report' AS type_key,
          CONCAT('ปกติ: ', total_normal, ' | ผิดปกติ: ', total_abnormal) AS details,
          reporter_name AS submitted_by, 'cctv/reports' AS api_path
        FROM cctv_reports WHERE (is_deleted = false OR is_deleted IS NULL)
      `);
    }
    if (type === 'all' || type === 'cctv_angle') {
      reportQueries.push(`
        SELECT id, report_date AS submission_time, 'CCTV Angle Check' AS report_type, 'cctv_angle' AS type_key,
          CONCAT('ตึก: ', building, ', NVR: ', nvr, ', Correct: ', correct_cameras, '/', total_cameras) AS details,
          checked_by AS submitted_by, 'cctv/camera-checks' AS api_path
        FROM cctv_angle_reports
        UNION ALL
        SELECT cc.id, cc.check_date AS submission_time, 'CCTV Angle Check' AS report_type, 'cctv_angle' AS type_key,
          CONCAT('กล้อง: ', COALESCE(c.camera_name, c.camera_no, '-'), ', สถานะ: ', cc.status) AS details,
          COALESCE(cc.checked_by, '-') AS submitted_by, 'cctv/camera-checks' AS api_path
        FROM camera_checks cc LEFT JOIN cameras c ON cc.camera_id = c.id
        WHERE (cc.is_deleted = false OR cc.is_deleted IS NULL)
      `);
    }
    if (type === 'all' || type === 'metal_detector') {
      reportQueries.push(`
        SELECT id, created_at AS submission_time, 'ตรวจ Metal Detector' AS report_type, 'metal_detector' AS type_key,
          CONCAT('อาคาร: ', building, ', จุด: ', guard_post, ', ยี่ห้อ: ', scanner_brand) AS details,
          employee_name AS submitted_by, 'metal-detector/walkthrough-checks' AS api_path
        FROM metal_detector_checks
        UNION ALL
        SELECT wc.id, wc.created_at AS submission_time, 'ตรวจ Metal Detector' AS report_type, 'metal_detector' AS type_key,
          CONCAT('เครื่องตรวจ: ', COALESCE(wd.detector_code, wd.location, '-'), ', สถานะ: ', wc.status) AS details,
          COALESCE(wc.inspector, '-') AS submitted_by, 'metal-detector/walkthrough-checks' AS api_path
        FROM walkthrough_checks wc LEFT JOIN walkthrough_detectors wd ON wc.detector_id = wd.id
        WHERE (wc.is_deleted = false OR wc.is_deleted IS NULL)
      `);
    }

    if (reportQueries.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    const unionQuery = reportQueries.map(q => `(${q.trim()})`).join(' UNION ALL ');
    const wrappedQuery = `(${unionQuery}) AS subq`;

    const countQuery = `SELECT COUNT(*) as total FROM ${wrappedQuery} ${whereClause}`;
    const dataQuery = `SELECT * FROM ${wrappedQuery} ${whereClause} ORDER BY submission_time DESC LIMIT ${limit} OFFSET ${offset}`;

    try {
      const [countResult, dataResult] = await Promise.all([
        this.prisma.$queryRawUnsafe<{ total: bigint }[]>(countQuery, ...params),
        this.prisma.$queryRawUnsafe<any[]>(dataQuery, ...params),
      ]);
      const total = Number(countResult[0]?.total || 0);
      const data = dataResult.map((row: any) => ({
        id: Number(row.id),
        submissionTime: row.submission_time,
        reportType: row.report_type,
        typeKey: row.type_key,
        details: row.details,
        submittedBy: row.submitted_by,
        apiPath: row.api_path,
      }));
      return { data, total, page, limit };
    } catch (err: any) {
      // Defensive fallback: return empty with error logged, avoid 500
      console.error('[getAllRecentReports] raw query failed:', err?.message || err);
      // Fallback simple fallback: try building_reports only
      try {
        const fb = await this.prisma.buildingReport.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset });
        return {
          data: fb.map(r => ({ id: r.id, submissionTime: r.createdAt, reportType: 'รายงานทั่วไป', typeKey: 'general', details: r.incidentReport, submittedBy: r.fullName, apiPath: 'reports/building-reports' })),
          total: fb.length,
          page,
          limit,
        };
      } catch {
        return { data: [], total: 0, page, limit };
      }
    }
  }
}
