const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump.sql');
const outputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_schema.sql');

let sql = fs.readFileSync(sqlFile, 'utf8');

// Remove MySQL-specific directives
sql = sql.replace(/\/\*![^]*?\*\//g, '');
sql = sql.replace(/SET\s+(?:@OLD_|NAMES|TIME_ZONE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|SQL_MODE|SQL_NOTES|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|COLLATION_CONNECTION)[^;]*;\s*/gi, '');

// Parse CREATE TABLE blocks manually
const createTableRegex = /CREATE\s+TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=[^;]*;/gi;

sql = sql.replace(createTableRegex, (match, tableName, columns) => {
  const columnDefs = [];
  const lines = columns.split('\n');
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;
    
    // Skip KEY, INDEX, CONSTRAINT definitions
    if (/^(KEY|INDEX|UNIQUE|CONSTRAINT|PRIMARY)/i.test(trimmed)) continue;
    
    // Convert column definition
    let col = trimmed
      .replace(/`/g, '"')
      .replace(/\s+COLLATE\s+\S+/gi, '');
    
    // Type conversions
    col = col.replace(/int\s+unsigned\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
    col = col.replace(/int\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
    col = col.replace(/int\s+NOT\s+NULL\s+DEFAULT\s+'(\d+)'/gi, 'INTEGER DEFAULT $1');
    col = col.replace(/int\s+NOT\s+NULL(?!\s+DEFAULT)/gi, 'INTEGER NOT NULL');
    col = col.replace(/int\s+unsigned/gi, 'INTEGER');
    col = col.replace(/int\s+UNSIGNED/gi, 'INTEGER');
    col = col.replace(/int\s+DEFAULT\s+NULL/gi, 'INTEGER');
    
  col = col.replace(/tinyint\(1\)\s+NOT\s+NULL\s+DEFAULT\s+'0'/gi, 'SMALLINT DEFAULT 0');
  col = col.replace(/tinyint\(1\)\s+NOT\s+NULL(?!\s+DEFAULT)/gi, 'SMALLINT NOT NULL');
  col = col.replace(/tinyint\(1\)\s+DEFAULT\s+'0'/gi, 'SMALLINT DEFAULT 0');
  col = col.replace(/tinyint\(1\)\s+DEFAULT\s+NULL/gi, 'SMALLINT');
  col = col.replace(/tinyint\(1\)/gi, 'SMALLINT');
    
    col = col.replace(/enum\([^)]+\)\s+NOT\s+NULL\s+DEFAULT\s+'[^']*'/gi, 'VARCHAR(50) DEFAULT NULL');
    col = col.replace(/enum\([^)]+\)\s+NOT\s+NULL/gi, 'VARCHAR(50) NOT NULL');
    col = col.replace(/enum\([^)]+\)/gi, 'VARCHAR(50)');
    
    col = col.replace(/text\s+NOT\s+NULL/gi, 'TEXT NOT NULL');
    col = col.replace(/text\s+DEFAULT\s+NULL/gi, 'TEXT');
    col = col.replace(/text/gi, 'TEXT');
    
    col = col.replace(/varchar\((\d+)\)\s+COLLATE\s+\S+\s+NOT\s+NULL/gi, 'VARCHAR($1) NOT NULL');
    col = col.replace(/varchar\((\d+)\)\s+NOT\s+NULL/gi, 'VARCHAR($1) NOT NULL');
    col = col.replace(/varchar\((\d+)\)\s+COLLATE\s+\S+\s+DEFAULT\s+NULL/gi, 'VARCHAR($1)');
    col = col.replace(/varchar\((\d+)\)\s+DEFAULT\s+NULL/gi, 'VARCHAR($1)');
    col = col.replace(/varchar\((\d+)\)/gi, 'VARCHAR($1)');
    
    col = col.replace(/timestamp\s+COLLATE\s+\S+\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    col = col.replace(/timestamp\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP(?:\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP)?/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    col = col.replace(/timestamp\s+COLLATE\s+\S+\s+NOT\s+NULL/gi, 'TIMESTAMP NOT NULL');
    col = col.replace(/timestamp\s+NOT\s+NULL/gi, 'TIMESTAMP NOT NULL');
    col = col.replace(/timestamp\s+COLLATE\s+\S+\s+DEFAULT\s+NULL/gi, 'TIMESTAMP');
    col = col.replace(/timestamp\s+DEFAULT\s+NULL/gi, 'TIMESTAMP');
    col = col.replace(/timestamp\s+COLLATE\s+\S+/gi, 'TIMESTAMP');
    col = col.replace(/timestamp/gi, 'TIMESTAMP');
    
    col = col.replace(/datetime\s+NOT\s+NULL/gi, 'TIMESTAMP NOT NULL');
    col = col.replace(/datetime\s+DEFAULT\s+NULL/gi, 'TIMESTAMP');
    
    col = col.replace(/date\s+NOT\s+NULL/gi, 'DATE NOT NULL');
    col = col.replace(/date\s+DEFAULT\s+NULL/gi, 'DATE');
    
    col = col.replace(/time\s+NOT\s+NULL/gi, 'TIME NOT NULL');
    
    col = col.replace(/float\s+NOT\s+NULL/gi, 'REAL NOT NULL');
    col = col.replace(/float\s+DEFAULT\s+NULL/gi, 'REAL');
    
    col = col.replace(/decimal\((\d+),\s*(\d+)\)\s+NOT\s+NULL/gi, 'NUMERIC($1,$2) NOT NULL');
    col = col.replace(/decimal\((\d+),\s*(\d+)\)\s+DEFAULT\s+NULL/gi, 'NUMERIC($1,$2)');
    
    if (col.trim()) {
      columnDefs.push('  ' + col);
    }
  }
  
  // Remove trailing commas and fix SERIAL PRIMARY KEY
  const finalCols = [];
  for (let i = 0; i < columnDefs.length; i++) {
    let col = columnDefs[i];
    const isLast = i === columnDefs.length - 1;
    
    if (col.includes('SERIAL PRIMARY KEY')) {
      finalCols.push(col);
    } else if (isLast) {
      finalCols.push(col.replace(/,+\s*$/, ''));
    } else {
      finalCols.push(col.replace(/,+\s*$/, '') + ',');
    }
  }
  
  return `CREATE TABLE "${tableName}" (\n${finalCols.join('\n')}\n);`;
});

// Remove LOCK/UNLOCK TABLES
sql = sql.replace(/LOCK\s+TABLES\s+`[^`]+`\s+WRITE;\s*/gi, '');
sql = sql.replace(/UNLOCK\s+TABLES;\s*/gi, '');

// Fix INSERT statements
sql = sql.replace(/INSERT INTO `([^`]+)`/gi, 'INSERT INTO "$1"');
sql = sql.replace(/`([^`]+)`/g, '"$1"');
sql = sql.replace(/'(\d+)'/g, (match, p1) => {
  if (p1 === '0') return 'FALSE';
  if (p1 === '1') return 'TRUE';
  return match;
});

// Remove MySQL comments and clean up
sql = sql.replace(/^--\s*.*$/gm, '');
sql = sql.replace(/^\s*;\s*$/gm, '');
sql = sql.replace(/\n{4,}/g, '\n\n\n');

// Wrap in legacy schema
const finalSql = 'CREATE SCHEMA IF NOT EXISTS legacy;\nSET search_path TO legacy;\n\n' + sql;

fs.writeFileSync(outputFile, finalSql);
console.log('Complete SQL generated:', outputFile);

const createCount = (finalSql.match(/CREATE TABLE/g) || []).length;
const insertCount = (finalSql.match(/INSERT INTO/g) || []).length;
const dupPk = (finalSql.match(/SERIAL PRIMARY KEY[^]*?PRIMARY KEY \(\"id\"\)/g) || []).length;
console.log('CREATE TABLE:', createCount);
console.log('INSERT INTO:', insertCount);
console.log('Duplicate PK patterns:', dupPk);
