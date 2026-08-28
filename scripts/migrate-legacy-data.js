#!/usr/bin/env node
/**
 * LEGACY MYSQL → PRISMA POSTGRESQL DATA MIGRATION
 * 
 * Handles:
 * 1. Tables still in DB with legacy data → Prisma models
 * 2. Dropped tables re-imported from converted.sql → Prisma models
 * 
 * Usage: node scripts/migrate-legacy-data.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = 'postgresql://wdbpi_user:wdbpi_pass@127.0.0.1:5432/wdbpi_db?schema=public';

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  
  console.log('Connected to PostgreSQL');
  
  try {
    await client.query('BEGIN');
    
    // ============================================================
    // 1. REPORTS (25,821 rows) → BUILDING_REPORTS
    // ============================================================
    console.log('\n=== 1. Migrating reports → building_reports ===');
    const r1 = await client.query(`
      INSERT INTO building_reports (report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident)
      SELECT
        report_date,
        employee_id,
        full_name,
        LEFT(shift, 10),
        LEFT(building, 10),
        guard_post,
        LEFT(report_time::TEXT, 5),
        incident_report,
        special_incident,
        emergency_incident
      FROM reports
      WHERE is_deleted = 0
    `);
    console.log(`  → Inserted ${r1.rowCount} building_reports`);
    
    // ============================================================
    // 2. CCTV_DEVICES (19 rows) → BUILDINGS + NVR_DEVICES
    // ============================================================
    console.log('\n=== 2. Migrating cctv_devices → buildings + nvr_devices ===');
    const r2a = await client.query(`
      INSERT INTO buildings (building_code, building_name, description)
      SELECT DISTINCT building, building, 'Migrated from legacy CCTV devices'
      FROM cctv_devices
      ON CONFLICT (building_code) DO NOTHING
    `);
    console.log(`  → Inserted ${r2a.rowCount} buildings`);
    
    const r2b = await client.query(`
      INSERT INTO nvr_devices (building_id, nvr_name, total_channels)
      SELECT b.id, cd.nvr_name, cd.channels
      FROM cctv_devices cd
      JOIN buildings b ON b.building_code = cd.building
    `);
    console.log(`  → Inserted ${r2b.rowCount} nvr_devices`);
    
    // ============================================================
    // 3. CCTV_CAMERA_NAMES (815 rows) → CAMERAS
    // Building names differ: cctv_devices uses B2, cctv_camera_names uses B.2
    // ============================================================
    console.log('\n=== 3. Migrating cctv_camera_names → cameras ===');
    
    // First, create any missing buildings from camera names
    await client.query(`
      INSERT INTO buildings (building_code, building_name, description)
      SELECT DISTINCT
        REGEXP_REPLACE(building, '\.', '', 'g'),
        building,
        'Migrated from legacy CCTV camera names'
      FROM cctv_camera_names
      WHERE REGEXP_REPLACE(building, '\.', '', 'g') NOT IN (SELECT building_code FROM buildings)
      ON CONFLICT (building_code) DO NOTHING
    `);
    
    const r3 = await client.query(`
      INSERT INTO cameras (building_id, camera_no, camera_name, location, status)
      SELECT
        b.id,
        'CH' || cn.channel_number::TEXT,
        cn.camera_name,
        cn.building || ' - ' || cn.nvr_name || ' CH' || cn.channel_number,
        'normal'
      FROM cctv_camera_names cn
      JOIN buildings b ON b.building_code = REGEXP_REPLACE(cn.building, '\.', '', 'g')
    `);
    console.log(`  → Inserted ${r3.rowCount} cameras`);
    
    // ============================================================
    // 4. NVR_RECORDING_DETAILS (211 rows) → NVR_RECORDING_DAYS
    // ============================================================
    console.log('\n=== 4. Migrating nvr_recording_details → nvr_recording_days ===');
    const r4 = await client.query(`
      INSERT INTO nvr_recording_days (nvr_id, record_date, days_recorded, status, remark)
      SELECT
        nd.id,
        CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY nrd.id))::INT,
        nrd.recording_days,
        CASE
          WHEN nrd.recording_days >= 62 THEN 'normal'
          WHEN nrd.recording_days >= 30 THEN 'warning'
          ELSE 'critical'
        END,
        'Migrated from legacy NVR recording details'
      FROM nvr_recording_details nrd
      JOIN nvr_devices nd ON nd.nvr_name = nrd.nvr_name
    `);
    console.log(`  → Inserted ${r4.rowCount} nvr_recording_days`);
    
    // ============================================================
    // 5. CCTV_REPORT_DETAILS (159 rows) → CCTV_REPORTS (Prisma)
    // Aggregate by report_id to create summary reports
    // ============================================================
    console.log('\n=== 5. Migrating cctv_report_details → cctv_reports ===');
    const r5 = await client.query(`
      INSERT INTO cctv_reports (report_date, total_normal, total_abnormal, reporter_name, remark)
      SELECT
        CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY report_id))::INT,
        SUM(online_channels),
        SUM(total_channels - online_channels),
        'Legacy Import',
        'Aggregated from ' || COUNT(*) || ' NVR report details'
      FROM cctv_report_details
      GROUP BY report_id
    `);
    console.log(`  → Inserted ${r5.rowCount} cctv_reports`);
    
    // ============================================================
    // 6. CCTV_INSPECTIONS (166 rows from converted.sql) → CCTV_INSPECTIONS
    // Need to re-import from converted.sql since the table was dropped
    // ============================================================
    console.log('\n=== 6. Re-importing cctv_inspections from converted.sql ===');
    await reImportCctvInspections(client);
    
    // ============================================================
    // 7. HAND_HELD_CHECKS (1,358 rows) → HANDHELD_EQUIPMENT + HANDHELD_CHECKS
    // ============================================================
    console.log('\n=== 7. Migrating hand_held_checks → handheld_equipment + handheld_checks ===');
    const r7a = await client.query(`
      INSERT INTO handheld_equipment (device_code, device_name, status, location)
      SELECT DISTINCT
        inspector_code,
        inspector_name,
        'normal',
        building
      FROM hand_held_checks
      WHERE is_deleted = 0
      ON CONFLICT (device_code) DO NOTHING
    `);
    console.log(`  → Inserted ${r7a.rowCount} handheld_equipment`);
    
    const r7b = await client.query(`
      INSERT INTO handheld_checks (equipment_id, check_date, status, remark, inspector)
      SELECT
        he.id,
        hhc.inspection_date,
        CASE
          WHEN hhc.battery_status = 'normal' AND hhc.led_status = 'normal'
               AND hhc.detection_test_status = 'normal' AND hhc.alarm_status = 'normal'
          THEN 'pass'
          ELSE 'fail'
        END,
        'Battery: ' || hhc.battery_status ||
        ', LED: ' || hhc.led_status ||
        ', Detection: ' || hhc.detection_test_status ||
        ', Alarm: ' || hhc.alarm_status ||
        COALESCE(', Remarks: ' || hhc.remarks, '') ||
        ' | Shift: ' || hhc.shift || ', Post: ' || hhc.guard_post,
        hhc.inspector_name
      FROM hand_held_checks hhc
      JOIN handheld_equipment he ON he.device_code = hhc.inspector_code
      WHERE hhc.is_deleted = 0
    `);
    console.log(`  → Inserted ${r7b.rowCount} handheld_checks`);
    
    // ============================================================
    // 8. METAL_DETECTOR_CHECKS (1,365 rows) → WALKTHROUGH_DETECTORS + WALKTHROUGH_CHECKS
    // ============================================================
    console.log('\n=== 8. Migrating metal_detector_checks → walkthrough_detectors + walkthrough_checks ===');
    const r8a = await client.query(`
      INSERT INTO walkthrough_detectors (detector_code, location, status)
      SELECT DISTINCT
        scanner_brand || '-' || building,
        building || ' - ' || guard_post,
        'normal'
      FROM metal_detector_checks
      WHERE is_deleted = 0
      ON CONFLICT (detector_code) DO NOTHING
    `);
    console.log(`  → Inserted ${r8a.rowCount} walkthrough_detectors`);
    
    const r8b = await client.query(`
      INSERT INTO walkthrough_checks (detector_id, check_date, status, remark, inspector)
      SELECT
        wd.id,
        mdc.inspection_date,
        CASE
          WHEN mdc.zone1_status = 'normal' AND mdc.zone2_status = 'normal'
               AND mdc.zone3_status = 'normal' AND mdc.zone4_status = 'normal'
               AND mdc.zone5_status = 'normal' AND mdc.zone6_status = 'normal'
          THEN 'pass'
          ELSE 'fail'
        END,
        'Z1: ' || mdc.zone1_status || ', Z2: ' || mdc.zone2_status ||
        ', Z3: ' || mdc.zone3_status || ', Z4: ' || mdc.zone4_status ||
        ', Z5: ' || mdc.zone5_status || ', Z6: ' || mdc.zone6_status ||
        ' | Shift: ' || mdc.shift || ', Brand: ' || mdc.scanner_brand,
        mdc.employee_name
      FROM metal_detector_checks mdc
      JOIN walkthrough_detectors wd ON wd.detector_code = mdc.scanner_brand || '-' || mdc.building
      WHERE mdc.is_deleted = 0
    `);
    console.log(`  → Inserted ${r8b.rowCount} walkthrough_checks`);
    
    // ============================================================
    // 9. CAR_PARKING_REPORTS (647 rows) → CAR_PARKINGS
    // Split comma-separated license_plates into individual records
    // ============================================================
    console.log('\n=== 9. Migrating car_parking_reports → car_parkings ===');
    
    // First, try to split license_plates
    const r9a = await client.query(`
      INSERT INTO car_parkings (record_date, slot_no, car_license, driver_name, status)
      SELECT
        cpr.inspection_date,
        LEFT(cpr.parking_lot || '-' || TRIM(plate), 20),
        LEFT(TRIM(plate), 50),
        NULL,
        'parked'
      FROM car_parking_reports cpr,
      LATERAL unnest(string_to_array(
        REPLACE(REPLACE(cpr.license_plates, CHR(10), ''), CHR(13), ''),
        ','
      )) AS plate
      WHERE cpr.is_deleted = 0
        AND cpr.license_plates IS NOT NULL
        AND TRIM(plate) != ''
        AND LENGTH(TRIM(plate)) > 1
        AND TRIM(plate) !~ '^[?]+$'
    `);
    console.log(`  → Inserted ${r9a.rowCount} car_parkings from license_plates`);
    
    // For reports without license plates but with total_cars > 0, create placeholders
    const r9b = await client.query(`
      INSERT INTO car_parkings (record_date, slot_no, car_license, driver_name, status)
      SELECT
        cpr.inspection_date,
        LEFT(cpr.parking_lot || '-' || gs.n, 20),
        'UNKNOWN-' || gs.n,
        NULL,
        'parked'
      FROM car_parking_reports cpr,
      LATERAL generate_series(1, cpr.total_cars) AS gs(n)
      WHERE cpr.is_deleted = 0
        AND (cpr.license_plates IS NULL OR TRIM(cpr.license_plates) = '' OR TRIM(cpr.license_plates) ~ '^[?]+$')
        AND cpr.total_cars > 0
    `);
    console.log(`  → Inserted ${r9b.rowCount} car_parkings placeholders`);
    
    // ============================================================
    // 10. PATROL_REPORTS (305 rows from converted.sql) → PATROL_REPORTS (Prisma)
    // Need to re-import from converted.sql since table was recreated with Prisma schema
    // ============================================================
    console.log('\n=== 10. Re-importing patrol_reports from converted.sql ===');
    await reImportPatrolReports(client);
    
    await client.query('COMMIT');
    
    // ============================================================
    // VERIFICATION
    // ============================================================
    console.log('\n=== VERIFICATION ===');
    const verify = await client.query(`
      SELECT 'building_reports' AS tbl, COUNT(*) AS cnt FROM building_reports
      UNION ALL SELECT 'buildings', COUNT(*) FROM buildings
      UNION ALL SELECT 'nvr_devices', COUNT(*) FROM nvr_devices
      UNION ALL SELECT 'cameras', COUNT(*) FROM cameras
      UNION ALL SELECT 'nvr_recording_days', COUNT(*) FROM nvr_recording_days
      UNION ALL SELECT 'cctv_reports', COUNT(*) FROM cctv_reports
      UNION ALL SELECT 'cctv_inspections', COUNT(*) FROM cctv_inspections
      UNION ALL SELECT 'handheld_equipment', COUNT(*) FROM handheld_equipment
      UNION ALL SELECT 'handheld_checks', COUNT(*) FROM handheld_checks
      UNION ALL SELECT 'walkthrough_detectors', COUNT(*) FROM walkthrough_detectors
      UNION ALL SELECT 'walkthrough_checks', COUNT(*) FROM walkthrough_checks
      UNION ALL SELECT 'car_parkings', COUNT(*) FROM car_parkings
      UNION ALL SELECT 'guard_counts', COUNT(*) FROM guard_counts
      UNION ALL SELECT 'roles', COUNT(*) FROM roles
      UNION ALL SELECT 'users', COUNT(*) FROM users
      UNION ALL SELECT 'role_permissions', COUNT(*) FROM role_permissions
      ORDER BY tbl
    `);
    console.table(verify.rows);
    
    console.log('\n✅ Migration complete!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * Re-import cctv_inspections from converted.sql
 * The INSERT format is: INSERT INTO "cctv_inspections" VALUES (id, inspection_date, shift, cctv_room, employee_id, employee_name, radio_status, report_books_status, nvr_screen_status, nvr_machine_status, keys_status, access_control_status, incident_report_status, submitted_by_id, created_at, is_deleted, ...)
 * Prisma model: inspection_date, inspector_name, total_checked, total_passed, total_failed, summary
 */
