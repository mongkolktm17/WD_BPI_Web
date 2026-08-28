const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg.sql');
const outputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_final.sql');

let sql = fs.readFileSync(inputFile, 'utf8');

// Remove LOCK/UNLOCK TABLES
sql = sql.replace(/LOCK\s+TABLES\s+"[^"]+"\s+WRITE;\s*/gi, '');
sql = sql.replace(/UNLOCK\s+TABLES;\s*/gi, '');

// Remove empty statements (lines with just semicolons)
sql = sql.replace(/^\s*;\s*$/gm, '');

// Remove MySQL header comments
sql = sql.replace(/^--\s*.*$/gm, '');

// Fix duplicate PRIMARY KEY when SERIAL PRIMARY KEY exists
sql = sql.replace(/"id"\s+SERIAL\s+PRIMARY\s+KEY,\s*\n\s*PRIMARY\s+KEY\s*\("id"\)/gi, '"id" SERIAL PRIMARY KEY');

// Remove extra blank lines (keep max 2 consecutive)
sql = sql.replace(/\n{4,}/g, '\n\n\n');

fs.writeFileSync(outputFile, sql);
console.log('Cleanup complete. Output:', outputFile);

// Validate
const lines = sql.split('\n');
const createCount = (sql.match(/CREATE TABLE/g) || []).length;
const insertCount = (sql.match(/INSERT INTO/g) || []).length;
console.log('CREATE TABLE statements:', createCount);
console.log('INSERT INTO statements:', insertCount);
console.log('Total lines:', lines.length);
