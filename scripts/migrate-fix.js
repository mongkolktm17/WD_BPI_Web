const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const MYSQL_CONFIG = { host: 'mysql', user: 'root', password: 'root_password', database: 'wdbpi_legacy' };
const PG_CONFIG = { host: 'postgres', port: 5432, user: 'wdbpi_user', password: 'wdbpi_pass', database: 'wdbpi_db' };

async function migrate() {
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
  const pgPool = new Pool(PG_CONFIG);
  console.log('Connected to both databases.');

  try {
    // 1. nvr_recording_reports (needs submitted_by_id NOT NULL)
    console.log('Migrating nvr_recording_reports...');
    const [nvrRows] = await mysqlConn.execute('SELECT * FROM nvr_recording_reports');
    let nvri = 0;
    for (const r of nvrRows) {
      try {
        await pgPool.query(
          `INSERT INTO nvr_recording_reports (id, building, submission_id, submitted_by_id, report_time)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.building, r.submission_id, r.submitted_by_id || 1, r.report_time]
        );
        nvri++;
      } catch (e) {
        if (nvri === 0) console.log(`  WARN: ${e.message.substring(0, 120)}`);
      }
    }
    await pgPool.query("SELECT setval('nvr_recording_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM nvr_recording_reports))");
    console.log(`  -> ${nvri}/${nvrRows.length} nvr_recording_reports`);

    // 2. cctv_reports (PG has no 'building' column)
    console.log('Migrating cctv_reports...');
    const [crRows] = await mysqlConn.execute('SELECT * FROM cctv_reports');
    let cri = 0;
    for (const r of crRows) {
      try {
        await pgPool.query(
          `INSERT INTO cctv_reports (id, report_date, total_normal, total_abnormal, reporter_name, remark, created_at, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_time, r.online_channels, r.offline_channels,
           'Unknown', null, r.report_time, r.is_deleted || false]
        );
        cri++;
      } catch (e) {
        if (cri === 0) console.log(`  WARN cctv_reports: ${e.message.substring(0, 120)}`);
      }
    }
    await pgPool.query("SELECT setval('cctv_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM cctv_reports))");
    console.log(`  -> ${cri}/${crRows.length} cctv_reports`);

    // 3. nvr_status_reports (PG has: report_time, total_channels, online_channels, offline_channels, online_percentage)
    console.log('Migrating nvr_status_reports...');
    const [nsrRows] = await mysqlConn.execute('SELECT * FROM nvr_status_reports');
    let nsri = 0;
    for (const r of nsrRows) {
      try {
        await pgPool.query(
          `INSERT INTO nvr_status_reports (id, report_time, total_channels, online_channels, offline_channels, online_percentage)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_time, r.total_channels, r.online_channels, r.offline_channels, r.online_percentage]
        );
        nsri++;
      } catch (e) {
        if (nsri === 0) console.log(`  WARN: ${e.message.substring(0, 120)}`);
      }
    }
    await pgPool.query("SELECT setval('nvr_status_reports_id_seq', (SELECT COALESCE(MAX(id),1) FROM nvr_status_reports))");
    console.log(`  -> ${nsri}/${nsrRows.length} nvr_status_reports`);

    // 4. nvr_status_report_details
    console.log('Migrating nvr_status_report_details...');
    const [nsdRows] = await mysqlConn.execute('SELECT * FROM nvr_status_report_details');
    let nsdi = 0;
    for (const r of nsdRows) {
      try {
        await pgPool.query(
          `INSERT INTO nvr_status_report_details (id, report_id, nvr_id, online_channels)
           VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_id, r.nvr_id, r.online_channels]
        );
        nsdi++;
      } catch (e) {
        if (nsdi === 0) console.log(`  WARN: ${e.message.substring(0, 120)}`);
      }
    }
    await pgPool.query("SELECT setval('nvr_status_report_details_id_seq', (SELECT COALESCE(MAX(id),1) FROM nvr_status_report_details))");
    console.log(`  -> ${nsdi}/${nsdRows.length} nvr_status_report_details`);

    // 5. cctv_report_details
    console.log('Migrating cctv_report_details...');
    const [crdRows] = await mysqlConn.execute('SELECT * FROM cctv_report_details');
    let crdi = 0;
    for (const r of crdRows) {
      try {
        await pgPool.query(
          `INSERT INTO cctv_report_details (id, report_id, nvr_name, online_channels, total_channels, channel_statuses_json)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.report_id, r.nvr_name, r.online_channels, r.total_channels || 0, r.channel_statuses_json]
        );
        crdi++;
      } catch (e) {
        if (crdi === 0) console.log(`  WARN: ${e.message.substring(0, 120)}`);
      }
    }
    await pgPool.query("SELECT setval('cctv_report_details_id_seq', (SELECT COALESCE(MAX(id),1) FROM cctv_report_details))");
    console.log(`  -> ${crdi}/${crdRows.length} cctv_report_details`);

    console.log('\nFix migration completed!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pgPool.end();
    await mysqlConn.end();
  }
}

migrate().catch(console.error);
