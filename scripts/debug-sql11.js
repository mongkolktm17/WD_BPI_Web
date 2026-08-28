const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump.sql');
let sql = fs.readFileSync(sqlFile, 'utf8');

sql = sql.replace(/\/\*![^]*?\*\//g, '');
sql = sql.replace(/SET\s+(?:@OLD_|NAMES|TIME_ZONE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|SQL_MODE|SQL_NOTES|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|COLLATION_CONNECTION)[^;]*;\s*/gi, '');

const createTableRegex = /CREATE\s+TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=[^;]*;/gi;
sql = sql.replace(createTableRegex, (match, tableName, columns) => `CREATE TABLE "${tableName}" (\n...\n);`);

sql = sql.replace(/LOCK\s+TABLES\s+`[^`]+`\s+WRITE;\s*/gi, '');
sql = sql.replace(/UNLOCK\s+TABLES;\s*/gi, '');

sql = sql.replace(/INSERT INTO `([^`]+)`/gi, 'INSERT INTO "$1"');
sql = sql.replace(/`([^`]+)`/g, '"$1"');

// Extract the section around cctv_report_details
const sectionStart = sql.lastIndexOf('UNLOCK TABLES;', 344600);
const sectionEnd = sql.indexOf('CREATE TABLE "cctv_reports"', 344600);
const section = sql.substring(sectionStart, sectionEnd);

console.log('BEFORE comment removal:');
console.log(section);

const cleaned = section.replace(/^--\s*.*$/gm, '');
console.log('\nAFTER comment removal:');
console.log(cleaned);

console.log('\nDROP TABLE preserved:', cleaned.includes('DROP TABLE IF EXISTS "cctv_report_details"'));
