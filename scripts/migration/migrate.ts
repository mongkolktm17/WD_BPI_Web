/**
 * Legacy MySQL -> PostgreSQL migrator.
 *
 * Reads directly from the legacy MySQL database and writes to PostgreSQL.
 * There is deliberately no SQL-dump parsing: production MySQL is clean utf8mb4
 * (verified 2026-09-07), and the dump-parsing path is what produced the earlier
 * Thai-text corruption documented in the old scripts/reimport-legacy.js.
 *
 * Usage:
 *   # tunnel the VPS database to localhost first
 *   ssh -N -L 3307:127.0.0.1:3306 wd &
 *
 *   npx ts-node scripts/migration/migrate.ts --dry-run
 *   npx ts-node scripts/migration/migrate.ts
 *   npx ts-node scripts/migration/migrate.ts --only=reports,users
 *
 * Env:
 *   MYSQL_URL     mysql://user:pass@127.0.0.1:3307/wdbpi_db
 *   DATABASE_URL  postgresql://user:pass@127.0.0.1:5432/wdbpi_db
 */

import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { TABLES, TableSpec, Row } from './table-map';

const BATCH = 1000;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1]?.split(',').map((s) => s.trim());

const MYSQL_URL = process.env.MYSQL_URL;
const DATABASE_URL = process.env.DATABASE_URL;

interface Result {
  source: string;
  target: string;
  expected: number;
  read: number;
  written: number;
  status: 'ok' | 'mismatch' | 'skipped' | 'blocked' | 'error';
  detail?: string;
}

/** Apply the spec's column renaming, dropping unmapped columns. */
function renameColumns(row: Row, columns?: Record<string, string>): Row {
  if (!columns) return { ...row };
  const out: Row = {};
  for (const [from, to] of Object.entries(columns)) {
    if (from in row) out[to] = row[from];
  }
  return out;
}

/** Turn a source row into zero or more target rows. */
function mapRow(row: Row, spec: TableSpec): Row[] {
  if (spec.expand) return spec.expand(row);
  const renamed = renameColumns(row, spec.columns);
  if (!spec.transform) return [renamed];
  // transform() on a spec without a column map receives the raw row.
  const result = spec.transform(spec.columns ? renamed : row);
  return result ? [result] : [];
}

async function insertBatch(pg: Client, target: string, rows: Row[]): Promise<number> {
  if (rows.length === 0) return 0;
  const cols = Object.keys(rows[0]);
  const params: any[] = [];
  const tuples = rows.map((r) => {
    const placeholders = cols.map((c) => {
      params.push(r[c] === undefined ? null : r[c]);
      return `$${params.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  const sql =
    `INSERT INTO "${target}" (${cols.map((c) => `"${c}"`).join(', ')}) ` +
    `VALUES ${tuples.join(', ')} ON CONFLICT DO NOTHING`;
  const res = await pg.query(sql, params);
  return res.rowCount ?? 0;
}

async function migrateTable(my: mysql.Connection, pg: Client, spec: TableSpec): Promise<Result> {
  const base = { source: spec.source, target: spec.target, expected: spec.expected, read: 0, written: 0 };

  if (spec.skip) return { ...base, status: 'skipped', detail: spec.skip };
  if (spec.blocked) return { ...base, status: 'blocked', detail: spec.blocked };

  const [countRows] = await my.query<any[]>(`SELECT COUNT(*) AS n FROM \`${spec.source}\``);
  const total = Number(countRows[0].n);

  let read = 0;
  let written = 0;

  for (let offset = 0; offset < total; offset += BATCH) {
    const [rows] = await my.query<any[]>(
      `SELECT * FROM \`${spec.source}\` ORDER BY id LIMIT ? OFFSET ?`,
      [BATCH, offset],
    );
    read += rows.length;

    const mapped: Row[] = [];
    for (const r of rows) mapped.push(...mapRow(r, spec));

    if (!DRY_RUN && mapped.length) {
      // Rows from an expand() can have differing key sets; group by shape.
      const byShape = new Map<string, Row[]>();
      for (const m of mapped) {
        const key = Object.keys(m).sort().join(',');
        if (!byShape.has(key)) byShape.set(key, []);
        byShape.get(key)!.push(m);
      }
      for (const group of byShape.values()) written += await insertBatch(pg, spec.target, group);
    } else {
      written += mapped.length;
    }
    process.stdout.write(`\r  ${spec.source} -> ${spec.target}: ${read}/${total}   `);
  }
  process.stdout.write('\r');

  const status = read === spec.expected ? 'ok' : 'mismatch';
  const detail = status === 'mismatch' ? `expected ${spec.expected}, read ${read}` : undefined;
  return { ...base, read, written, status, detail };
}

/** Keep serial sequences ahead of the explicit ids we just inserted. */
async function syncSequences(pg: Client, targets: string[]) {
  for (const t of new Set(targets)) {
    try {
      await pg.query(
        `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'),
                       COALESCE((SELECT MAX(id) FROM "${t}"), 1), true)`,
      );
    } catch (e: any) {
      console.warn(`  ! sequence sync failed for ${t}: ${e.message}`);
    }
  }
}

async function main() {
  if (!MYSQL_URL) throw new Error('MYSQL_URL is required');
  // A dry run only exercises the read + transform path, so it needs no Postgres.
  if (!DRY_RUN && !DATABASE_URL) throw new Error('DATABASE_URL is required');

  console.log(DRY_RUN ? '=== DRY RUN (no writes) ===\n' : '=== MIGRATION ===\n');

  const my = await mysql.createConnection({ uri: MYSQL_URL, charset: 'utf8mb4', dateStrings: true });

  let pg: Client = null as unknown as Client;
  if (!DRY_RUN) {
    pg = new Client({ connectionString: DATABASE_URL });
    await pg.connect();
    await pg.query("SET client_encoding TO 'UTF8'");
  }

  const specs = ONLY ? TABLES.filter((t) => ONLY.includes(t.source)) : TABLES;
  const results: Result[] = [];

  for (const spec of specs) {
    try {
      results.push(await migrateTable(my, pg, spec));
    } catch (e: any) {
      results.push({
        source: spec.source, target: spec.target, expected: spec.expected,
        read: 0, written: 0, status: 'error', detail: e.message,
      });
    }
  }

  if (!DRY_RUN) {
    await syncSequences(pg, results.filter((r) => r.status === 'ok' || r.status === 'mismatch').map((r) => r.target));
  }

  // ─── Report ───────────────────────────────────────────────────────────
  console.log('\n' + 'source'.padEnd(28) + 'target'.padEnd(26) + 'read'.padStart(8) + 'written'.padStart(9) + '  status');
  console.log('-'.repeat(82));
  for (const r of results) {
    console.log(
      r.source.padEnd(28) + r.target.padEnd(26) +
      String(r.read).padStart(8) + String(r.written).padStart(9) +
      '  ' + r.status.toUpperCase() + (r.detail ? ` — ${r.detail}` : ''),
    );
  }

  const blocked = results.filter((r) => r.status === 'blocked');
  const bad = results.filter((r) => r.status === 'error' || r.status === 'mismatch');
  console.log('-'.repeat(82));
  console.log(`ok=${results.filter((r) => r.status === 'ok').length}  ` +
              `skipped=${results.filter((r) => r.status === 'skipped').length}  ` +
              `blocked=${blocked.length}  mismatch/error=${bad.length}`);

  await my.end();
  if (!DRY_RUN) await pg.end();
  if (bad.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
