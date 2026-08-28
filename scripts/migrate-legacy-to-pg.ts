import 'dotenv/config';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const dumpPath = path.join(process.cwd(), 'legacy', 'Backup', 'wddump.sql');
const text = fs.readFileSync(dumpPath, 'utf-8');

function parseInsertValues(table: string): string[][] {
  const regex = new RegExp(`INSERT INTO \`${table}\` VALUES\\s*([^;]+);`, 'gis');
  const matches = Array.from(text.matchAll(regex));
  const rows: string[][] = [];
  for (const m of matches) {
    const block = m[1];
    let current = '';
    let depth = 0;
    for (const ch of block) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      current += ch;
      if (ch === ',' && depth === 0) {
        rows.push(parseRow(current.trim()));
        current = '';
      }
    }
    if (current.trim()) rows.push(parseRow(current.trim()));
  }
  return rows;
}

function parseRow(raw: string): string[] {
  let trimmed = raw.trim();
  while (trimmed.length > 0 && trimmed[0] === '(') {
    trimmed = trimmed.slice(1);
  }
  while (trimmed.length > 0 && (trimmed[trimmed.length - 1] === ')' || trimmed[trimmed.length - 1] === ',')) {
    trimmed = trimmed.slice(0, -1);
  }
  const vals: string[] = [];
  let cur = '';
  let inStr = false;
  let strChar = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (!inStr && (ch === "'" || ch === '"')) {
      inStr = true;
      strChar = ch;
      continue;
    }
    if (inStr && ch === strChar) {
      if (trimmed[i + 1] === strChar) {
        cur += ch;
        i++;
        continue;
      }
      inStr = false;
      strChar = '';
      continue;
    }
    if (!inStr && ch === ',') {
      vals.push(normalizeValue(cur.trim()));
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) vals.push(normalizeValue(cur.trim()));
  return vals;
}

function normalizeValue(v: string): string {
  if (v === 'NULL' || v === 'null') return null;
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    return v.slice(1, -1).replace(/''/g, "'").replace(/""/g, '"');
  }
  return v;
}

async function ensureBuilding(code: string) {
  const codeNorm = String(code).replace(/^B\.?/, 'B');
  const res = await client.query('SELECT id FROM buildings WHERE building_code = $1', [codeNorm]);
  if (res.rowCount) return res.rows[0].id;
  const ins = await client.query('INSERT INTO buildings (building_code, building_name) VALUES ($1, $2) RETURNING id', [codeNorm, codeNorm]);
  return ins.rows[0].id;
}

async function ensureCamera(buildingId: number, cameraNo: string, cameraName: string) {
  const res = await client.query('SELECT id FROM cameras WHERE building_id = $1 AND camera_no = $2', [buildingId, cameraNo]);
  if (res.rowCount) return res.rows[0].id;
  const ins = await client.query('INSERT INTO cameras (building_id, camera_no, camera_name) VALUES ($1, $2, $3) RETURNING id', [buildingId, cameraNo, cameraName]);
  return ins.rows[0].id;
}

