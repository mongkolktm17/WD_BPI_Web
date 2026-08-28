const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/wdbpi/legacy/Backup/wddump_pg_schema.sql', 'utf8');

const nullPattern = /PRIMARY KEY \(\"id\"\) NULL/g;
const dupPkPattern = /SERIAL PRIMARY KEY[\s\S]*?PRIMARY KEY \(\"id\"\)/g;

console.log('NULL patterns:', sql.match(nullPattern)?.length ?? 0);
console.log('Duplicate PK patterns:', sql.match(dupPkPattern)?.length ?? 0);