async function reImportCctvInspections(client) {
  const convertedPath = path.join(__dirname, 'converted.sql');
  const content = fs.readFileSync(convertedPath, 'utf-8');
  
  const startMarker = 'INSERT INTO "cctv_inspections" VALUES ';
  const startIdx = content.indexOf(startMarker);
  if (startIdx < 0) {
    console.log('  → No cctv_inspections INSERT found in converted.sql');
    return;
  }
  
  // Find statement-ending semicolon (quote-aware)
  let pos = startIdx + startMarker.length;
  let inString = false;
  let stringChar = '';
  
  while (pos < content.length) {
    const ch = content[pos];
    if (inString) {
      if (ch === stringChar && content[pos - 1] !== '\\') inString = false;
    } else {
      if (ch === "'" || ch === '"') { inString = true; stringChar = ch; }
      else if (ch === ';') break;
    }
    pos++;
  }
  
  const valuesStr = content.substring(startIdx + startMarker.length, pos);
  const tuples = parseValueTuples(valuesStr);
  
  let count = 0;
  for (const tuple of tuples) {
    const values = parseTuple(tuple);
    // Column order: id(0), inspection_date(1), shift(2), cctv_room(3), employee_id(4), employee_name(5),
    // radio_status(6), report_books_status(7), nvr_screen_status(8), nvr_machine_status(9),
    // keys_status(10), access_control_status(11), incident_report_status(12), ...
    if (values.length < 13) continue;
    
    const inspectionDate = values[1];
    const shift = values[2] || '';
    const cctvRoom = values[3] || '';
    const employeeName = values[5] || 'Unknown';
    
    const statusFields = [values[6], values[7], values[8], values[9], values[10], values[11], values[12]].filter(s => s != null);
    const totalChecked = statusFields.length;
    const totalPassed = statusFields.filter(s => {
      const lower = String(s).toLowerCase();
      return lower.includes('normal') || lower.includes('ok') || lower.includes('pass') || s === 'ปกติ';
    }).length;
    const totalFailed = totalChecked - totalPassed;
    
    const summary = `Shift: ${shift}, CCTV Room: ${cctvRoom}, ` +
      `Radio: ${values[6] || 'N/A'}, Report Books: ${values[7] || 'N/A'}, ` +
      `NVR Screen: ${values[8] || 'N/A'}, NVR Machine: ${values[9] || 'N/A'}, ` +
      `Keys: ${values[10] || 'N/A'}, Access Control: ${values[11] || 'N/A'}, ` +
      `Incident Report: ${values[12] || 'N/A'}`;
    
    await client.query(`
      INSERT INTO cctv_inspections (inspection_date, inspector_name, total_checked, total_passed, total_failed, summary)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [inspectionDate, employeeName, totalChecked, totalPassed, totalFailed, summary]);
    count++;
  }
  
  console.log(`  → Re-imported ${count} cctv_inspections from converted.sql`);
}

/**
 * Re-import patrol_reports from converted.sql
 * Old MySQL columns (30): id, report_date, report_condition, shift, employee_id, inspector_name,
 * patrol_time, building, fence_lighting, fence_objects, no_gathering, no_flyers, fence_normal,
 * no_suspicious_parking, no_suspicious_boxes, no_unauthorized_persons_area, door_system_normal,
 * electrical_system_normal, no_room_abnormalities, no_unauthorized_persons_room,
 * no_chemical_obstruction, no_container_leaks, no_unauthorized_persons_chemical,
 * chemical_door_normal, no_unauthorized_persons_electrical, electrical_door_normal,
 * no_electrical_abnormalities, equipment_normal, no_fire_door_obstruction,
 * created_at, is_deleted, deleted_by, deleted_at, updated_by, updated_at
 *
 * Prisma PatrolReport: patrol_date, patrol_route, officer_name, status, notes
 */
async function reImportPatrolReports(client) {
  const convertedPath = path.join(__dirname, 'converted.sql');
  const content = fs.readFileSync(convertedPath, 'utf-8');
  
  const startMarker = 'INSERT INTO "patrol_reports" VALUES ';
  const startIdx = content.indexOf(startMarker);
  if (startIdx < 0) {
    console.log('  → No patrol_reports INSERT found in converted.sql');
    return;
  }
  
  // Find statement-ending semicolon (quote-aware)
  let pos = startIdx + startMarker.length;
  let inString = false;
  let stringChar = '';
  
  while (pos < content.length) {
    const ch = content[pos];
    if (inString) {
      if (ch === stringChar && content[pos - 1] !== '\\') inString = false;
    } else {
      if (ch === "'" || ch === '"') { inString = true; stringChar = ch; }
      else if (ch === ';') break;
    }
    pos++;
  }
  
  const valuesStr = content.substring(startIdx + startMarker.length, pos);
  const tuples = parseValueTuples(valuesStr);
  
  let count = 0;
  for (const tuple of tuples) {
    const v = parseTuple(tuple);
    if (v.length < 29) continue;
    
    const patrolDate = v[1];
    const shift = v[3] || '';
    const building = v[7] || '';
    const patrolTime = v[6] || '';
    const officerName = v[5] || 'Unknown';
    const reportCondition = v[2] || '';
    
    const patrolRoute = `${building} ${patrolTime}`.trim();
    
    const status = reportCondition.toLowerCase().includes('ปกติ') || reportCondition.toLowerCase().includes('normal')
      ? 'normal' : 'abnormal';
    
    const checkFields = {
      shift, report_condition: reportCondition,
      fence_lighting: v[8], fence_objects: v[9],
      no_gathering: v[10], no_flyers: v[11], fence_normal: v[12],
      no_suspicious_parking: v[13], no_suspicious_boxes: v[14],
      no_unauthorized_persons_area: v[15], door_system_normal: v[16],
      electrical_system_normal: v[17], no_room_abnormalities: v[18],
      no_unauthorized_persons_room: v[19], no_chemical_obstruction: v[20],
      no_container_leaks: v[21], no_unauthorized_persons_chemical: v[22],
      chemical_door_normal: v[23], no_unauthorized_persons_electrical: v[24],
      electrical_door_normal: v[25], no_electrical_abnormalities: v[26],
      equipment_normal: v[27], no_fire_door_obstruction: v[28]
    };
    
    await client.query(`
      INSERT INTO patrol_reports (patrol_date, patrol_route, officer_name, status, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [patrolDate, patrolRoute, officerName, status, JSON.stringify(checkFields)]);
    count++;
  }
  
  console.log(`  → Re-imported ${count} patrol_reports from converted.sql`);
}

/**
 * Parse SQL value tuples from INSERT VALUES clause
 * Handles nested parentheses, quoted strings, etc.
 */
function parseValueTuples(valuesStr) {
  const tuples = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i];
    
    if (inString) {
      current += ch;
      if (ch === stringChar && valuesStr[i-1] !== '\\') {
        inString = false;
      }
      continue;
    }
    
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === '(' && depth === 0) {
      depth = 1;
      current = '';
    } else if (ch === '(' && depth > 0) {
      depth++;
      current += ch;
    } else if (ch === ')' && depth > 1) {
      depth--;
      current += ch;
    } else if (ch === ')' && depth === 1) {
      depth = 0;
      tuples.push(current.trim());
      current = '';
    } else if (depth > 0) {
      current += ch;
    }
  }
  
  return tuples;
}

