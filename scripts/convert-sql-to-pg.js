const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump.sql');
const outputFile = path.join(__dirname, '..', 'legacy', 'Backup', 'wddump_pg.sql');

let sql = fs.readFileSync(sqlFile, 'utf8');

// Step 1: Remove MySQL-specific comment blocks
sql = sql.replace(/\/\*![^]*?\*\//g, '');

// Step 2: Remove SET statements
sql = sql.replace(/SET\s+(?:@OLD_|NAMES|TIME_ZONE|FOREIGN_KEY_CHECKS|UNIQUE_CHECKS|SQL_MODE|SQL_NOTES|CHARACTER_SET_CLIENT|CHARACTER_SET_RESULTS|COLLATION_CONNECTION)[^;]*;\s*/gi, '');

// Step 3: Convert CREATE TABLE blocks
const createTableRegex = /CREATE\s+TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=[^;]*;/gi;

sql = sql.replace(createTableRegex, (match, tableName, columns) => {
  let pgColumns = columns;
  
  // Remove inline KEY/INDEX/FOREIGN KEY definitions
  pgColumns = pgColumns.replace(/,\s*UNIQUE\s+KEY\s+`[^`]+`\s*\([^)]+\)/gi, '');
  pgColumns = pgColumns.replace(/,\s*KEY\s+`[^`]+`\s*\([^)]+\)/gi, '');
  pgColumns = pgColumns.replace(/,\s*INDEX\s+`[^`]+`\s*\([^)]+\)/gi, '');
  pgColumns = pgColumns.replace(/,\s*CONSTRAINT\s+`[^`]+`\s+FOREIGN\s+KEY\s+\([^)]+\)\s*REFERENCES\s+`[^`]+`\s*\([^)]+\)(?:\s*ON\s+DELETE\s+\w+)?(?:\s*ON\s+UPDATE\s+\w+)?/gi, '');
  
  // Convert column types - order matters!
  
  // int unsigned AUTO_INCREMENT -> SERIAL PRIMARY KEY
  pgColumns = pgColumns.replace(/`([^`]+)`\s+int\s+unsigned\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, '"$1" SERIAL PRIMARY KEY');
  
  // int AUTO_INCREMENT -> SERIAL PRIMARY KEY  
  pgColumns = pgColumns.replace(/`([^`]+)`\s+int\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, '"$1" SERIAL PRIMARY KEY');
  
  // int NOT NULL DEFAULT '0' -> INTEGER DEFAULT 0
  pgColumns = pgColumns.replace(/`([^`]+)`\s+int\s+NOT\s+NULL\s+DEFAULT\s+'(\d+)'/gi, '"$1" INTEGER DEFAULT $2');
  
  // int NOT NULL -> INTEGER NOT NULL
  pgColumns = pgColumns.replace(/`([^`]+)`\s+int\s+NOT\s+NULL(?!\s+DEFAULT)/gi, '"$1" INTEGER NOT NULL');
  
  // int unsigned -> INTEGER
  pgColumns = pgColumns.replace(/`([^`]+)`\s+int\s+unsigned/gi, '"$1" INTEGER');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+int\s+UNSIGNED/gi, '"$1" INTEGER');
  
  // int DEFAULT NULL
  pgColumns = pgColumns.replace(/`([^`]+)`\s+int\s+DEFAULT\s+NULL/gi, '"$1" INTEGER');
  
  // tinyint(1) NOT NULL DEFAULT '0'
  pgColumns = pgColumns.replace(/`([^`]+)`\s+tinyint\(1\)\s+NOT\s+NULL\s+DEFAULT\s+'0'/gi, '"$1" BOOLEAN DEFAULT FALSE');
  
  // tinyint(1) NOT NULL
  pgColumns = pgColumns.replace(/`([^`]+)`\s+tinyint\(1\)\s+NOT\s+NULL(?!\s+DEFAULT)/gi, '"$1" BOOLEAN NOT NULL');
  
  // tinyint(1) DEFAULT '0'
  pgColumns = pgColumns.replace(/`([^`]+)`\s+tinyint\(1\)\s+DEFAULT\s+'0'/gi, '"$1" BOOLEAN DEFAULT FALSE');
  
  // tinyint(1) DEFAULT NULL
  pgColumns = pgColumns.replace(/`([^`]+)`\s+tinyint\(1\)\s+DEFAULT\s+NULL/gi, '"$1" BOOLEAN');
  
  // tinyint(1)
  pgColumns = pgColumns.replace(/`([^`]+)`\s+tinyint\(1\)/gi, '"$1" BOOLEAN');
  
  // enum -> VARCHAR
  pgColumns = pgColumns.replace(/`([^`]+)`\s+enum\([^)]+\)\s+NOT\s+NULL\s+DEFAULT\s+'[^']*'/gi, '"$1" VARCHAR(50) DEFAULT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+enum\([^)]+\)\s+NOT\s+NULL/gi, '"$1" VARCHAR(50) NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+enum\([^)]+\)/gi, '"$1" VARCHAR(50)');
  
  // text types
  pgColumns = pgColumns.replace(/`([^`]+)`\s+text\s+NOT\s+NULL/gi, '"$1" TEXT NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+text\s+DEFAULT\s+NULL/gi, '"$1" TEXT');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+text/gi, '"$1" TEXT');
  
  // varchar types
  pgColumns = pgColumns.replace(/`([^`]+)`\s+varchar\((\d+)\)\s+COLLATE\s+\S+\s+NOT\s+NULL/gi, '"$1" VARCHAR($2) NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+varchar\((\d+)\)\s+NOT\s+NULL/gi, '"$1" VARCHAR($2) NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+varchar\((\d+)\)\s+COLLATE\s+\S+\s+DEFAULT\s+NULL/gi, '"$1" VARCHAR($2)');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+varchar\((\d+)\)\s+DEFAULT\s+NULL/gi, '"$1" VARCHAR($2)');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+varchar\((\d+)\)/gi, '"$1" VARCHAR($2)');
  
  // timestamp types
  pgColumns = pgColumns.replace(/`([^`]+)`\s+timestamp\s+COLLATE\s+\S+\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, '"$1" TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+timestamp\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP(?:\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP)?/gi, '"$1" TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+timestamp\s+COLLATE\s+\S+\s+NOT\s+NULL/gi, '"$1" TIMESTAMP NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+timestamp\s+NOT\s+NULL/gi, '"$1" TIMESTAMP NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+timestamp\s+COLLATE\s+\S+\s+DEFAULT\s+NULL/gi, '"$1" TIMESTAMP');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+timestamp\s+DEFAULT\s+NULL/gi, '"$1" TIMESTAMP');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+timestamp\s+COLLATE\s+\S+/gi, '"$1" TIMESTAMP');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+timestamp/gi, '"$1" TIMESTAMP');
  
  // datetime
  pgColumns = pgColumns.replace(/`([^`]+)`\s+datetime\s+NOT\s+NULL/gi, '"$1" TIMESTAMP NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+datetime\s+DEFAULT\s+NULL/gi, '"$1" TIMESTAMP');
  
  // date
  pgColumns = pgColumns.replace(/`([^`]+)`\s+date\s+NOT\s+NULL/gi, '"$1" DATE NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+date\s+DEFAULT\s+NULL/gi, '"$1" DATE');
  
  // time
  pgColumns = pgColumns.replace(/`([^`]+)`\s+time\s+NOT\s+NULL/gi, '"$1" TIME NOT NULL');
  
  // float
  pgColumns = pgColumns.replace(/`([^`]+)`\s+float\s+NOT\s+NULL/gi, '"$1" REAL NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+float\s+DEFAULT\s+NULL/gi, '"$1" REAL');
  
  // decimal
  pgColumns = pgColumns.replace(/`([^`]+)`\s+decimal\((\d+),\s*(\d+)\)\s+NOT\s+NULL/gi, '"$1" NUMERIC($2,$3) NOT NULL');
  pgColumns = pgColumns.replace(/`([^`]+)`\s+decimal\((\d+),\s*(\d+)\)\s+DEFAULT\s+NULL/gi, '"$1" NUMERIC($2,$3)');
  
  // Remove remaining COLLATE
  pgColumns = pgColumns.replace(/\s+COLLATE\s+\S+/gi, '');
  
  // Fix commas between columns
  const columnLines = pgColumns.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < columnLines.length; i++) {
    let line = columnLines[i];
    if (!line.trim()) {
      fixedLines.push(line);
      continue;
    }
    
    // Check if this is a column definition
    const trimmed = line.trim();
    if (trimmed.startsWith('"') && !trimmed.startsWith('PRIMARY') && !trimmed.startsWith('CONSTRAINT') && !trimmed.startsWith('KEY') && !trimmed.startsWith('UNIQUE') && !trimmed.startsWith('CHECK') && !trimmed.startsWith('FOREIGN')) {
      // Look ahead for next non-empty line
      let nextIdx = i + 1;
      while (nextIdx < columnLines.length && !columnLines[nextIdx].trim()) {
        nextIdx++;
      }
      
      if (nextIdx < columnLines.length) {
        const nextLine = columnLines[nextIdx].trim();
        if (nextLine && !nextLine.startsWith('PRIMARY') && !nextLine.startsWith('CONSTRAINT') && !nextLine.startsWith('KEY') && !nextLine.startsWith('UNIQUE') && !nextLine.startsWith('CHECK') && !nextLine.startsWith('FOREIGN')) {
          if (!trimmed.endsWith(',') && !trimmed.includes('SERIAL PRIMARY KEY')) {
            line = line + ',';
          }
        }
      }
    }
    
    fixedLines.push(line);
  }
  
  pgColumns = fixedLines.join('\n');
  
  // Remove duplicate PRIMARY KEY when SERIAL PRIMARY KEY is used
  pgColumns = pgColumns.replace(/"id"\s+SERIAL\s+PRIMARY\s+KEY,\s*\n\s*PRIMARY\s+KEY\s*\("id"\)/gi, '"id" SERIAL PRIMARY KEY');
  pgColumns = pgColumns.replace(/"id"\s+SERIAL\s+PRIMARY\s+KEY\s+PRIMARY\s+KEY\s*\("id"\)/gi, '"id" SERIAL PRIMARY KEY');
  
  return `CREATE TABLE "${tableName}" (\n${pgColumns}\n);`;
});

