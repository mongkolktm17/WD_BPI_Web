const fs = require('fs');
let sql = fs.readFileSync('C:/xampp/htdocs/wdbpi/legacy/Backup/wddump.sql', 'utf8');

// Step 1: Remove /*! ... */ blocks
const before1 = sql.length;
sql = sql.replace(/\/\*![^]*?\*\//g, '');
const after1 = sql.length;
console.log('Removed', before1 - after1, 'chars from /*! blocks');

// Check if DROP TABLE for cctv_report_details still exists
const idx = sql.indexOf('cctv_report_details');
console.log('cctv_report_details found at:', idx);
console.log('Context around it:');
console.log(sql.substring(idx - 200, idx + 200));
