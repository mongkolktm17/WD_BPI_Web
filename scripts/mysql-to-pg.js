const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SQL_FILE = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump.sql');

const pool = new Pool({
  connectionString: 'postgresql://wdbpi_user:wdbpi_pass@127.0.0.1:5432/wdbpi_db?schema=public',
});

function convertToPostgres(sql) {
  let out = sql;

  out = out.replace(/\/\*!\d+ .*?\*\//g, '');
  out = out.replace(/LOCK TABLES `[^`]+` WRITE;/g, '');
  out = out.replace(/UNLOCK TABLES;/g, '');

  out = out.replace(/`([^`]+)`/g, '"$1"');

  out = out.replace(/ENGINE=InnoDB[^\s;)]*/g, '');
  out = out.replace(/DEFAULT CHARSET=utf8mb4[^\s;)]*/g, '');
  out = out.replace(/COLLATE utf8mb4_[^\s;,)]*/g, '');
  out = out.replace(/COLLATE utf8mb4_general_ci/g, '');
  out = out.replace(/COLLATE utf8mb4_unicode_ci/g, '');

  out = out.replace(/INT NOT NULL AUTO_INCREMENT/g, 'SERIAL');
  out = out.replace(/INT AUTO_INCREMENT/g, 'SERIAL');
  out = out.replace(/INT UNSIGNED NOT NULL AUTO_INCREMENT/g, 'SERIAL');
  out = out.replace(/INT UNSIGNED NOT NULL/g, 'INT NOT NULL');
  out = out.replace(/INT UNSIGNED/g, 'INT');

  out = out.replace(/TINYINT\(1\)/g, 'SMALLINT');
  out = out.replace(/TINYINT/g, 'SMALLINT');

  out = out.replace(/DATETIME/g, 'TIMESTAMP');
  out = out.replace(/ON UPDATE CURRENT_TIMESTAMP/g, '');

  out = out.replace(/,?\s*AUTO_INCREMENT=\d+/g, '');

  out = out.replace(/,\s*\)\s*;/g, '\n);');

  out = out.replace(/UNSIGNED/g, '');

  out = out.replace(/ENUM\(([^)]+)\)/g, (match, vals) => {
    return `VARCHAR(50)`;
  });

  out = out.replace(/ON DELETE CASCADE/g, '');
  out = out.replace(/ON DELETE SET NULL/g, '');
  out = out.replace(/FOREIGN KEY[^,)]+/g, '');
  out = out.replace(/CONSTRAINT "[^"]+"_ibfk_\d+/g, '');
  out = out.replace(/PRIMARY KEY/g, 'PRIMARY KEY');

  out = out.replace(/,\s*KEY\s+"[^"]+"\s*\([^)]+\)/g, '');
  out = out.replace(/,\s*UNIQUE KEY\s+"[^"]+"\s*\([^)]+\)/g, '');
  out = out.replace(/,\s*INDEX\s+"[^"]+"\s*\([^)]+\)/g, '');
  out = out.replace(/UNIQUE KEY\s+"[^"]+"\s*\(([^)]+)\)/g, 'UNIQUE ($1)');

  return out;
}

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let parenDepth = 0;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && sql[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '(') {
      parenDepth++;
      current += ch;
      continue;
    }

    if (ch === ')') {
      parenDepth--;
      current += ch;
      continue;
    }

    if (ch === ';' && parenDepth === 0) {
      current += ch;
      const trimmed = current.trim();
      if (trimmed && trimmed !== ';') {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function importSQL() {
  console.log('Reading SQL file...');
  const raw = fs.readFileSync(SQL_FILE, 'utf8');

  console.log('Converting MySQL syntax to PostgreSQL...');
  const converted = convertToPostgres(raw);

  const tmpPath = path.join(__dirname, 'converted.sql');
  fs.writeFileSync(tmpPath, converted, 'utf8');
  console.log(`Converted SQL written to: ${tmpPath}`);

  const statements = splitStatements(converted);
  console.log(`Found ${statements.length} statements`);

  const client = await pool.connect();
  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      if (stmt.match(/^(CREATE TABLE|INSERT INTO|DROP TABLE)/)) {
        const preview = stmt.substring(0, 100).replace(/\n/g, ' ');
        try {
          await client.query(stmt);
          if (stmt.startsWith('CREATE TABLE')) {
            const tableName = stmt.match(/CREATE TABLE "?(\w+)"?/)?.[1] || 'unknown';
            console.log(`  [${i + 1}/${statements.length}] Created table: ${tableName}`);
          } else if (stmt.startsWith('INSERT INTO')) {
            const tableName = stmt.match(/INSERT INTO "?(\w+)"?/)?.[1] || 'unknown';
            const rowCount = (stmt.match(/\),/g) || []).length + 1;
            console.log(`  [${i + 1}/${statements.length}] Inserted into ${tableName} (~${rowCount} rows)`);
          } else if (stmt.startsWith('DROP TABLE')) {
            const tableName = stmt.match(/DROP TABLE "?(\w+)"?/)?.[1] || 'unknown';
            console.log(`  [${i + 1}/${statements.length}] Dropped table: ${tableName}`);
          }
        } catch (err) {
          if (err.code === '42P01') {
            console.log(`  [${i + 1}] SKIPPED (relation not found): ${stmt.substring(0, 80)}...`);
          } else {
            console.error(`  [${i + 1}] ERROR: ${err.message}`);
            console.error(`  SQL: ${stmt.substring(0, 200)}...`);
          }
        }
      }
    }
    console.log('\nImport completed!');
  } finally {
    client.release();
    await pool.end();
  }
}

importSQL().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
