#!/usr/bin/env node
/**
 * REIMPORT LEGACY DATA WITH PROPER UTF-8 ENCODING
 * 
 * Root cause: mysql-to-pg.js used pg Node.js library which corrupted Thai text
 * during INSERT execution. Thai chars were stored as literal '?' bytes (0x3F).
 * 
 * Fix: Extract INSERT statements from converted.sql (which has correct Thai UTF-8)
 * and pipe them through Docker's psql (which has proper en_US.utf8 locale).
 * 
 * Usage: node scripts/reimport-legacy.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = 'postgresql://wdbpi_user:wdbpi_pass@127.0.0.1:5432/wdbpi_db?schema=public';
const CONVERTED_SQL = path.join(__dirname, 'converted.sql');
const TEMP_INSERTS = path.join(__dirname, '_temp_legacy_inserts.sql');

// Legacy MySQL tables whose schema matches converted.sql INSERT statements
const COMPATIBLE_LEGACY_TABLES = [
  'reports',
  'cctv_devices',
  'cctv_camera_names',
  'nvr_recording_details',
  'cctv_report_details',
  'hand_held_checks',
  'metal_detector_checks',
  'car_parking_reports',
];

// Prisma data tables to truncate (populated by migration)
const PRISMA_DATA_TABLES = [
  'building_reports',
  'nvr_devices',
  'cameras',
  'nvr_recording_days',
  'cctv_reports',
  'cctv_inspections',
  'handheld_equipment',
  'handheld_checks',
  'walkthrough_detectors',
  'walkthrough_checks',
  'car_parkings',
  'patrol_reports',
];

function extractCompatibleInserts() {
  console.log('=== Step 1: Extracting compatible INSERT statements ===');
  const sql = fs.readFileSync(CONVERTED_SQL, 'utf8');
  const lines = sql.split('\n');
  const insertLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^INSERT INTO "([^"]+)"/);
    if (match && COMPATIBLE_LEGACY_TABLES.includes(match[1])) {
      insertLines.push(trimmed);
    }
  }

  console.log(`  Found ${insertLines.length} INSERT statements for compatible legacy tables`);
  for (const line of insertLines) {
    const m = line.match(/INSERT INTO "([^"]+)"/);
    if (m) console.log(`    - ${m[1]}`);
  }

  // Verify Thai text
  const sample = insertLines.slice(0, 3).join('\n');
  const thaiPattern = /[\u0E00-\u0E7F]+/g;
  const thaiWords = sample.match(thaiPattern);
  console.log(`  Thai text: ${thaiWords ? thaiWords.slice(0, 5).join(', ') : 'NONE'}`);

  fs.writeFileSync(TEMP_INSERTS, insertLines.join(';\n') + ';\n', 'utf8');
  console.log(`  Written to ${TEMP_INSERTS}`);

  return insertLines.length;
}

async function truncateAll(client) {
  console.log('\n=== Step 2: Truncating all data tables ===');
  await client.query('SET session_replication_role = replica;');

  // Truncate in dependency order
  const tables = [
    ...PRISMA_DATA_TABLES,
    ...COMPATIBLE_LEGACY_TABLES,
  ];

  for (const table of tables) {
    try {
      await client.query(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`  Truncated ${table}`);
    } catch (err) {
      console.log(`  Skipped ${table}: ${err.message.split('\n')[0]}`);
    }
  }

  await client.query('SET session_replication_role = DEFAULT;');
}

function importViaDocker() {
  console.log('\n=== Step 3: Importing via Docker psql (UTF-8 locale) ===');
  const cmd = `type "${TEMP_INSERTS}" | docker exec -i wdbpi_postgres psql -U wdbpi_user -d wdbpi_db -v ON_ERROR_STOP=0`;
  const output = execSync(cmd, { encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 });

  const insertCount = (output.match(/INSERT 0 \d+/g) || []).length;
  const errorCount = (output.match(/ERROR:/g) || []).length;
  console.log(`  Successful inserts: ${insertCount}`);
  console.log(`  Errors: ${errorCount}`);
  if (errorCount > 0) {
    output.split('\n').filter(l => l.includes('ERROR:')).slice(0, 5).forEach(e => console.log(`    ${e.trim()}`));
  }
  return insertCount;
}

/**
 * Parse INSERT VALUES from converted.sql for a specific table.
 * Uses parameterized queries via pg to preserve UTF-8 encoding.
 */
