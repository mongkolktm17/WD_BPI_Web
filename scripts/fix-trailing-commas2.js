const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_schema.sql');
const outputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg_schema.sql');

let sql = fs.readFileSync(inputFile, 'utf8');

// Fix trailing commas before closing parenthesis in CREATE TABLE blocks
// Process each CREATE TABLE block
const createTableRegex = /CREATE\s+TABLE\s+"([^"]+)"\s*\(([\s\S]*?)\)\s*;/gi;

sql = sql.replace(createTableRegex, (match, tableName, columns) => {
  const columnLines = columns.split('\n');
  
  // Find last meaningful line (not empty, not comment)
  let lastMeaningfulIdx = -1;
  for (let i = columnLines.length - 1; i >= 0; i--) {
    const trimmed = columnLines[i].trim();
    if (trimmed && !trimmed.startsWith('--')) {
      lastMeaningfulIdx = i;
      break;
    }
  }
  
  if (lastMeaningfulIdx >= 0) {
    let lastLine = columnLines[lastMeaningfulIdx];
    // Remove trailing comma
    if (lastLine.trim().endsWith(',')) {
      columnLines[lastMeaningfulIdx] = lastLine.replace(/,+\s*$/, '');
    }
  }
  
  return `CREATE TABLE "${tableName}" (\n${columnLines.join('\n')}\n);`;
});

fs.writeFileSync(outputFile, sql);
console.log('Fixed trailing commas in:', outputFile);

// Validate no more trailing commas before )
const testPattern = /CREATE\s+TABLE\s+"[^"]+"\s*\([\s\S]*?,\s*\n\s*\);/g;
const matches = sql.match(testPattern);
if (matches) {
  console.log('WARNING: Found', matches.length, 'remaining trailing comma issues');
} else {
  console.log('No trailing comma issues found');
}
