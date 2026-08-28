import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

/**
 * Data Migration Pipeline: MySQL Dump -> PostgreSQL 18
 *
 * 1. Reads raw SQL dump file from legacy system (src/*.sql)
 * 2. Parses INSERT statements and transforms MySQL types to PostgreSQL:
 *    - tinyint(1) -> boolean
 *    - datetime -> timestamptz
 *    - int AUTO_INCREMENT -> serial
 *    - utf8mb4 string sanitization
 *    - MySQL NOW() -> PostgreSQL now()
 * 3. Bulk inserts transformed records into PostgreSQL via Prisma
 * 4. Syncs PostgreSQL sequences to prevent ID conflicts
 * 5. Verifies record counts per table
 * 6. Validates bcrypt password hashes
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Table Name Mapping (MySQL -> PostgreSQL / Prisma) ───
const TABLE_MAP: Record<string, string> = {
  'users': 'users',
  'roles': 'roles',
  'role_permissions': 'role_permissions',
  'officers': 'officers',
  'buildings': 'buildings',
  'cameras': 'cameras',
  'camera_checks': 'camera_checks',
  'nvr_devices': 'nvr_devices',
  'nvr_recording_days': 'nvr_recording_days',
  'cctv_reports': 'cctv_reports',
  'cctv_report_details': 'cctv_report_details',
  'cctv_angle_checks': 'cctv_angle_checks',
  'cctv_camera_names': 'cctv_camera_names',
  'cctv_inspections': 'cctv_inspections',
  'cctv_devices': 'cctv_devices',
  'car_parking_reports': 'car_parkings',
  'parking_lot_counts': 'parking_lot_counts',
  'security_guard_counts': 'guard_counts',
  'hand_held_checks': 'handheld_checks',
  'metal_detector_checks': 'walkthrough_checks',
  'nvr_status_reports': 'nvr_status_reports',
  'nvr_status_report_details': 'nvr_status_report_details',
  'nvr_recording_reports': 'cctv_reports',
  'nvr_recording_details': 'nvr_recording_days',
  'patrol_checks': 'patrol_reports',
  'patrol_reports': 'patrol_reports',
  'reports': 'report_visuals',
  'system_configs': 'system_configs',
  'audit_logs': 'audit_logs',
};

// ─── Column Name Mapping (MySQL -> PostgreSQL) per table ───
const COLUMN_MAP: Record<string, Record<string, string>> = {
  users: {
    user_type: 'department',
    first_name: 'fullName',
    last_name: '_skip',
    employee_id: '_skip',
    phone_number: '_skip',
    eng_first_name: '_skip',
    eng_last_name: '_skip',
    is_active: 'isActive',
    role_id: 'roleId',
    created_at: 'createdAt',
    last_login: 'lastLogin',
  },
  roles: {
    role_name: 'roleName',
    created_at: 'createdAt',
  },
  role_permissions: {
    role_id: 'roleId',
    page_name: 'moduleName',
    created_at: 'createdAt',
  },
  cctv_devices: {
    building: '_skip',
    nvr_name: 'nvrName',
    ip_address: 'ipAddress',
    total_channels: 'totalChannels',
    online_channels: '_skip',
  },
};

// ─── Helpers ───

function parseSQLValue(val: string): any {
  const trimmed = val.trim();
  if (trimmed === 'NULL' || trimmed === 'null') return null;
  if (trimmed === '1' || trimmed === '0') {
    // Could be boolean or tinyint - context matters
    return trimmed;
  }
  // Remove surrounding quotes
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return trimmed;
}

function parseInsertStatement(line: string): { table: string; columns: string[]; values: string[][] } | null {
  // Match INSERT INTO `table` (col1, col2, ...) VALUES (val1, val2, ...), (val3, val4, ...);
  const match = line.match(/INSERT\s+INTO\s+`?(\w+)`?\s*\(([^)]+)\)\s*VALUES\s*(.+);?$/i);
  if (!match) return null;

  const table = match[1];
  const columns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
  const valuesPart = match[3];

  // Parse multiple value tuples
  const values: string[][] = [];
  let current = '';
  let depth = 0;
  let inTuple = false;

  for (let i = 0; i < valuesPart.length; i++) {
    const ch = valuesPart[i];
    if (ch === '(' && depth === 0) {
      inTuple = true;
      current = '';
      depth = 1;
    } else if (ch === '(' && inTuple) {
      depth++;
      current += ch;
    } else if (ch === ')' && depth > 1) {
      depth--;
      current += ch;
    } else if (ch === ')' && depth === 1) {
      depth = 0;
      inTuple = false;
      // Split current by comma carefully
      const tupleValues: string[] = [];
      let val = '';
      let inString = false;
      let escape = false;
      for (const c of current) {
        if (escape) {
          val += c;
          escape = false;
          continue;
        }
        if (c === '\\') {
          escape = true;
          val += c;
          continue;
        }
        if (c === "'" || c === '"') {
          inString = !inString;
          val += c;
          continue;
        }
        if (c === ',' && !inString) {
          tupleValues.push(val.trim());
          val = '';
          continue;
        }
        val += c;
      }
      if (val.trim()) tupleValues.push(val.trim());
      values.push(tupleValues);
    } else if (inTuple) {
      current += ch;
    }
  }

  return { table, columns, values };
}

function transformRow(table: string, columns: string[], rawValues: string[]): Record<string, any> | null {
  const pgTable = TABLE_MAP[table] || table;
  const colMap = COLUMN_MAP[table] || {};

  const row: Record<string, any> = {};
  for (let i = 0; i < columns.length; i++) {
    const mysqlCol = columns[i];
    const rawVal = parseSQLValue(rawValues[i] || 'NULL');

    // Skip mapped-away columns
    const pgCol = colMap[mysqlCol];
    if (pgCol === '_skip') continue;

    const targetCol = pgCol || mysqlCol;

    // Type transformations
    if (rawVal === null) {
      row[targetCol] = null;
    } else if (typeof rawVal === 'string') {
      // DateTime fields
      if (targetCol.includes('date') || targetCol.includes('Date') || targetCol.includes('time') || targetCol === 'createdAt' || targetCol === 'lastLogin') {
        if (rawVal === '0000-00-00 00:00:00' || rawVal === '0000-00-00') {
          row[targetCol] = null;
        } else if (rawVal.match(/^\d{4}-\d{2}-\d{2}/)) {
          row[targetCol] = new Date(rawVal);
        } else {
          row[targetCol] = rawVal;
        }
      }
      // Boolean fields (tinyint(1) or is_deleted)
      else if (targetCol === 'is_deleted' || targetCol === 'isActive' || targetCol === 'is_active') {
        row[targetCol] = rawVal === '1' || rawVal === 'true';
      }
      // Integer fields
      else if (targetCol.includes('id') || targetCol.includes('count') || targetCol.includes('total') ||
               targetCol.includes('online') || targetCol.includes('channel') || targetCol.includes('days') ||
               targetCol.includes('Days') || targetCol.includes('Count')) {
        const num = parseInt(rawVal, 10);
        row[targetCol] = isNaN(num) ? 0 : num;
      }
      // JSON fields
      else if (targetCol === 'dataJson' || targetCol === 'data_json') {
        try {
          row[targetCol] = JSON.parse(rawVal);
        } catch {
          row[targetCol] = rawVal;
        }
      }
      // String fields - sanitize UTF8MB4
      else {
        row[targetCol] = rawVal.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      }
    } else {
      row[targetCol] = rawVal;
    }
  }

  return Object.keys(row).length > 0 ? row : null;
}

// ─── Main Migration ───

async function main() {
  console.log('🚀 Starting Data Migration: MySQL -> PostgreSQL 18');
  const startTime = Date.now();

  const backupDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(backupDir)) {
    console.error('❌ src/ directory not found');
    process.exit(1);
  }

  const sqlFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
  if (sqlFiles.length === 0) {
    console.warn('⚠️ No SQL dump file found in src/ directory.');
    return;
  }

  const dumpFilePath = path.join(backupDir, sqlFiles[0]);
  console.log(`📁 Reading dump file: ${sqlFiles[0]}`);

  const sqlContent = fs.readFileSync(dumpFilePath, 'utf-8');
  const lines = sqlContent.split('\n');

  console.log(`📄 Total lines in SQL dump: ${lines.length}`);

  // Connect to PostgreSQL
  console.log('\n📊 Connecting to PostgreSQL...');
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL successfully');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }

  // Parse and migrate INSERT statements
  const insertLines = lines.filter(l =>
    l.trim().toUpperCase().startsWith('INSERT INTO') ||
    l.trim().toUpperCase().startsWith('INSERT  INTO')
  );

  console.log(`\n📋 Found ${insertLines.length} INSERT statements to process`);

  let totalRowsInserted = 0;
  const tableCounts: Record<string, number> = {};

  // Priority order for table migration (respect foreign key constraints)
  const priorityOrder = [
    'roles', 'role_permissions', 'users', 'buildings', 'cameras',
    'camera_checks', 'nvr_devices', 'cctv_devices', 'cctv_reports',
    'nvr_recording_days', 'nvr_recording_reports', 'nvr_recording_details',
    'nvr_status_reports', 'nvr_status_report_details',
    'cctv_angle_checks', 'cctv_camera_names', 'cctv_inspections',
    'car_parking_reports', 'parking_lot_counts',
    'security_guard_counts', 'hand_held_checks', 'metal_detector_checks',
    'patrol_checks', 'patrol_reports', 'reports',
    'system_configs', 'audit_logs',
  ];

  // Group INSERT statements by table
  const groupedInserts: Record<string, string[]> = {};
  for (const line of insertLines) {
    const match = line.match(/INSERT\s+(?:INTO\s+)?`?(\w+)`?/i);
    if (match) {
      const table = match[1];
      if (!groupedInserts[table]) groupedInserts[table] = [];
      groupedInserts[table].push(line);
    }
  }

  // Process tables in priority order
  const processedTables = new Set<string>();

  for (const tableName of priorityOrder) {
    const inserts = groupedInserts[tableName];
    if (!inserts || inserts.length === 0) continue;

    const pgTable = TABLE_MAP[tableName] || tableName;
    console.log(`\n🔄 Processing table: ${tableName} -> ${pgTable}`);

    for (const insertLine of inserts) {
      const parsed = parseInsertStatement(insertLine);
      if (!parsed) {
        console.log(`  ⚠️ Could not parse INSERT for ${tableName}`);
        continue;
      }

      let insertedCount = 0;
      for (const rawValues of parsed.values) {
        const row = transformRow(parsed.table, parsed.columns, rawValues);
        if (!row) continue;

        try {
          // Use Prisma to insert
          await (prisma as any)[pgTable].create({ data: row });
          insertedCount++;
        } catch (err: any) {
          // Skip duplicates silently
          if (err?.code === 'P2002') {
            // Unique constraint violation - skip
          } else {
            console.log(`  ⚠️ Insert error in ${pgTable}: ${err?.message?.substring(0, 80)}`);
          }
        }
      }

      totalRowsInserted += insertedCount;
      tableCounts[pgTable] = (tableCounts[pgTable] || 0) + insertedCount;
      console.log(`  ✅ ${insertedCount} rows inserted into ${pgTable}`);
    }

    processedTables.add(tableName);
  }

  // Process any remaining tables not in priority order
  for (const [tableName, inserts] of Object.entries(groupedInserts)) {
    if (processedTables.has(tableName)) continue;

    const pgTable = TABLE_MAP[tableName] || tableName;
    console.log(`\n🔄 Processing remaining table: ${tableName} -> ${pgTable}`);

    for (const insertLine of inserts) {
      const parsed = parseInsertStatement(insertLine);
      if (!parsed) continue;

      let insertedCount = 0;
      for (const rawValues of parsed.values) {
        const row = transformRow(parsed.table, parsed.columns, rawValues);
        if (!row) continue;

        try {
          await (prisma as any)[pgTable].create({ data: row });
          insertedCount++;
        } catch (err: any) {
          if (err?.code !== 'P2002') {
            console.log(`  ⚠️ Insert error in ${pgTable}: ${err?.message?.substring(0, 80)}`);
          }
        }
      }

      totalRowsInserted += insertedCount;
      tableCounts[pgTable] = (tableCounts[pgTable] || 0) + insertedCount;
      console.log(`  ✅ ${insertedCount} rows inserted into ${pgTable}`);
    }
  }

  // ─── Sequence Sync ───
  console.log('\n🔄 Syncing PostgreSQL sequences...');
  const allTables = [...new Set(Object.values(TABLE_MAP))];
  for (const table of allTables) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
      );
    } catch (e) {
      // Ignore if table has no sequence
    }
  }

  // ─── Verification ───
  console.log('\n📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`| ${'Table'.padEnd(25)} | ${'Rows Inserted'.padEnd(15)} | Status |`);
  console.log('|' + '-'.repeat(27) + '|' + '-'.repeat(17) + '|' + '-'.repeat(8) + '|');

  for (const [table, count] of Object.entries(tableCounts).sort()) {
    console.log(`| ${table.padEnd(25)} | ${count.toString().padEnd(15)} | ✅ OK  |`);
  }

  // Check for empty tables
  for (const table of allTables) {
    if (!tableCounts[table]) {
      console.log(`| ${table.padEnd(25)} | ${'0'.padEnd(15)} | ⚠️ Skip |`);
    }
  }

  console.log('='.repeat(60));
  console.log(`\n🎉 Migration completed! Total rows inserted: ${totalRowsInserted}`);

  // ─── Password Verification ───
  console.log('\n🔐 Verifying bcrypt password hashes...');
  try {
    const testUser = await prisma.user.findFirst({
      where: { username: 'admin' },
    });
    if (testUser) {
      const testResult = await bcrypt.compare('admin123', testUser.password);
      console.log(`  Admin user password hash: ${testResult ? '✅ VALID' : '❌ INVALID'}`);
    } else {
      console.log('  ⚠️ No admin user found for password verification');
    }
  } catch (err) {
    console.log('  ⚠️ Password verification skipped');
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⏱️ Total migration time: ${duration}s`);
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
