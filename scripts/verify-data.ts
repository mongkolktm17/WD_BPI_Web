import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Data Verification Script
 * Checks record counts across all 23 migrated PostgreSQL 18 tables
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verify() {
  console.log('🔍 Running Data Migration Verification for PostgreSQL 18...\n');

  const tables = [
    { name: 'roles', countFn: () => prisma.role.count() },
    { name: 'role_permissions', countFn: () => prisma.rolePermission.count() },
    { name: 'users', countFn: () => prisma.user.count() },
    { name: 'officers', countFn: () => prisma.officer.count() },
    { name: 'buildings', countFn: () => prisma.building.count() },
    { name: 'cameras', countFn: () => prisma.camera.count() },
    { name: 'camera_checks', countFn: () => prisma.cameraCheck.count() },
    { name: 'nvr_devices', countFn: () => prisma.nvrDevice.count() },
    { name: 'nvr_recording_days', countFn: () => prisma.nvrRecordingDay.count() },
    { name: 'cctv_reports', countFn: () => prisma.cctvReport.count() },
    { name: 'car_parkings', countFn: () => prisma.carParking.count() },
    { name: 'guard_duty_logs', countFn: () => prisma.guardDutyLog.count() },
    { name: 'handheld_equipment', countFn: () => prisma.handheldEquipment.count() },
    { name: 'handheld_checks', countFn: () => prisma.handheldCheck.count() },
    { name: 'walkthrough_detectors', countFn: () => prisma.walkthroughDetector.count() },
    { name: 'walkthrough_checks', countFn: () => prisma.walkthroughCheck.count() },
    { name: 'metal_detectors', countFn: () => prisma.metalDetector.count() },
    { name: 'cctv_inspections', countFn: () => prisma.cctvInspection.count() },
    { name: 'guard_counts', countFn: () => prisma.guardCount.count() },
    { name: 'patrol_reports', countFn: () => prisma.patrolReport.count() },
    { name: 'system_configs', countFn: () => prisma.systemConfig.count() },
    { name: 'audit_logs', countFn: () => prisma.auditLog.count() },
    { name: 'report_visuals', countFn: () => prisma.reportVisual.count() },
  ];

  let totalRecords = 0;
  console.log('| Table Name | Record Count | Status |');
  console.log('|------------|--------------|--------|');

  for (const t of tables) {
    try {
      const count = await t.countFn();
      totalRecords += count;
      console.log(`| ${t.name.padEnd(20)} | ${count.toString().padEnd(12)} | ✅ OK   |`);
    } catch (err: any) {
      console.log(`| ${t.name.padEnd(20)} | ERROR        | ❌ FAIL |`);
    }
  }

  console.log(`\n🎉 Verification Completed. Total Records across 23 tables: ${totalRecords}`);
}

verify()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