async function migrate() {
  console.log('Start legacy migration...');
  await client.query('ALTER TABLE IF EXISTS building_reports ALTER COLUMN report_time TYPE VARCHAR(8)');

  const summary: Record<string, number> = {};

  // 1. building_reports
  const reportRows = parseInsertValues('reports');
  console.log('reports rows', reportRows.length, 'sample', JSON.stringify(reportRows[0]).slice(0,200));
  for (const row of reportRows) {
    const id = Number(row[0]);
    if (isNaN(id) || id <= 0) {
      console.error('Skipping bad row:', JSON.stringify(row).slice(0, 200));
      continue;
    }
    const reportDate = row[1];
    if (!reportDate || typeof reportDate !== 'string' || !reportDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.error('Skipping bad date row', id, JSON.stringify(row).slice(0, 200));
      continue;
    }
    const [, , employeeId, fullName, shift, building, guardPost, reportTime, incidentReport, specialIncident, emergencyIncident, , , , , , submissionTime] = row;
    try {
      await client.query(
        `INSERT INTO building_reports (id, report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT ON CONSTRAINT "building_reports_pkey" DO NOTHING`,
        [id, new Date(reportDate), employeeId, fullName, shift, building, guardPost, String(reportTime).slice(0,5), incidentReport, specialIncident, emergencyIncident]
      );
    } catch (e) {
      console.error('Failed row', id, reportDate, e.message);
      throw e;
    }
  }
  summary.building_reports = reportRows.length;

  // 2. nvr_devices from cctv_devices
  const deviceRows = parseInsertValues('cctv_devices');
  for (const row of deviceRows) {
    const [, building, nvrName, area, channels, driveCapacity, totalCapacityTb, targetDays] = row;
    const buildingId = await ensureBuilding(String(building));
    await client.query(
      `INSERT INTO nvr_devices (building_id, nvr_name, total_channels)
       SELECT $1,$2,$3
       WHERE NOT EXISTS (SELECT 1 FROM nvr_devices WHERE building_id = $4 AND nvr_name = $5)`,
      [buildingId, nvrName, channels, buildingId, nvrName]
    );
  }
  summary.nvr_devices = deviceRows.length;

  // 3. cameras from cctv_camera_names
  const cameraRows = parseInsertValues('cctv_camera_names');
  for (const row of cameraRows) {
    const [, buildingRaw, nvrName, channelNumber, cameraName] = row;
    const buildingId = await ensureBuilding(String(buildingRaw).replace('.', ''));
    const cameraNo = `CH${String(channelNumber).padStart(2, '0')}`;
    await client.query(
      `INSERT INTO cameras (building_id, camera_no, camera_name)
       SELECT $1,$2,$3
       WHERE NOT EXISTS (SELECT 1 FROM cameras WHERE building_id = $4 AND camera_no = $5)`,
      [buildingId, cameraNo, cameraName, buildingId, cameraNo]
    );
  }
  summary.cameras = cameraRows.length;

  // 4. cctv_inspections
  const inspRows = parseInsertValues('cctv_inspections');
  for (const row of inspRows) {
    const [, inspectionDate, shift, cctvRoom, , employeeName, radioStatus, nvrScreenStatus, summaryText] = row;
    await client.query(
      `INSERT INTO cctv_inspections (inspection_date, inspector_name, total_checked, total_passed, total_failed, summary)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [new Date(inspectionDate), employeeName, 7, radioStatus === 'ปกติ' && nvrScreenStatus === 'ปกติ' ? 7 : 6, radioStatus === 'ปกติ' && nvrScreenStatus === 'ปกติ' ? 0 : 1, `CCTV Room: ${cctvRoom}, Radio: ${radioStatus}, NVR Screen: ${nvrScreenStatus}`]
    );
  }
  summary.cctv_inspections = inspRows.length;

  // 5. camera_checks from cctv_angle_checks
  const angleRows = parseInsertValues('cctv_angle_checks');
  for (const row of angleRows) {
    const [, building, nvrNumber, cameraNumber, angleCorrect, notes, checkedBy, checkedDate] = row;
    const buildingId = await ensureBuilding(String(building).replace(/^B\.?/, 'B'));
    const cameraNo = `${String(nvrNumber)}-${String(cameraNumber)}`;
    const camRes = await client.query('SELECT id FROM cameras WHERE building_id = $1 AND camera_no = $2', [buildingId, cameraNo]);
    if (!camRes.rowCount) continue;
    await client.query(
      `INSERT INTO camera_checks (camera_id, check_date, status, remark, checked_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [camRes.rows[0].id, new Date(checkedDate), angleCorrect ? 'normal' : 'abnormal', notes, checkedBy]
    );
  }
  summary.camera_checks = angleRows.length;

  // 6. patrol_reports
  const patrolRows = parseInsertValues('patrol_reports');
  for (const row of patrolRows) {
    const [, reportDate, reportCondition, , , inspectorName, , building] = row;
    await client.query(
      `INSERT INTO patrol_reports (patrol_date, patrol_route, officer_name, status)
       VALUES ($1,$2,$3,$4)`,
      [new Date(reportDate), building, inspectorName, reportCondition]
    );
  }
  summary.patrol_reports = patrolRows.length;

  // 7. cctv_reports
  const cctvReportRows = parseInsertValues('cctv_reports');
  for (const row of cctvReportRows) {
    const [id, building, reportTime, totalChannels, onlineChannels, offlineChannels] = row;
    await client.query(
      `INSERT INTO cctv_reports (id, report_date, total_normal, total_abnormal, reporter_name)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT ON CONSTRAINT "cctv_reports_pkey" DO NOTHING`,
      [Number(id), new Date(reportTime), onlineChannels, offlineChannels, 'System']
    );
  }
  summary.cctv_reports = cctvReportRows.length;

  // 8. car_parking_reports
  const parkingReportRows = parseInsertValues('car_parking_reports');
  for (const row of parkingReportRows) {
    const [id, inspectionDate, inspectorCode, inspectorName, shift, parkingLot, totalCars, spareTireStatus, licensePlates, motorcycleParkingLot, motorcycleCount1, motorcycleCount2, motorcycleCount3, createdAt, isDeleted, deletedBy, deletedAt, updatedBy, updatedAt] = row;
    await client.query(
      `INSERT INTO car_parking_reports (id, inspection_date, inspector_code, inspector_name, shift, parking_lot, total_cars, spare_tire_status, license_plates, motorcycle_parking_lot, motorcycle_count_1, motorcycle_count_2, motorcycle_count_3)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), new Date(inspectionDate), inspectorCode, inspectorName, shift, parkingLot, Number(totalCars), spareTireStatus, licensePlates, motorcycleParkingLot, motorcycleCount1 ? Number(motorcycleCount1) : null, motorcycleCount2 ? Number(motorcycleCount2) : null, motorcycleCount3 ? Number(motorcycleCount3) : null]
    );
  }
  summary.car_parking_reports = parkingReportRows.length;

  // 9. parking_lot_counts
  const parkingLotCountRows = parseInsertValues('parking_lot_counts');
  for (const row of parkingLotCountRows) {
    const [id, reportId, lotName, vehicleType, vehicleCount, createdAt] = row;
    await client.query(
      `INSERT INTO parking_lot_counts (id, report_id, lot_name, vehicle_type, vehicle_count)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), Number(reportId), lotName, vehicleType, vehicleCount ? Number(vehicleCount) : null]
    );
  }
  summary.parking_lot_counts = parkingLotCountRows.length;

  // 10. hand_held_checks
  const handHeldRows = parseInsertValues('hand_held_checks');
  for (const row of handHeldRows) {
    const [id, inspectionDate, building, guardPost, inspectorCode, inspectorName, shift, batteryStatus, ledStatus, detectionTestStatus, alarmStatus, remarks, createdAt, isDeleted, deletedBy, deletedAt, updatedBy, updatedAt] = row;
    await client.query(
      `INSERT INTO hand_held_checks (id, inspection_date, building, guard_post, inspector_code, inspector_name, shift, battery_status, led_status, detection_test_status, alarm_status, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), new Date(inspectionDate), building, guardPost, inspectorCode, inspectorName, shift, batteryStatus, ledStatus, detectionTestStatus, alarmStatus, remarks]
    );
  }
  summary.hand_held_checks = handHeldRows.length;

  // 11. metal_detector_checks
  const metalDetectorRows = parseInsertValues('metal_detector_checks');
  for (const row of metalDetectorRows) {
    const [id, inspectionDate, shift, employeeId, employeeName, building, guardPost, scannerBrand, zone1Status, zone2Status, zone3Status, zone4Status, zone5Status, zone6Status, submittedById, createdAt, isDeleted, deletedBy, deletedAt, updatedBy, updatedAt] = row;
    await client.query(
      `INSERT INTO metal_detector_checks (id, inspection_date, shift, employee_id, employee_name, building, guard_post, scanner_brand, zone1_status, zone2_status, zone3_status, zone4_status, zone5_status, zone6_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), new Date(inspectionDate), shift, employeeId, employeeName, building, guardPost, scannerBrand, zone1Status, zone2Status, zone3Status, zone4Status, zone5Status, zone6Status]
    );
  }
  summary.metal_detector_checks = metalDetectorRows.length;

  // 12. nvr_recording_reports
  const nvrReportRows = parseInsertValues('nvr_recording_reports');
  for (const row of nvrReportRows) {
    const [id, building, submissionId, submittedById, reportTime] = row;
    await client.query(
      `INSERT INTO nvr_recording_reports (id, building, submission_id, submitted_by_id, report_time)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), building, submissionId, Number(submittedById), new Date(reportTime)]
    );
  }
  summary.nvr_recording_reports = nvrReportRows.length;

  // 13. nvr_recording_details
  const nvrDetailRows = parseInsertValues('nvr_recording_details');
  for (const row of nvrDetailRows) {
    const [id, reportId, nvrName, recordingDays, targetDays, createdAt] = row;
    await client.query(
      `INSERT INTO nvr_recording_details (id, report_id, nvr_name, recording_days, target_days)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), Number(reportId), nvrName, Number(recordingDays), Number(targetDays)]
    );
  }
  summary.nvr_recording_details = nvrDetailRows.length;

  // 14. nvr_status_reports
  const nvrStatusReportRows = parseInsertValues('nvr_status_reports');
  for (const row of nvrStatusReportRows) {
    const [id, reportTime, totalChannels, onlineChannels, offlineChannels, onlinePercentage] = row;
    await client.query(
      `INSERT INTO nvr_status_reports (id, report_time, total_channels, online_channels, offline_channels, online_percentage)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), new Date(reportTime), Number(totalChannels), Number(onlineChannels), Number(offlineChannels), Number(onlinePercentage)]
    );
  }
  summary.nvr_status_reports = nvrStatusReportRows.length;

  // 15. nvr_status_report_details
  const nvrStatusDetailRows = parseInsertValues('nvr_status_report_details');
  for (const row of nvrStatusDetailRows) {
    const [id, reportId, nvrId, onlineChannels] = row;
    await client.query(
      `INSERT INTO nvr_status_report_details (id, report_id, nvr_id, online_channels)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), Number(reportId), Number(nvrId), Number(onlineChannels)]
    );
  }
  summary.nvr_status_report_details = nvrStatusDetailRows.length;

  // 16. cctv_angle_reports
  const cctvAngleReportRows = parseInsertValues('cctv_angle_reports');
  for (const row of cctvAngleReportRows) {
    const [id, reportDate, building, nvr, totalCameras, correctCameras, incorrectCameras, checkedBy, createdAt] = row;
    await client.query(
      `INSERT INTO cctv_angle_reports (id, report_date, building, nvr, total_cameras, correct_cameras, incorrect_cameras, checked_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), new Date(reportDate), building, Number(nvr), Number(totalCameras), Number(correctCameras), Number(incorrectCameras), checkedBy]
    );
  }
  summary.cctv_angle_reports = cctvAngleReportRows.length;

  // 17. cctv_report_details
  const cctvDetailRows = parseInsertValues('cctv_report_details');
  for (const row of cctvDetailRows) {
    const [id, reportId, nvrName, onlineChannels, totalChannels, channelStatusesJson] = row;
    await client.query(
      `INSERT INTO cctv_report_details (id, report_id, nvr_name, online_channels, total_channels, channel_statuses_json)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), Number(reportId), nvrName, Number(onlineChannels), Number(totalChannels), channelStatusesJson]
    );
  }
  summary.cctv_report_details = cctvDetailRows.length;

  // 18. patrol_checks
  const patrolCheckRows = parseInsertValues('patrol_checks');
  for (const row of patrolCheckRows) {
    const [id, inspectionDate, patrolStatus, shift, employeeId, inspectorName, patrolTime, building] = row;
    await client.query(
      `INSERT INTO patrol_checks (id, inspection_date, patrol_status, shift, employee_id, inspector_name, patrol_time, building)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [Number(id), new Date(inspectionDate), patrolStatus, shift, employeeId, inspectorName, patrolTime, building]
    );
  }
  summary.patrol_checks = patrolCheckRows.length;

  console.log('Migration summary:', summary);
}

migrate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
})();
