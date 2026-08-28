const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_final.sql');
const outputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_schema.sql');

let sql = fs.readFileSync(inputFile, 'utf8');

// Wrap everything in legacy schema
sql = 'CREATE SCHEMA IF NOT EXISTS legacy;\nSET search_path TO legacy;\n\n' + sql;

// Change all table references to legacy schema (for foreign keys if any remain)
// Actually, we removed all foreign keys, so this is just for safety

fs.writeFileSync(outputFile, sql);
console.log('Schema-wrapped SQL created:', outputFile);
