import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://wdbpi_user:wdbpi_pass@127.0.0.1:5432/wdbpi_db?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const LEGACY_SCHEMA = 'legacy';
const BATCH_SIZE = 500;

interface LegacyUser {
  id: number;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  eng_first_name: string | null;
  eng_last_name: string | null;
  employee_id: string;
  phone_number: string;
  user_type: string;
  role_id: number | null;
  created_at: Date;
}

interface LegacyReport {
  id: number;
  report_date: string;
  employee_id: string;
  full_name: string;
  shift: string;
  building: string;
  guard_post: string;
  report_time: string;
  incident_report: string;
  special_incident: string | null;
  emergency_incident: string | null;
  updated_by: string | null;
  updated_at: Date | null;
  deleted_by: string | null;
  deleted_at: Date | null;
  is_deleted: number;
  submission_time: Date;
}

interface LegacyPatrolReport {
  id: number;
  report_date: string;
  report_condition: string;
  shift: string;
  employee_id: string;
  inspector_name: string;
  patrol_time: string;
  building: string;
  fence_lighting: string;
  fence_objects: string;
  no_gathering: string;
  no_flyers: string;
  fence_normal: string;
  no_suspicious_parking: string;
  no_suspicious_boxes: string;
  no_unauthorized_persons_area: string;
  door_system_normal: string;
  electrical_system_normal: string;
  no_room_abnormalities: string;
  no_unauthorized_persons_room: string;
  no_chemical_obstruction: string;
  no_container_leaks: string;
  no_unauthorized_persons_chemical: string;
  chemical_door_normal: string;
  no_unauthorized_persons_electrical: string;
  electrical_door_normal: string;
  no_electrical_abnormalities: string;
  equipment_normal: string;
  no_fire_door_obstruction: string;
  created_at: Date;
  is_deleted: number;
  deleted_by: string | null;
  deleted_at: Date | null;
  updated_by: string | null;
  updated_at: Date | null;
}

function mapLegacyRoleToNew(legacyRoleId: number): number {
  const roleMap: Record<number, number> = {
    1: 1, // ผู้ดูแลระบบ -> super_admin
    2: 2, // หัวหน้า -> admin
    3: 3, // เจ้าหน้าที่รักษาความปลอดภัย -> user
    4: 3, // เจ้าหน้าที่ตรวจตรา -> user
  };
  return roleMap[legacyRoleId] ?? 3;
}

