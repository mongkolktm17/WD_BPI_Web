const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_schema.sql');
const outputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_schema.sql');

let sql = fs.readFileSync(inputFile, 'utf8');

// Fix trailing commas before closing parenthesis in CREATE TABLE
// This regex finds the last column line before ); and removes trailing comma
sql = sql.replace(/(,\s*)\n(\s*)\);/g, '\n$2);');

// More robust: for each CREATE TABLE block, remove trailing comma from last column
const createTableRegex = /CREATE\s+TABLE\s+"([^"]+)"\s*\(([\s\S]*?)\)\s*;/gi;

sql = sql.replace(createTableRegex, (match, tableName, columns) => {
  const columnLines = columns.split('\n');
  
  // Find last non-empty line that is a column definition or constraint
  let lastColIdx = -1;
  for (let i = columnLines.length - 1; i >= 0; i--) {
    const trimmed = columnLines[i].trim();
    if (trimmed && !trimmed.startsWith('--') && trimmed !== '') {
      lastColIdx = i;
      break;
    }
  }
  
  if (lastColIdx >= 0) {
    let lastLine = columnLines[lastColIdx];
    // Remove trailing comma if present
    if (lastLine.trim().endsWith(',')) {
      columnLines[lastColIdx] = lastLine.replace(/,+$/, '');
    }
  }
  
  return `CREATE TABLE "${tableName}" (\n${columnLines.join('\n')}\n);`;
});

fs.writeFileSync(outputFile, sql);
console.log('Fixed trailing commas in:', outputFile);

// Quick validation
const testMatch = sql.match(/CREATE\s+TABLE\s+"[^"]+"\s*\([\s\S]*?,\s*\);/g);
if (testMatch) {
  console.log('WARNING: Still found trailing comma patterns:', testMatch.length);
} else {
  console.log('No trailing comma patterns found - looks good!');
}
