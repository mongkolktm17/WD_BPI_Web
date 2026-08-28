const fs = require('fs');
let sql = fs.readFileSync('C:/xampp/htdocs/wdbpi/legacy/Backup/wddump.sql', 'utf8');

sql = sql.replace(/\/\*![^]*?\*\//g, '');
sql = sql.replace(/SET\s+(?:@OLD_|NAMES|TIME_ZONE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|SQL_MODE|SQL_NOTES|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|COLLATION_CONNECTION)[^;]*;\s*/gi, '');

const createTableRegex = /CREATE\s+TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=[^;]*;/gi;

let match;
let count = 0;
while ((match = createTableRegex.exec(sql)) !== null) {
  count++;
  const tableName = match[1];
  if (tableName === 'cctv_report_details') {
    console.log('Found cctv_report_details CREATE TABLE at index:', match.index);
    console.log('Full match length:', match[0].length);
    console.log('Match starts with:', match[0].substring(0, 100));
    console.log('Match ends with:', match[0].substring(match[0].length - 100));
    
    // Check what's before the match
    const before = sql.substring(match.index - 200, match.index);
    console.log('Before match:');
    console.log(before);
  }
}

console.log('Total CREATE TABLE matches:', count);