async function migrateUsers() {
  console.log('Starting user migration...');
  
  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".users`
  );
  
  const total = Number(count[0].count);
  console.log(`Total legacy users: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const users: LegacyUser[] = await prisma.$queryRawUnsafe(
      `SELECT id, username, password, first_name, last_name, eng_first_name, eng_last_name, 
              employee_id, phone_number, user_type, role_id, created_at 
       FROM "${LEGACY_SCHEMA}".users 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const user of users) {
      try {
        const fullName = `${user.first_name} ${user.last_name}`.trim();
        const newRoleId = mapLegacyRoleToNew(user.role_id ?? 3);

        await prisma.user.upsert({
          where: { username: user.username },
          update: {
            fullName,
            roleId: newRoleId,
            department: user.phone_number || null,
            isActive: user.user_type === 'admin',
          },
          create: {
            username: user.username,
            password: user.password,
            fullName,
            roleId: newRoleId,
            department: user.phone_number || null,
            isActive: user.user_type === 'admin',
          },
        });
      } catch (error) {
        skipped++;
        console.error(`Failed to migrate user ${user.username}:`, error);
      }
    }

    processed += users.length;
    console.log(`Processed ${processed}/${total} users`);
  }

  console.log(`User migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateReports() {
  console.log('Starting reports migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".reports WHERE is_deleted = 0`
  );

  const total = Number(count[0].count);
  console.log(`Total active legacy reports: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const reports: LegacyReport[] = await prisma.$queryRawUnsafe(
      `SELECT id, report_date, employee_id, full_name, shift, building, guard_post, 
              report_time, incident_report, special_incident, emergency_incident,
              updated_by, updated_at, deleted_by, deleted_at, is_deleted, submission_time 
       FROM "${LEGACY_SCHEMA}".reports 
       WHERE is_deleted = 0 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const report of reports) {
      try {
        await prisma.buildingReport.upsert({
          where: { id: report.id },
          update: {
            reportDate: new Date(report.report_date),
            employeeId: report.employee_id,
            fullName: report.full_name,
            shift: report.shift,
            building: report.building,
            guardPost: report.guard_post,
            reportTime: report.report_time.substring(0, 5),
            incidentReport: report.incident_report,
            specialIncident: report.special_incident || null,
            emergencyIncident: report.emergency_incident || null,
          },
          create: {
            id: report.id,
            reportDate: new Date(report.report_date),
            employeeId: report.employee_id,
            fullName: report.full_name,
            shift: report.shift,
            building: report.building,
            guardPost: report.guard_post,
            reportTime: report.report_time.substring(0, 5),
            incidentReport: report.incident_report,
            specialIncident: report.special_incident || null,
            emergencyIncident: report.emergency_incident || null,
          },
        });
      } catch (error) {
        skipped++;
        console.error(`Failed to migrate report ${report.id}:`, error);
      }
    }

    processed += reports.length;
    console.log(`Processed ${processed}/${total} reports`);
  }

  console.log(`Report migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migratePatrolReports() {
  console.log('Starting patrol reports migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".patrol_reports WHERE is_deleted = 0`
  );

  const total = Number(count[0].count);
  console.log(`Total active legacy patrol reports: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const patrols: LegacyPatrolReport[] = await prisma.$queryRawUnsafe(
      `SELECT id, report_date, report_condition, shift, employee_id, inspector_name, 
              patrol_time, building, fence_lighting, fence_objects, no_gathering, 
              no_flyers, fence_normal, no_suspicious_parking, no_suspicious_boxes, 
              no_unauthorized_persons_area, door_system_normal, electrical_system_normal, 
              no_room_abnormalities, no_unauthorized_persons_room, no_chemical_obstruction, 
              no_container_leaks, no_unauthorized_persons_chemical, chemical_door_normal, 
              no_unauthorized_persons_electrical, electrical_door_normal, 
              no_electrical_abnormalities, equipment_normal, no_fire_door_obstruction,
              created_at, is_deleted, deleted_by, deleted_at, updated_by, updated_at 
       FROM "${LEGACY_SCHEMA}".patrol_reports 
       WHERE is_deleted = 0 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const patrol of patrols) {
      try {
        const notes = [
          patrol.fence_lighting,
          patrol.fence_objects,
          patrol.no_gathering,
          patrol.no_flyers,
          patrol.fence_normal,
          patrol.no_suspicious_parking,
          patrol.no_suspicious_boxes,
          patrol.no_unauthorized_persons_area,
          patrol.door_system_normal,
          patrol.electrical_system_normal,
          patrol.no_room_abnormalities,
          patrol.no_unauthorized_persons_room,
          patrol.no_chemical_obstruction,
          patrol.no_container_leaks,
          patrol.no_unauthorized_persons_chemical,
          patrol.chemical_door_normal,
          patrol.no_unauthorized_persons_electrical,
          patrol.electrical_door_normal,
          patrol.no_electrical_abnormalities,
          patrol.equipment_normal,
          patrol.no_fire_door_obstruction,
        ].filter(Boolean).join('; ');

        await prisma.patrolReport.upsert({
          where: { id: patrol.id },
          update: {
            patrolDate: new Date(patrol.report_date),
            patrolRoute: patrol.building,
            officerName: patrol.inspector_name,
            status: patrol.report_condition,
            notes: notes || null,
          },
          create: {
            id: patrol.id,
            patrolDate: new Date(patrol.report_date),
            patrolRoute: patrol.building,
            officerName: patrol.inspector_name,
            status: patrol.report_condition,
            notes: notes || null,
          },
        });
      } catch (error) {
        skipped++;
        console.error(`Failed to migrate patrol report ${patrol.id}:`, error);
      }
    }

    processed += patrols.length;
    console.log(`Processed ${processed}/${total} patrol reports`);
  }

  console.log(`Patrol migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateCarParkings() {
  console.log('Starting car parking migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".car_parking_reports WHERE is_deleted = 0`
  );

  const total = Number(count[0].count);
  console.log(`Total active legacy parking reports: ${total}`);

  let processed = 0;
  let skipped = 0;
  let idCounter = 1;

  while (processed < total) {
    const parkings: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, inspection_date, inspector_code, inspector_name, shift, parking_lot, 
              total_cars, spare_tire_status, license_plates, motorcycle_parking_lot,
              motorcycle_count_1, motorcycle_count_2, motorcycle_count_3, created_at 
       FROM "${LEGACY_SCHEMA}".car_parking_reports 
       WHERE is_deleted = 0 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const parking of parkings) {
      try {
        const lotName = parking.parking_lot || 'ไม่ระบุ';
        const isMotorcycle = lotName.toLowerCase().includes('motor') || lotName.toLowerCase().includes('มอเตอร์');
        
        if (isMotorcycle && parking.motorcycle_count_1) {
          await prisma.carParking.create({
            data: {
              recordDate: new Date(parking.inspection_date),
              slotNo: lotName,
              carLicense: parking.license_plates || '',
              driverName: parking.inspector_name,
              timeIn: new Date(parking.created_at),
              status: 'parked',
            },
          });
        } else if (!isMotorcycle && parking.total_cars > 0) {
          await prisma.carParking.create({
            data: {
              recordDate: new Date(parking.inspection_date),
              slotNo: lotName,
              carLicense: parking.license_plates || '',
              driverName: parking.inspector_name,
              timeIn: new Date(parking.created_at),
              status: 'parked',
            },
          });
        }
        idCounter++;
      } catch (error) {
        skipped++;
      }
    }

    processed += parkings.length;
    console.log(`Processed ${processed}/${total} parking reports`);
  }

  console.log(`Parking migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateCctvReports() {
  console.log('Starting CCTV reports migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".cctv_reports WHERE is_deleted = 0`
  );

  const total = Number(count[0].count);
  console.log(`Total active legacy CCTV reports: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const reports: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, building, report_time, total_channels, online_channels, offline_channels, 
              online_percentage, submitted_by_id, submission_id 
       FROM "${LEGACY_SCHEMA}".cctv_reports 
       WHERE is_deleted = 0 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const report of reports) {
      try {
        await prisma.cctvReport.upsert({
          where: { id: report.id },
          update: {
            reportDate: new Date(report.report_time),
            totalNormal: report.online_channels,
            totalAbnormal: report.offline_channels,
            reporterName: `User ${report.submitted_by_id}`,
            remark: `Online: ${report.online_percentage}%`,
          },
          create: {
            id: report.id,
            reportDate: new Date(report.report_time),
            totalNormal: report.online_channels,
            totalAbnormal: report.offline_channels,
            reporterName: `User ${report.submitted_by_id}`,
            remark: `Online: ${report.online_percentage}%`,
          },
        });
      } catch (error) {
        skipped++;
        console.error(`Failed to migrate CCTV report ${report.id}:`, error);
      }
    }

    processed += reports.length;
    console.log(`Processed ${processed}/${total} CCTV reports`);
  }

  console.log(`CCTV migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateHandheldChecks() {
  console.log('Starting handheld checks migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".hand_held_checks WHERE is_deleted = 0`
  );

  const total = Number(count[0].count);
  console.log(`Total active legacy handheld checks: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const checks: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, inspection_date, building, guard_post, inspector_code, inspector_name, 
              shift, battery_status, led_status, detection_test_status, alarm_status, 
              remarks, created_at 
       FROM "${LEGACY_SCHEMA}".hand_held_checks 
       WHERE is_deleted = 0 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const check of checks) {
      try {
        const status = 
          check.battery_status === 'พร้อมใช้งาน' && 
          check.led_status === 'ผ่านการทดสอบ' && 
          check.detection_test_status === 'ผ่านการทดสอบ' && 
          check.alarm_status === 'ผ่านการทดสอบ'
            ? 'normal'
            : 'abnormal';

        await prisma.handheldCheck.create({
          data: {
            equipmentId: 1,
            checkDate: new Date(check.inspection_date),
            status,
            remark: check.remarks || ` bâttery: ${check.battery_status}, LED: ${check.led_status}`,
            inspector: check.inspector_name,
          },
        });
      } catch (error) {
        skipped++;
      }
    }

    processed += checks.length;
    console.log(`Processed ${processed}/${total} handheld checks`);
  }

  console.log(`Handheld migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateMetalDetectorChecks() {
  console.log('Starting metal detector checks migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".metal_detector_checks WHERE is_deleted = 0`
  );

  const total = Number(count[0].count);
  console.log(`Total active legacy metal detector checks: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const checks: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, inspection_date, shift, employee_id, employee_name, building, guard_post, 
              scanner_brand, zone1_status, zone2_status, zone3_status, zone4_status, 
              zone5_status, zone6_status, created_at 
       FROM "${LEGACY_SCHEMA}".metal_detector_checks 
       WHERE is_deleted = 0 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const check of checks) {
      try {
        const allPass = 
          check.zone1_status === 'พร้อมใช้งาน' &&
          check.zone2_status === 'พร้อมใช้งาน' &&
          check.zone3_status === 'พร้อมใช้งาน' &&
          check.zone4_status === 'พร้อมใช้งาน' &&
          check.zone5_status === 'พร้อมใช้งาน' &&
          check.zone6_status === 'พร้อมใช้งาน';

        await prisma.metalDetector.create({
          data: {
            deviceCode: `${check.building}-${check.guard_post}-${check.id}`,
            location: `${check.building} - ${check.guard_post}`,
            status: allPass ? 'normal' : 'abnormal',
            lastCheck: new Date(check.inspection_date),
          },
        });
      } catch (error) {
        skipped++;
      }
    }

    processed += checks.length;
    console.log(`Processed ${processed}/${total} metal detector checks`);
  }

  console.log(`Metal detector migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateNvrRecordingDays() {
  console.log('Starting NVR recording days migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".nvr_recording_details`
  );

  const total = Number(count[0].count);
  console.log(`Total legacy NVR recording details: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const details: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, report_id, nvr_name, recording_days, target_days, created_at 
       FROM "${LEGACY_SCHEMA}".nvr_recording_details 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const detail of details) {
      try {
        const status = detail.recording_days >= detail.target_days ? 'pass' : 'fail';
        
        await prisma.nvrRecordingDay.create({
          data: {
            nvrId: detail.report_id,
            recordDate: new Date(detail.created_at),
            daysRecorded: detail.recording_days,
            status,
            remark: `Target: ${detail.target_days} days`,
          },
        });
      } catch (error) {
        skipped++;
      }
    }

    processed += details.length;
    console.log(`Processed ${processed}/${total} NVR recording details`);
  }

  console.log(`NVR recording migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateCctvAngleChecks() {
  console.log('Starting CCTV angle checks migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".cctv_angle_checks`
  );

  const total = Number(count[0].count);
  console.log(`Total legacy CCTV angle checks: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const checks: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, building, nvr_number, camera_number, angle_correct, notes, checked_by, checked_date, unique_id 
       FROM "${LEGACY_SCHEMA}".cctv_angle_checks 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const check of checks) {
      try {
        await prisma.cameraCheck.create({
          data: {
            cameraId: 1,
            checkDate: new Date(check.checked_date),
            status: check.angle_correct ? 'normal' : 'abnormal',
            remark: check.notes,
            checkedBy: check.checked_by,
          },
        });
      } catch (error) {
        skipped++;
      }
    }

    processed += checks.length;
    console.log(`Processed ${processed}/${total} CCTV angle checks`);
  }

  console.log(`CCTV angle checks migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateSecurityGuardCounts() {
  console.log('Starting security guard counts migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".security_guard_counts WHERE is_deleted = 0`
  );

  const total = Number(count[0].count);
  console.log(`Total active legacy guard counts: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const counts: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, record_date, morning_shift, morning_shift_contract, 
              evening_shift, evening_shift_contract, total, submitted_by_id, created_at 
       FROM "${LEGACY_SCHEMA}".security_guard_counts 
       WHERE is_deleted = 0 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const count of counts) {
      try {
        const shift = 'เช้า';
        const presentGuards = count.morning_shift + count.morning_shift_contract;
        
        await prisma.guardCount.create({
          data: {
            recordDate: new Date(count.record_date),
            shift,
            totalGuards: count.total,
            presentGuards,
            absentGuards: count.total - presentGuards,
            remark: `Evening: ${count.evening_shift} + ${count.evening_shift_contract}`,
          },
        });
      } catch (error) {
        skipped++;
      }
    }

    processed += counts.length;
    console.log(`Processed ${processed}/${total} guard counts`);
  }

  console.log(`Guard counts migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function migrateCctvInspections() {
  console.log('Starting CCTV inspections migration...');

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "${LEGACY_SCHEMA}".cctv_inspections WHERE is_deleted = 0`
  );

  const total = Number(count[0].count);
  console.log(`Total active legacy CCTV inspections: ${total}`);

  let processed = 0;
  let skipped = 0;

  while (processed < total) {
    const inspections: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, inspection_date, shift, cctv_room, employee_id, employee_name, 
              radio_status, report_books_status, nvr_screen_status, nvr_machine_status, 
              keys_status, access_control_status, incident_report_status, submitted_by_id, created_at 
       FROM "${LEGACY_SCHEMA}".cctv_inspections 
       WHERE is_deleted = 0 
       ORDER BY id 
       LIMIT ${BATCH_SIZE} 
       OFFSET ${processed}`
    );

    for (const inspection of inspections) {
      try {
        const totalChecked = 7;
        const totalPassed = [
          inspection.radio_status,
          inspection.report_books_status,
          inspection.nvr_screen_status,
          inspection.nvr_machine_status,
          inspection.keys_status,
          inspection.access_control_status,
          inspection.incident_report_status,
        ].filter(s => s === 'ปกติ').length;
        const totalFailed = totalChecked - totalPassed;

        await prisma.cctvInspection.create({
          data: {
            inspectionDate: new Date(inspection.inspection_date),
            inspectorName: inspection.employee_name,
            totalChecked,
            totalPassed,
            totalFailed,
            summary: `CCTV Room: ${inspection.cctv_room}, Radio: ${inspection.radio_status}, NVR: ${inspection.nvr_screen_status}`,
          },
        });
      } catch (error) {
        skipped++;
      }
    }

    processed += inspections.length;
    console.log(`Processed ${processed}/${total} CCTV inspections`);
  }

  console.log(`CCTV inspections migration complete. Processed: ${processed}, Skipped: ${skipped}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Starting legacy data migration...');
  console.log('='.repeat(60));

  try {
    await migrateUsers();
    console.log('');
    await migrateReports();
    console.log('');
    await migratePatrolReports();
    console.log('');
    await migrateCarParkings();
    console.log('');
    await migrateCctvReports();
    console.log('');
    await migrateHandheldChecks();
    console.log('');
    await migrateMetalDetectorChecks();
    console.log('');
    await migrateNvrRecordingDays();
    console.log('');
    await migrateCctvAngleChecks();
    console.log('');
    await migrateSecurityGuardCounts();
    console.log('');
    await migrateCctvInspections();
    console.log('');
    
    console.log('='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
