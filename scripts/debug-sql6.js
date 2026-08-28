const fs = require('fs');
let sql = fs.readFileSync('C:/xampp/htdocs/wdbpi/legacy/Backup/wddump.sql', 'utf8');

sql = sql.replace(/\/\*![^]*?\*\//g, '');
sql = sql.replace(/SET\s+(?:@OLD_|NAMES|TIME_ZONE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|SQL_MODE|SQL_NOTES|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|COLLATION_CONNECTION)[^;]*;\s*/gi, '');

const createTableRegex = /CREATE\s+TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=[^;]*;/gi;

const result = sql.replace(createTableRegex, (match, tableName, columns) => {
  console.log('Processing table:', tableName);
  return `CREATE TABLE "${tableName}" (\n...\n);`;
});

const idx = result.indexOf('cctv_report_details');
console.log('\nAfter replacement - cctv_report_details context:');
console.log(result.substring(idx - 200, idx + 200));
