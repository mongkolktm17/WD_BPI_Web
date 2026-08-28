const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_final.sql');
const outputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_schema.sql');

let sql = fs.readFileSync(inputFile, 'utf8');

// Split into lines for processing
const lines = sql.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Skip lines that are just semicolons
  if (line.trim() === ';') continue;
  
  // Skip MySQL header comments
  if (line.trim().startsWith('--') && (line.includes('MySQL dump') || line.includes('Server version') || line.includes('Host:') || line.includes('Distrib') || line.includes('Dump completed'))) continue;
  
  fixedLines.push(line);
}

sql = fixedLines.join('\n');

// Fix duplicate PRIMARY KEY - remove standalone PRIMARY KEY ("id") lines that follow SERIAL PRIMARY KEY
sql = sql.replace(/"id"\s+SERIAL\s+PRIMARY\s+KEY,\s*\n\s*PRIMARY\s+KEY\s*\("id"\)/gi, '"id" SERIAL PRIMARY KEY');
sql = sql.replace(/"id"\s+SERIAL\s+PRIMARY\s+KEY\s*\n\s*PRIMARY\s+KEY\s*\("id"\)/gi, '"id" SERIAL PRIMARY KEY');

// Fix PRIMARY KEY ("id") NULL -> remove NULL
sql = sql.replace(/PRIMARY KEY \(\"id\"\)\s+NULL/gi, 'PRIMARY KEY ("id")');

// Remove duplicate PRIMARY KEY when SERIAL PRIMARY KEY exists (multiline)
const createTableRegex = /CREATE\s+TABLE\s+"([^"]+)"\s*\(([\s\S]*?)\)\s*;/gi;
sql = sql.replace(createTableRegex, (match, tableName, columns) => {
  const columnLines = columns.split('\n');
  const fixedCols = [];
  let hasSerialPk = false;
  
  for (let line of columnLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('"id"') && trimmed.includes('SERIAL PRIMARY KEY')) {
      hasSerialPk = true;
      fixedCols.push(line);
      continue;
    }
    if (hasSerialPk && trimmed.startsWith('PRIMARY KEY')) {
      continue; // Skip duplicate PRIMARY KEY
    }
    fixedCols.push(line);
  }
  
  return `CREATE TABLE "${tableName}" (\n${fixedCols.join('\n')}\n);`;
});

// Wrap in legacy schema
const finalSql = 'CREATE SCHEMA IF NOT EXISTS legacy;\nSET search_path TO legacy;\n\n' + sql;

fs.writeFileSync(outputFile, finalSql);
console.log('Fixed SQL created:', outputFile);

// Validate
const createCount = (finalSql.match(/CREATE TABLE/g) || []).length;
const insertCount = (finalSql.match(/INSERT INTO/g) || []).length;
const duplicatePk = (finalSql.match(/PRIMARY KEY \(\"id\"\)\s*\n\s*PRIMARY KEY/g) || []).length;
console.log('CREATE TABLE statements:', createCount);
console.log('INSERT INTO statements:', insertCount);
console.log('Remaining duplicate PK patterns:', duplicatePk);
