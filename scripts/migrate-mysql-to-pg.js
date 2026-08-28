const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const MYSQL_CONFIG = { host: 'mysql', user: 'root', password: 'root_password', database: 'wdbpi_legacy' };
const PG_CONFIG = { host: 'postgres', port: 5432, user: 'wdbpi_user', password: 'wdbpi_pass', database: 'wdbpi_db' };

function countPassed(row) {
  const fields = ['radio_status', 'report_books_status', 'nvr_screen_status', 'nvr_machine_status', 'keys_status', 'access_control_status', 'incident_report_status'];
  let passed = 0, total = 0;
  for (const f of fields) {
    if (row[f] != null && row[f] !== '') {
      total++;
      if (row[f] === 'ปกติ' || row[f] === 'OK' || row[f] === 'ok') passed++;
    }
  }
  return { total, passed, failed: total - passed };
}

async function migrate() {
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
  const pgPool = new Pool(PG_CONFIG);

  console.log('Connected to both databases.');

  try {
    // 1. Roles
    console.log('Migrating roles...');
    const [roles] = await mysqlConn.execute('SELECT * FROM roles');
    for (const r of roles) {
      await pgPool.query(
        `INSERT INTO roles (id, role_name, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.role_name]
      );
    }
    await pgPool.query("SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id),1) FROM roles))");
    console.log(`  -> ${roles.length} roles`);

    // 2. Users
    console.log('Migrating users...');
    const [users] = await mysqlConn.execute('SELECT * FROM users');
    for (const u of users) {
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
      try {
        await pgPool.query(
          `INSERT INTO users (id, username, password, full_name, role_id, phone, department, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.username, u.password, fullName, u.role_id || 1, u.phone_number || '', u.user_type || 'officer', u.created_at || new Date()]
        );
      } catch (e) {
        console.log(`  WARN user ${u.username}: ${e.message.substring(0, 80)}`);
      }
    }
    await pgPool.query("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id),1) FROM users))");
    console.log(`  -> ${users.length} users`);

    // 3. building_reports
    console.log('Migrating building_reports...');
    const [buildingReports] = await mysqlConn.execute('SELECT * FROM reports');
    let bi = 0;
    for (const r of buildingReports) {
      try {
        await pgPool.query(
          `INSERT INTO building_reports (report_date, employee_id, full_name, shift, building, guard_post, report_time, incident_report, special_incident, emergency_incident, created_at, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [r.report_date, r.employee_id || 'N/A', r.full_name || 'N/A', r.shift || 'N/A', r.building || 'N/A', r.guard_post || 'N/A',
           String(r.report_time || '00:00').substring(0, 5), r.incident_report || '', r.special_incident || null, r.emergency_incident || null,
           r.submission_time || r.created_at || new Date(), r.is_deleted || false]
        );
        bi++;
      } catch (e) {
        if (bi === 0) console.log(`  WARN building_report: ${e.message.substring(0, 120)}`);
      }
    }
    await pgPool.query("SELECT setval('building_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM building_reports))");
    console.log(`  -> ${bi}/${buildingReports.length} building_reports`);

    // 4. car_parking_reports
    console.log('Migrating car_parking_reports...');
    const [parkingReports] = await mysqlConn.execute('SELECT * FROM car_parking_reports');
    let pi = 0;
    for (const r of parkingReports) {
      try {
        await pgPool.query(
          `INSERT INTO car_parking_reports (id, inspection_date, inspector_code, inspector_name, shift, parking_lot, total_cars, spare_tire_status, license_plates, motorcycle_parking_lot, motorcycle_count_1, motorcycle_count_2, motorcycle_count_3, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.inspection_date, r.inspector_code, r.inspector_name, r.shift, r.parking_lot, r.total_cars, r.spare_tire_status, r.license_plates, r.motorcycle_parking_lot, r.motorcycle_count_1, r.motorcycle_count_2, r.motorcycle_count_3, r.created_at]
        );
        pi++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('car_parking_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM car_parking_reports))");
    console.log(`  -> ${pi}/${parkingReports.length} car_parking_reports`);

    // 5. hand_held_checks
    console.log('Migrating hand_held_checks...');
    const [hhChecks] = await mysqlConn.execute('SELECT * FROM hand_held_checks');
    let hhi = 0;
    for (const r of hhChecks) {
      try {
        await pgPool.query(
          `INSERT INTO hand_held_checks (id, inspection_date, building, guard_post, inspector_code, inspector_name, shift, battery_status, led_status, detection_test_status, alarm_status, remarks, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.inspection_date, r.building, r.guard_post, r.inspector_code, r.inspector_name, r.shift, r.battery_status, r.led_status, r.detection_test_status, r.alarm_status, r.remarks, r.created_at]
        );
        hhi++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('hand_held_checks_id_seq', (SELECT COALESCE(MAX(id),1) FROM hand_held_checks))");
    console.log(`  -> ${hhi}/${hhChecks.length} hand_held_checks`);

    // 6. metal_detector_checks
    console.log('Migrating metal_detector_checks...');
    const [mdChecks] = await mysqlConn.execute('SELECT * FROM metal_detector_checks');
    let mdi = 0;
    for (const r of mdChecks) {
      try {
        await pgPool.query(
          `INSERT INTO metal_detector_checks (id, inspection_date, shift, employee_id, employee_name, building, guard_post, scanner_brand, zone1_status, zone2_status, zone3_status, zone4_status, zone5_status, zone6_status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.inspection_date, r.shift, r.employee_id, r.employee_name, r.building, r.guard_post, r.scanner_brand, r.zone1_status, r.zone2_status, r.zone3_status, r.zone4_status, r.zone5_status, r.zone6_status, r.created_at]
        );
        mdi++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('metal_detector_checks_id_seq', (SELECT COALESCE(MAX(id),1) FROM metal_detector_checks))");
    console.log(`  -> ${mdi}/${mdChecks.length} metal_detector_checks`);

    // 7. cctv_inspections
    console.log('Migrating cctv_inspections...');
    const [ciRows] = await mysqlConn.execute('SELECT * FROM cctv_inspections');
    let cii = 0;
    for (const r of ciRows) {
      try {
        const stats = countPassed(r);
        await pgPool.query(
          `INSERT INTO cctv_inspections (id, inspection_date, inspector_name, total_checked, total_passed, total_failed, summary, created_at, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.inspection_date, r.employee_name, stats.total, stats.passed, stats.failed, r.summary || null, r.created_at, r.is_deleted || false]
        );
        cii++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('cctv_inspections_id_seq', (SELECT COALESCE(MAX(id),1) FROM cctv_inspections))");
    console.log(`  -> ${cii}/${ciRows.length} cctv_inspections`);

    // 8. patrol_reports
    console.log('Migrating patrol_reports...');
    const [prRows] = await mysqlConn.execute('SELECT * FROM patrol_reports');
    let pri = 0;
    for (const r of prRows) {
      try {
        await pgPool.query(
          `INSERT INTO patrol_reports (id, patrol_date, patrol_route, officer_name, status, notes, created_at, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_date, r.report_condition, r.inspector_name, r.shift, r.patrol_time, r.created_at, r.is_deleted || false]
        );
        pri++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('patrol_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM patrol_reports))");
    console.log(`  -> ${pri}/${prRows.length} patrol_reports`);

    // 9. guard_counts (from security_guard_counts)
    console.log('Migrating guard_counts...');
    const [gcRows] = await mysqlConn.execute('SELECT * FROM security_guard_counts');
    let gci = 0;
    for (const r of gcRows) {
      try {
        const present = (r.morning_shift || 0) + (r.evening_shift || 0);
        await pgPool.query(
          `INSERT INTO guard_counts (id, record_date, shift, total_guards, present_guards, absent_guards, remark, created_at, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.record_date, 'combined', r.total || 0, present, Math.max(0, (r.total || 0) - present), null, r.created_at, r.is_deleted || false]
        );
        gci++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('guard_counts_id_seq', (SELECT COALESCE(MAX(id),1) FROM guard_counts))");
    console.log(`  -> ${gci}/${gcRows.length} guard_counts`);

    // 10. cctv_reports
    console.log('Migrating cctv_reports...');
    const [crRows] = await mysqlConn.execute('SELECT * FROM cctv_reports');
    let cri = 0;
    for (const r of crRows) {
      try {
        let reporterName = 'Unknown';
        if (r.submitted_by_id) {
          const [uRows] = await mysqlConn.execute('SELECT full_name, username FROM users WHERE id = ?', [r.submitted_by_id]);
          if (uRows.length > 0) reporterName = uRows[0].full_name || uRows[0].username;
        }
        await pgPool.query(
          `INSERT INTO cctv_reports (id, building, report_date, total_normal, total_abnormal, reporter_name, remark, created_at, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.building, r.report_time, r.online_channels, r.offline_channels, reporterName, null, r.report_time, r.is_deleted || false]
        );
        cri++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('cctv_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM cctv_reports))");
    console.log(`  -> ${cri}/${crRows.length} cctv_reports`);

    // 11. cctv_angle_reports
    console.log('Migrating cctv_angle_reports...');
    const [carRows] = await mysqlConn.execute('SELECT * FROM cctv_angle_reports');
    let cari = 0;
    for (const r of carRows) {
      try {
        await pgPool.query(
          `INSERT INTO cctv_angle_reports (id, report_date, building, nvr, total_cameras, correct_cameras, incorrect_cameras, checked_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_date, r.building, r.nvr, r.total_cameras, r.correct_cameras, r.incorrect_cameras, r.checked_by, r.created_at || new Date()]
        );
        cari++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('cctv_angle_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM cctv_angle_reports))");
    console.log(`  -> ${cari}/${carRows.length} cctv_angle_reports`);

    // 12. nvr_recording_reports
    console.log('Migrating nvr_recording_reports...');
    const [nvrRows] = await mysqlConn.execute('SELECT * FROM nvr_recording_reports');
    let nvri = 0;
    for (const r of nvrRows) {
      try {
        await pgPool.query(
          `INSERT INTO nvr_recording_reports (id, building, submission_id, report_time, is_deleted)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.building, r.submission_id, r.report_time, r.is_deleted || false]
        );
        nvri++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('nvr_recording_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM nvr_recording_reports))");
    console.log(`  -> ${nvri}/${nvrRows.length} nvr_recording_reports`);

    // 13. nvr_recording_details
    console.log('Migrating nvr_recording_details...');
    const [nvdRows] = await mysqlConn.execute('SELECT * FROM nvr_recording_details');
    let nvdI = 0;
    for (const r of nvdRows) {
      try {
        await pgPool.query(
          `INSERT INTO nvr_recording_details (id, report_id, nvr_name, recording_days, target_days, created_at)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_id, r.nvr_name, r.recording_days, r.target_days || 62, r.created_at]
        );
        nvdI++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('nvr_recording_details_id_seq', (SELECT COALESCE(MAX(id),1) FROM nvr_recording_details))");
    console.log(`  -> ${nvdI}/${nvdRows.length} nvr_recording_details`);

    // 14. nvr_status_reports
    console.log('Migrating nvr_status_reports...');
    const [nsrRows] = await mysqlConn.execute('SELECT * FROM nvr_status_reports');
    let nsri = 0;
    for (const r of nsrRows) {
      try {
        await pgPool.query(
          `INSERT INTO nvr_status_reports (id, building, submission_id, report_time, is_deleted)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.building || 'B2', r.submission_id || null, r.report_time, r.is_deleted || false]
        );
        nsri++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('nvr_status_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM nvr_status_reports))");
    console.log(`  -> ${nsri}/${nsrRows.length} nvr_status_reports`);

    // 15. nvr_status_report_details
    console.log('Migrating nvr_status_report_details...');
    const [nsdRows] = await mysqlConn.execute('SELECT * FROM nvr_status_report_details');
    let nsdi = 0;
    for (const r of nsdRows) {
      try {
        await pgPool.query(
          `INSERT INTO nvr_status_report_details (id, report_id, nvr_id, online_channels, created_at)
           VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_id, r.nvr_id, r.online_channels]
        );
        nsdi++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('nvr_status_report_details_id_seq', (SELECT COALESCE(MAX(id),1) FROM nvr_status_report_details))");
    console.log(`  -> ${nsdi}/${nsdRows.length} nvr_status_report_details`);

    // 16. cctv_report_details
    console.log('Migrating cctv_report_details...');
    const [crdRows] = await mysqlConn.execute('SELECT * FROM cctv_report_details');
    let crdi = 0;
    for (const r of crdRows) {
      try {
        await pgPool.query(
          `INSERT INTO cctv_report_details (id, report_id, nvr_name, online_channels, total_channels, channel_statuses_json, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_id, r.nvr_name, r.online_channels, r.total_channels || 0, r.channel_statuses_json]
        );
        crdi++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('cctv_report_details_id_seq', (SELECT COALESCE(MAX(id),1) FROM cctv_report_details))");
    console.log(`  -> ${crdi}/${crdRows.length} cctv_report_details`);

    // 17. parking_lot_counts
    console.log('Migrating parking_lot_counts...');
    const [plcRows] = await mysqlConn.execute('SELECT * FROM parking_lot_counts');
    let plci = 0;
    for (const r of plcRows) {
      try {
        await pgPool.query(
          `INSERT INTO parking_lot_counts (id, report_id, lot_name, vehicle_type, vehicle_count, created_at)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_id, r.lot_name, r.vehicle_type, r.vehicle_count, r.created_at]
        );
        plci++;
      } catch (e) {}
    }
    await pgPool.query("SELECT setval('parking_lot_counts_id_seq', (SELECT COALESCE(MAX(id),1) FROM parking_lot_counts))");
    console.log(`  -> ${plci}/${plcRows.length} parking_lot_counts`);

    console.log('\nMigration completed!');

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pgPool.end();
    await mysqlConn.end();
  }
}

migrate().catch(console.error);
