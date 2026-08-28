const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/wdbpi/legacy/Backup/wddump_pg_schema.sql', 'utf8');
const idx = sql.indexOf('CREATE TABLE "cctv_report_details"');
console.log('CREATE TABLE at index:', idx);
console.log('Previous 300 chars:');
console.log(sql.substring(idx - 300, idx));