async function parseAndImportConvertedTable(client, tableName, targetTable, mapper) {
  const content = fs.readFileSync(CONVERTED_SQL, 'utf-8');
  const startMarker = `INSERT INTO "${tableName}" VALUES `;
  const startIdx = content.indexOf(startMarker);
  if (startIdx < 0) {
    console.log(`  No ${tableName} INSERT found in converted.sql`);
    return 0;
  }

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
    const result = mapper(v);
    if (!result) continue;
    const { sql, params } = result;
    try {
      await client.query(sql, params);
      count++;
    } catch (err) {
      if (count === 0) console.log(`    First error: ${err.message.split('\n')[0]}`);
    }
  }
  return count;
}

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
      if (ch === stringChar && valuesStr[i-1] !== '\\') inString = false;
      continue;
    }
    if (ch === "'" || ch === '"') { inString = true; stringChar = ch; current += ch; }
    else if (ch === '(' && depth === 0) { depth = 1; current = ''; }
    else if (ch === '(' && depth > 0) { depth++; current += ch; }
    else if (ch === ')' && depth > 1) { depth--; current += ch; }
    else if (ch === ')' && depth === 1) { depth = 0; tuples.push(current.trim()); current = ''; }
    else if (depth > 0) { current += ch; }
  }
  return tuples;
}

function parseTuple(tupleStr) {
  const values = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < tupleStr.length; i++) {
    const ch = tupleStr[i];
    if (inString) {
      if (ch === stringChar && tupleStr[i-1] !== '\\') { inString = false; current += ch; }
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') { inString = true; stringChar = ch; current += ch; }
    else if (ch === ',') { values.push(cleanValue(current.trim())); current = ''; }
    else current += ch;
  }
  if (current.trim()) values.push(cleanValue(current.trim()));
  return values;
}

function cleanValue(val) {
  if (val === 'NULL' || val === 'null') return null;
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1).replace(/''/g, "'").replace(/\\"/g, '"');
  }
  if (val.includes('CURRENT_TIMESTAMP')) return new Date().toISOString();
  if (val.includes('NOW()')) return new Date().toISOString();
  if (/^-?\d+(\.\d+)?$/.test(val)) return parseFloat(val);
  if (val === 'true') return true;
  if (val === 'false') return false;
  return val;
}

async function migrateIncompatibleTables(client) {
  console.log('\n=== Step 4: Migrating incompatible-schema tables (via parameterized queries) ===');

  // 6. CCTV Inspections (MySQL: 17+ cols → Prisma: 6 cols)
  console.log('  Migrating cctv_inspections...');
  const cctvCount = await parseAndImportConvertedTable(client, 'cctv_inspections', 'cctv_inspections', (v) => {
    if (v.length < 13) return null;
    const inspectionDate = v[1];
    const shift = v[2] || '';
    const cctvRoom = v[3] || '';
    const employeeName = v[5] || 'Unknown';
    const statusFields = [v[6], v[7], v[8], v[9], v[10], v[11], v[12]].filter(s => s != null);
    const totalChecked = statusFields.length;
    const totalPassed = statusFields.filter(s => {
      const lower = String(s).toLowerCase();
      return lower.includes('normal') || lower.includes('ok') || lower.includes('pass') || s === 'ปกติ';
    }).length;
    const summary = `Shift: ${shift}, CCTV Room: ${cctvRoom}, Radio: ${v[6] || 'N/A'}, Report Books: ${v[7] || 'N/A'}, NVR Screen: ${v[8] || 'N/A'}, NVR Machine: ${v[9] || 'N/A'}, Keys: ${v[10] || 'N/A'}, Access Control: ${v[11] || 'N/A'}, Incident Report: ${v[12] || 'N/A'}`;
    return {
      sql: `INSERT INTO cctv_inspections (inspection_date, inspector_name, total_checked, total_passed, total_failed, summary) VALUES ($1, $2, $3, $4, $5, $6)`,
      params: [inspectionDate, employeeName, totalChecked, totalPassed, totalChecked - totalPassed, summary],
    };
  });
  console.log(`    → ${cctvCount} cctv_inspections`);

  // 10. Patrol Reports (MySQL: 30 cols → Prisma: 5 cols)
  console.log('  Migrating patrol_reports...');
  const patrolCount = await parseAndImportConvertedTable(client, 'patrol_reports', 'patrol_reports', (v) => {
    if (v.length < 29) return null;
    const patrolDate = v[1];
    const reportCondition = v[2] || '';
    const shift = v[3] || '';
    const building = v[7] || '';
    const patrolTime = v[6] || '';
    const officerName = v[5] || 'Unknown';
    const patrolRoute = `${building} ${patrolTime}`.trim();
    const status = reportCondition.toLowerCase().includes('ปกติ') || reportCondition.toLowerCase().includes('normal') ? 'normal' : 'abnormal';
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
      equipment_normal: v[27], no_fire_door_obstruction: v[28],
    };
    return {
      sql: `INSERT INTO patrol_reports (patrol_date, patrol_route, officer_name, status, notes) VALUES ($1, $2, $3, $4, $5)`,
      params: [patrolDate, patrolRoute, officerName, status, JSON.stringify(checkFields)],
    };
  });
  console.log(`    → ${patrolCount} patrol_reports`);
}

