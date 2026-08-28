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

const idx = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
if (idx >= 0) {
  const lineStart = sql.lastIndexOf('\n', idx) + 1;
  const lineEnd = sql.indexOf('\n', idx);
  const line = sql.substring(lineStart, lineEnd);
  console.log('DROP TABLE line:');
  console.log('  Raw:', JSON.stringify(line));
  console.log('  Length:', line.length);
  console.log('  Starts with "--":', line.startsWith('--'));
  console.log('  First 10 chars:', JSON.stringify(line.substring(0, 10)));
  
  // Test regex
  const regex = /^--\s*.*$/gm;
  const matches = line.match(regex);
  console.log('  Matches comment regex:', !!matches);
}
