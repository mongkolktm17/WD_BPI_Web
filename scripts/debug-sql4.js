const fs = require('fs');
let sql = fs.readFileSync('C:/xampp/htdocs/wdbpi/legacy/Backup/wddump.sql', 'utf8');

// Step 1: Remove /*! ... */ blocks
sql = sql.replace(/\/\*![^]*?\*\//g, '');

// Step 2: Remove SET statements
sql = sql.replace(/SET\s+(?:@OLD_|NAMES|TIME_ZONE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|SQL_MODE|SQL_NOTES|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|COLLATION_CONNECTION)[^;]*;\s*/gi, '');

const idx = sql.indexOf('cctv_report_details');
console.log('After SET removal - cctv_report_details at:', idx);
console.log('Context:');
console.log(sql.substring(idx - 200, idx + 200));
