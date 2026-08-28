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

// Find ALL occurrences of cctv_report_details
const regex = /cctv_report_details/g;
let match;
const occurrences = [];
while ((match = regex.exec(sql)) !== null) {
  occurrences.push({index: match.index, context: sql.substring(match.index - 30, match.index + 50)});
}

console.log('Total occurrences:', occurrences.length);
occurrences.slice(0, 10).forEach((o, i) => {
  console.log(`\nOccurrence ${i + 1} at ${o.index}:`);
  console.log(o.context);
});
