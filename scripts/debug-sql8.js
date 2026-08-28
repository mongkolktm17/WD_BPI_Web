const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump.sql');
let sql = fs.readFileSync(sqlFile, 'utf8');

sql = sql.replace(/\/\*![^]*?\*\//g, '');
sql = sql.replace(/SET\s+(?:@OLD_|NAMES|TIME_ZONE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|SQL_MODE|SQL_NOTES|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|COLLATION_CONNECTION)[^;]*;\s*/gi, '');

const createTableRegex = /CREATE\s+TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=[^;]*;/gi;

sql = sql.replace(createTableRegex, (match, tableName, columns) => {
  return `CREATE TABLE "${tableName}" (\n...\n);`;
});

sql = sql.replace(/LOCK\s+TABLES\s+`[^`]+`\s+WRITE;\s*/gi, '');
sql = sql.replace(/UNLOCK\s+TABLES;\s*/gi, '');

sql = sql.replace(/INSERT INTO `([^`]+)`/gi, 'INSERT INTO "$1"');
sql = sql.replace(/`([^`]+)`/g, '"$1"');

// Before comment removal
const idxBefore = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('Before comment removal - found:', idxBefore >= 0);
if (idxBefore >= 0) {
  console.log('Context before removal:');
  const lines = sql.substring(idxBefore - 100, idxBefore + 100).split('\n');
  lines.forEach((l, i) => console.log((i) + ': ' + JSON.stringify(l)));
}

// Remove comments
sql = sql.replace(/^--\s*.*$/gm, '');

// After comment removal
const idxAfter = sql.indexOf('DROP TABLE IF EXISTS "cctv_report_details"');
console.log('\nAfter comment removal - found:', idxAfter >= 0);
if (idxAfter >= 0) {
  console.log('Context after removal:');
  const lines = sql.substring(idxAfter - 100, idxAfter + 100).split('\n');
  lines.forEach((l, i) => console.log((i) + ': ' + JSON.stringify(l)));
} else {
  console.log('Searching for partial match...');
  const idxPartial = sql.indexOf('cctv_report_details');
  console.log('Partial match at:', idxPartial);
  if (idxPartial >= 0) {
    console.log('Context:');
    const lines = sql.substring(idxPartial - 100, idxPartial + 200).split('\n');
    lines.forEach((l, i) => console.log((i) + ': ' + JSON.stringify(l)));
  }
}
