const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump.sql');
const outputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_schema.sql');

let sql = fs.readFileSync(sqlFile, 'utf8');

console.log('Step 0: Original length', sql.length);

// Step 1: Remove MySQL-specific comment blocks
sql = sql.replace(/\/\*![^]*?\*\//g, '');
console.log('Step 1: After /*! removal, length', sql.length);

// Check DROP TABLE
const idx1 = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('DROP TABLE found after step 1:', idx1 >= 0);

// Step 2: Remove SET statements
sql = sql.replace(/SET\s+(?:@OLD_|NAMES|TIME_ZONE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|SQL_MODE|SQL_NOTES|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|COLLATION_CONNECTION)[^;]*;\s*/gi, '');
console.log('Step 2: After SET removal, length', sql.length);

const idx2 = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('DROP TABLE found after step 2:', idx2 >= 0);

// Step 3: Convert CREATE TABLE blocks
const createTableRegex = /CREATE\s+TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=[^;]*;/gi;

sql = sql.replace(createTableRegex, (match, tableName, columns) => {
  // ... simplified replacement
  return `CREATE TABLE "${tableName}" (\n...\n);`;
});

console.log('Step 3: After CREATE TABLE replacement, length', sql.length);
const idx3 = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('DROP TABLE found after step 3:', idx3 >= 0);
if (idx3 >= 0) {
  console.log('Context:', sql.substring(idx3 - 50, idx3 + 100));
}

// Step 4: Remove LOCK/UNLOCK TABLES
sql = sql.replace(/LOCK\s+TABLES\s+`[^`]+`\s+WRITE;\s*/gi, '');
sql = sql.replace(/UNLOCK\s+TABLES;\s*/gi, '');

console.log('Step 4: After LOCK/UNLOCK removal, length', sql.length);
const idx4 = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('DROP TABLE found after step 4:', idx4 >= 0);

// Step 5: Fix INSERT statements
sql = sql.replace(/INSERT INTO `([^`]+)`/gi, 'INSERT INTO "$1"');
sql = sql.replace(/`([^`]+)`/g, '"$1"');

console.log('Step 5: After INSERT/backtick fix, length', sql.length);
const idx5 = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('DROP TABLE found after step 5:', idx5 >= 0);

// Step 6: Remove MySQL comments
sql = sql.replace(/^--\s*.*$/gm, '');

console.log('Step 6: After comment removal, length', sql.length);
const idx6 = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('DROP TABLE found after step 6:', idx6 >= 0);

// Step 7: Clean up
sql = sql.replace(/^\s*;\s*$/gm, '');

console.log('Step 7: After empty semicolon removal, length', sql.length);
const idx7 = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('DROP TABLE found after step 7:', idx7 >= 0);