/**
 * Parse a single value tuple string into an array of values
 */
function parseTuple(tupleStr) {
  const values = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < tupleStr.length; i++) {
    const ch = tupleStr[i];
    
    if (inString) {
      if (ch === stringChar && tupleStr[i-1] !== '\\') {
        inString = false;
        current += ch;
      } else {
        current += ch;
      }
      continue;
    }
    
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === ',') {
      values.push(cleanValue(current.trim()));
      current = '';
    } else {
      current += ch;
    }
  }
  
  if (current.trim()) {
    values.push(cleanValue(current.trim()));
  }
  
  return values;
}

/**
 * Clean a parsed SQL value
 */
function cleanValue(val) {
  if (val === 'NULL' || val === 'null') return null;
  
  // Remove surrounding quotes
  if ((val.startsWith("'") && val.endsWith("'")) || 
      (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1)
      .replace(/''/g, "'")
      .replace(/\\"/g, '"');
  }
  
  // Remove trailing timestamp defaults
  if (val.includes('CURRENT_TIMESTAMP')) return new Date().toISOString();
  if (val.includes('NOW()')) return new Date().toISOString();
  
  // Parse numbers
  if (/^-?\d+(\.\d+)?$/.test(val)) {
    return parseFloat(val);
  }
  
  // Handle boolean-like values
  if (val === 'true') return true;
  if (val === 'false') return false;
  
  // Handle DEFAULT keyword
  if (val.toUpperCase() === 'DEFAULT') return null;
  
  return val;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