async function runMigration(client) {
  console.log('\n=== Step 5: Migrating legacy → Prisma data tables ===');

  // 1. Reports → Building Reports
  console.log('  reports → building_reports...');
  const r1 = await client.query(`
    INSERT INTO building_reports (report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident)
    SELECT report_date, employee_id, full_name, LEFT(shift, 10), LEFT(building, 10), guard_post, LEFT(report_time::TEXT, 5), incident_report, special_incident, emergency_incident
    FROM reports WHERE is_deleted = 0
  `);
  console.log(`    → ${r1.rowCount} building_reports`);

  // 2. CCTV Devices → Buildings + NVR Devices
  console.log('  cctv_devices → buildings + nvr_devices...');
  await client.query(`
    INSERT INTO buildings (building_code, building_name, description)
    SELECT DISTINCT building, building, 'Migrated from legacy CCTV devices'
    FROM cctv_devices ON CONFLICT (building_code) DO NOTHING
  `);
  const r2 = await client.query(`
    INSERT INTO nvr_devices (building_id, nvr_name, total_channels)
    SELECT b.id, cd.nvr_name, cd.channels
    FROM cctv_devices cd JOIN buildings b ON b.building_code = cd.building
  `);
  console.log(`    → ${r2.rowCount} nvr_devices`);

  // 3. CCTV Camera Names → Cameras
  console.log('  cctv_camera_names → cameras...');
  await client.query(`
    INSERT INTO buildings (building_code, building_name, description)
    SELECT DISTINCT REGEXP_REPLACE(building, '\\.', '', 'g'), building, 'Migrated from legacy CCTV camera names'
    FROM cctv_camera_names
    WHERE REGEXP_REPLACE(building, '\\.', '', 'g') NOT IN (SELECT building_code FROM buildings)
    ON CONFLICT (building_code) DO NOTHING
  `);
  const r3 = await client.query(`
    INSERT INTO cameras (building_id, camera_no, camera_name, location, status)
    SELECT b.id, 'CH' || cn.channel_number::TEXT, cn.camera_name,
      cn.building || ' - ' || cn.nvr_name || ' CH' || cn.channel_number, 'normal'
    FROM cctv_camera_names cn
    JOIN buildings b ON b.building_code = REGEXP_REPLACE(cn.building, '\\.', '', 'g')
  `);
  console.log(`    → ${r3.rowCount} cameras`);

  // 4. NVR Recording Details → NVR Recording Days
  console.log('  nvr_recording_details → nvr_recording_days...');
  const r4 = await client.query(`
    INSERT INTO nvr_recording_days (nvr_id, record_date, days_recorded, status, remark)
    SELECT nd.id, CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY nrd.id))::INT, nrd.recording_days,
      CASE WHEN nrd.recording_days >= 62 THEN 'normal' WHEN nrd.recording_days >= 30 THEN 'warning' ELSE 'critical' END,
      'Migrated from legacy NVR recording details'
    FROM nvr_recording_details nrd JOIN nvr_devices nd ON nd.nvr_name = nrd.nvr_name
  `);
  console.log(`    → ${r4.rowCount} nvr_recording_days`);

  // 5. CCTV Report Details → CCTV Reports
  console.log('  cctv_report_details → cctv_reports...');
  const r5 = await client.query(`
    INSERT INTO cctv_reports (report_date, total_normal, total_abnormal, reporter_name, remark)
    SELECT CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY report_id))::INT,
      SUM(online_channels), SUM(total_channels - online_channels),
      'Legacy Import', 'Aggregated from ' || COUNT(*) || ' NVR report details'
    FROM cctv_report_details GROUP BY report_id
  `);
  console.log(`    → ${r5.rowCount} cctv_reports`);

  // 6. Hand Held Checks → Handheld Equipment + Handheld Checks
  console.log('  hand_held_checks → handheld_equipment + handheld_checks...');
  await client.query(`
    INSERT INTO handheld_equipment (device_code, device_name, status, location)
    SELECT DISTINCT inspector_code, inspector_name, 'normal', building
    FROM hand_held_checks WHERE is_deleted = 0
    ON CONFLICT (device_code) DO NOTHING
  `);
  const r7 = await client.query(`
    INSERT INTO handheld_checks (equipment_id, check_date, status, remark, inspector)
    SELECT he.id, hhc.inspection_date,
      CASE WHEN hhc.battery_status = 'normal' AND hhc.led_status = 'normal'
                AND hhc.detection_test_status = 'normal' AND hhc.alarm_status = 'normal'
           THEN 'pass' ELSE 'fail' END,
      'Battery: ' || hhc.battery_status || ', LED: ' || hhc.led_status ||
      ', Detection: ' || hhc.detection_test_status || ', Alarm: ' || hhc.alarm_status ||
      COALESCE(', Remarks: ' || hhc.remarks, '') ||
      ' | Shift: ' || hhc.shift || ', Post: ' || hhc.guard_post,
      hhc.inspector_name
    FROM hand_held_checks hhc
    JOIN handheld_equipment he ON he.device_code = hhc.inspector_code
    WHERE hhc.is_deleted = 0
  `);
  console.log(`    → ${r7.rowCount} handheld_checks`);

  // 7. Metal Detector Checks → Walkthrough Detectors + Walkthrough Checks
  console.log('  metal_detector_checks → walkthrough_detectors + walkthrough_checks...');
  await client.query(`
    INSERT INTO walkthrough_detectors (detector_code, location, status)
    SELECT DISTINCT scanner_brand || '-' || building, building || ' - ' || guard_post, 'normal'
    FROM metal_detector_checks WHERE is_deleted = 0
    ON CONFLICT (detector_code) DO NOTHING
  `);
  const r8 = await client.query(`
    INSERT INTO walkthrough_checks (detector_id, check_date, status, remark, inspector)
    SELECT wd.id, mdc.inspection_date,
      CASE WHEN mdc.zone1_status = 'normal' AND mdc.zone2_status = 'normal'
                AND mdc.zone3_status = 'normal' AND mdc.zone4_status = 'normal'
                AND mdc.zone5_status = 'normal' AND mdc.zone6_status = 'normal'
           THEN 'pass' ELSE 'fail' END,
      'Z1: ' || mdc.zone1_status || ', Z2: ' || mdc.zone2_status ||
      ', Z3: ' || mdc.zone3_status || ', Z4: ' || mdc.zone4_status ||
      ', Z5: ' || mdc.zone5_status || ', Z6: ' || mdc.zone6_status ||
      ' | Shift: ' || mdc.shift || ', Brand: ' || mdc.scanner_brand,
      mdc.employee_name
    FROM metal_detector_checks mdc
    JOIN walkthrough_detectors wd ON wd.detector_code = mdc.scanner_brand || '-' || mdc.building
    WHERE mdc.is_deleted = 0
  `);
  console.log(`    → ${r8.rowCount} walkthrough_checks`);

  // 8. Car Parking Reports → Car Parkings
  console.log('  car_parking_reports → car_parkings...');
  const r9a = await client.query(`
    INSERT INTO car_parkings (record_date, slot_no, car_license, driver_name, status)
    SELECT cpr.inspection_date, LEFT(cpr.parking_lot || '-' || TRIM(plate), 20),
      LEFT(TRIM(plate), 50), NULL, 'parked'
    FROM car_parking_reports cpr,
    LATERAL unnest(string_to_array(REPLACE(REPLACE(cpr.license_plates, CHR(10), ''), CHR(13), ''), ',')) AS plate
    WHERE cpr.is_deleted = 0 AND cpr.license_plates IS NOT NULL
      AND TRIM(plate) != '' AND LENGTH(TRIM(plate)) > 1 AND TRIM(plate) !~ '^[?]+$'
  `);
  console.log(`    → ${r9a.rowCount} car_parkings from license_plates`);

  const r9b = await client.query(`
    INSERT INTO car_parkings (record_date, slot_no, car_license, driver_name, status)
    SELECT cpr.inspection_date, LEFT(cpr.parking_lot || '-' || gs.n, 20),
      'UNKNOWN-' || gs.n, NULL, 'parked'
    FROM car_parking_reports cpr,
    LATERAL generate_series(1, cpr.total_cars) AS gs(n)
    WHERE cpr.is_deleted = 0
      AND (cpr.license_plates IS NULL OR TRIM(cpr.license_plates) = '' OR TRIM(cpr.license_plates) ~ '^[?]+$')
      AND cpr.total_cars > 0
  `);
  console.log(`    → ${r9b.rowCount} car_parkings placeholders`);
}