// Step 4: Remove LOCK/UNLOCK TABLES and empty statements
sql = sql.replace(/LOCK\s+TABLES\s+"[^"]+"\s+WRITE;\s*/gi, '');
sql = sql.replace(/UNLOCK\s+TABLES;\s*/gi, '');

// Step 5: Remove MySQL-specific comments
sql = sql.replace(/^--\s*Table structure for table[^\n]*\n/gi, '');
sql = sql.replace(/^--\s*Dumping data for table[^\n]*\n/gi, '');
sql = sql.replace(/^--\s*Server version[^\n]*\n/gi, '');
sql = sql.replace(/^--\s*Host:[^\n]*\n/gi, '');
sql = sql.replace(/^--\s*Distrib[^\n]*\n/gi, '');
sql = sql.replace(/^--\s*Dump completed[^\n]*\n/gi, '');

// Remove extra newlines
sql = sql.replace(/\n{4,}/g, '\n\n\n');

// Step 6: Fix INSERT statements
// Remove backticks and quote identifiers
sql = sql.replace(/INSERT INTO `([^`]+)`/gi, 'INSERT INTO "$1"');
sql = sql.replace(/`([^`]+)`/g, '"$1"');

// Fix boolean values
sql = sql.replace(/'(\d+)'/g, (match, p1) => {
  if (p1 === '0') return 'FALSE';
  if (p1 === '1') return 'TRUE';
  return match;
});

fs.writeFileSync(outputFile, sql);
console.log('Conversion complete. Output:', outputFile);
console.log('Total lines:', sql.split('\n').length);

const tableCount = (sql.match(/CREATE TABLE/g) || []).length;
console.log('Tables found:', tableCount);
