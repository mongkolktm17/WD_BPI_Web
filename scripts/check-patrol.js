const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'converted.sql'), 'utf8');

// Find patrol_reports INSERT
const idx = sql.indexOf('INSERT INTO "patrol_reports"');
const endIdx = sql.indexOf(';\n--', idx);
const insertSql = sql.substring(idx, endIdx);

const valStart = insertSql.indexOf('VALUES ') + 7;
const values = insertSql.substring(valStart);

// Parse rows
let rows = [];
let current = '';
let inStr = false;
let prevChar = '';

for (let i = 0; i < values.length; i++) {
  const ch = values[i];
  if (ch === "'" && prevChar !== '\\') {
    inStr = !inStr;
  }
  if (ch === ')' && !inStr && i + 1 < values.length && values[i + 1] === ',') {
    rows.push(current);
    current = '';
    i++;
    prevChar = ',';
    continue;
  }
  if (ch === ')' && !inStr && i + 1 >= values.length) {
    rows.push(current);
    current = '';
    prevChar = ch;
    continue;
  }
  current += ch;
  prevChar = ch;
}
if (current.trim()) rows.push(current);

console.log(`Found ${rows.length} rows`);

// Check ALL fields for any > 50 chars
let longCount = 0;
for (let r = 0; r < rows.length; r++) {
  const row = rows[r];
  let fields = [];
  let field = '';
  let inStr = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === "'" && (i === 0 || row[i - 1] !== '\\')) {
      inStr = !inStr;
      field += ch;
      continue;
    }
    if (ch === ',' && !inStr) {
      fields.push(field);
      field = '';
      continue;
    }
    field += ch;
  }
  fields.push(field);

  for (let j = 0; j < fields.length; j++) {
    const val = fields[j].replace(/^'|'$/g, '').replace(/\\'/g, "'");
    if (val.length > 50) {
      longCount++;
      if (longCount <= 10) {
        console.log(`Row ${r + 1}, field ${j} (${val.length} chars): "${val.substring(0, 80)}"`);
      }
    }
  }
}
console.log(`Total fields > 50 chars: ${longCount}`);
