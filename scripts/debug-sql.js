const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/wdbpi/legacy/Backup/wddump.sql', 'utf8');

// Find cctv_report_details section
const idx = sql.indexOf('cctv_report_details');
console.log('Found at index:', idx);
console.log('Context:');
console.log(sql.substring(idx - 200, idx + 500));
