const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump.sql');
const OUT_FILE = path.join(__dirname, 'converted.sql');

let sql = fs.readFileSync(SQL_FILE, 'utf8');

// Remove MySQL conditional comments
sql = sql.replace(/\/\*!\d+ .*?\*\//g, '');

// Remove LOCK/UNLOCK
sql = sql.replace(/LOCK TABLES `[^`]+` WRITE;/g, '');
sql = sql.replace(/UNLOCK TABLES;/g, '');

// Convert backticks to double quotes
sql = sql.replace(/`/g, '"');

// ---- Remove ENTIRE lines that contain FK/INDEX/KEY patterns ----
// Process line by line for maximum control
const lines = sql.split('\n');
const out = [];
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Skip lines with FOREIGN KEY, CONSTRAINT...FK, REFERENCES in CREATE TABLE context
  if (/FOREIGN KEY/i.test(line)) continue;
  if (/REFERENCES\s+"/i.test(line)) continue;
  if (/CONSTRAINT\s+"[^"]+"_ibfk/i.test(line)) continue;
  
  // Convert UNIQUE KEY "name" (cols) -> UNIQUE (cols)
  line = line.replace(/UNIQUE\s+KEY\s+"[^"]+"\s*\(([^)]+)\)/gi, 'UNIQUE ($1)');
  
  // Remove KEY "name" (cols) lines (index definitions) - with or without leading comma
  if (/^\s*,?\s*KEY\s+"[^"]+"\s*\(/.test(line)) continue;
  if (/^\s*,?\s*INDEX\s+"[^"]+"\s*\(/.test(line)) continue;
  
  // Remove ON DELETE CASCADE/SET NULL
  line = line.replace(/ON\s+DELETE\s+CASCADE/gi, '');
  line = line.replace(/ON\s+DELETE\s+SET\s+NULL/gi, '');
  
  // Remove trailing comma before closing paren (from removed lines)
  out.push(line);
}

sql = out.join('\n');

// ---- Remove MySQL table options after closing ) ----
sql = sql.replace(/\)\s*COLLATE=[^;]+;/g, ');');
sql = sql.replace(/\)\s*ENGINE=[^;]+;/g, ');');
sql = sql.replace(/\)\s*DEFAULT\s+CHARSET=[^;]+;/g, ');');
sql = sql.replace(/\)\s*COMMENT='[^']+';/g, ');');
sql = sql.replace(/\)\s*AUTO_INCREMENT=[^;]+;/g, ');');

// Remove engine/charset/collate inline
sql = sql.replace(/ENGINE=InnoDB[^\s;)]*/g, '');
sql = sql.replace(/DEFAULT CHARSET=utf8mb4[^\s;)]*/g, '');
sql = sql.replace(/CHARACTER SET utf8mb4/g, '');
sql = sql.replace(/COLLATE utf8mb4_general_ci/g, '');
sql = sql.replace(/COLLATE utf8mb4_unicode_ci/g, '');
sql = sql.replace(/AUTO_INCREMENT=\d+/g, '');
sql = sql.replace(/COMMENT='[^']*'/g, '');

// ---- Fix data types ----
sql = sql.replace(/INT\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, 'SERIAL');
sql = sql.replace(/INT\s+AUTO_INCREMENT/gi, 'SERIAL');
sql = sql.replace(/INT\s+UNSIGNED\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, 'SERIAL');
sql = sql.replace(/INT\s+UNSIGNED\s+NOT\s+NULL/gi, 'INT NOT NULL');
sql = sql.replace(/INT\s+UNSIGNED/gi, 'INT');
sql = sql.replace(/UNSIGNED/gi, '');
sql = sql.replace(/TINYINT\(1\)/gi, 'SMALLINT');
sql = sql.replace(/TINYINT/gi, 'SMALLINT');
sql = sql.replace(/DATETIME/gi, 'TIMESTAMP');
sql = sql.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '');
sql = sql.replace(/ENUM\([^)]+\)/gi, 'VARCHAR(100)');

// ---- Fix DEFAULT values ----
sql = sql.replace(/DEFAULT\s+'0'/g, 'DEFAULT 0');
sql = sql.replace(/DEFAULT\s+'1'/g, 'DEFAULT 1');

// ---- Widen too-small columns ----
sql = sql.replace(/("building"\s+varchar\(10\))/gi, '"building" varchar(255)');
sql = sql.replace(/("shift"\s+varchar\(10\))/gi, '"shift" varchar(20)');
sql = sql.replace(/("report_time"\s+varchar\(5\))/gi, '"report_time" varchar(10)');
// Convert all varchar(N) to TEXT to avoid data length import issues
sql = sql.replace(/varchar\(\d+\)/gi, 'TEXT');

// ---- Clean up ----
// Remove trailing commas before );
sql = sql.replace(/,(\s*\))/g, '$1');

// Remove double semicolons
sql = sql.replace(/;\s*;/g, ';');

// Clean trailing whitespace
sql = sql.replace(/[ \t]+$/gm, '');

fs.writeFileSync(OUT_FILE, sql, 'utf8');
console.log(`Converted ${sql.length} bytes written to ${OUT_FILE}`);

// Verify
let fkCount = 0;
let autoIncCount = 0;
let uniqueKeyCount = 0;
let forKeyCount = 0;
const finalLines = sql.split('\n');
for (const line of finalLines) {
  if (/FOREIGN KEY/i.test(line)) fkCount++;
  if (/AUTO_INCREMENT/i.test(line) && !line.startsWith('--')) autoIncCount++;
  if (/UNIQUE\s+KEY/i.test(line)) uniqueKeyCount++;
  if (/^\s*,\s*KEY\s+"/i.test(line)) forKeyCount++;
}
console.log(`FK: ${fkCount}, AUTO_INCREMENT: ${autoIncCount}, UNIQUE KEY: ${uniqueKeyCount}, KEY: ${forKeyCount}`);
