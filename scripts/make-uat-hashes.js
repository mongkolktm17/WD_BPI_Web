// สร้าง bcrypt hash สำหรับบัญชี UAT (รัน: node scripts\make-uat-hashes.js)
// คัดลอกค่าที่ได้ไปใส่ใน docs\uat\seed-uat-users.sql
const bcrypt = require('../node_modules/bcrypt');

console.log('ADMIN_HASH=' + bcrypt.hashSync('admin123', 10));
console.log('OFFICER_HASH=' + bcrypt.hashSync('officer123', 10));