async function verify(client) {
  console.log('\n=== Step 6: Verification ===');

  // Check Thai text in building_reports
  const thai = await client.query(`
    SELECT left(shift, 20) as shift, left(incident_report, 80) as report, left(full_name, 30) as name
    FROM building_reports WHERE incident_report IS NOT NULL AND full_name != 'System Admin' LIMIT 5
  `);
  console.log('  building_reports sample:');
  thai.rows.forEach(r => {
    const hasThai = /[\u0E00-\u0E7F]/.test(r.report) || /[\u0E00-\u0E7F]/.test(r.shift);
    console.log(`    ${hasThai ? '✓ THAI' : '✗ STILL ?'} shift="${r.shift}" name="${r.name}" report="${r.report}"`);
  });

  // Check Thai in cctv_inspections
  const thai2 = await client.query(`SELECT left(inspector_name, 30) as name, left(summary, 60) as summary FROM cctv_inspections LIMIT 3`);
  console.log('  cctv_inspections sample:');
  thai2.rows.forEach(r => console.log(`    name="${r.name}" summary="${r.summary}"`));

  // Check Thai in patrol_reports
  const thai3 = await client.query(`SELECT left(officer_name, 30) as name, left(patrol_route, 30) as route, left(notes, 60) as notes FROM patrol_reports LIMIT 3`);
  console.log('  patrol_reports sample:');
  thai3.rows.forEach(r => console.log(`    name="${r.name}" route="${r.route}" notes="${r.notes}"`));

  // Row counts
  const counts = await client.query(`
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
    UNION ALL SELECT 'patrol_reports', COUNT(*) FROM patrol_reports
    ORDER BY tbl
  `);
  console.log('\n  Row counts:');
  console.table(counts.rows);
}

async function main() {
  console.log('=== REIMPORT LEGACY DATA WITH PROPER UTF-8 ENCODING ===\n');

  extractCompatibleInserts();

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await truncateAll(client);
    importViaDocker();
    await migrateIncompatibleTables(client);
    await runMigration(client);
    await verify(client);
    console.log('\n✅ Reimport complete!');
  } catch (err) {
    console.error('\n❌ Reimport failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
    if (fs.existsSync(TEMP_INSERTS)) fs.unlinkSync(TEMP_INSERTS);
  }
}

main();
