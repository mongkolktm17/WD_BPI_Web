const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function analyze() {
  const filePath = path.join(__dirname, '../legacy/Backup/wddump.sql');
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const tables = [];
  const insertStats = {};
  let currentTable = null;

  for await (const line of rl) {
    const createMatch = line.match(/CREATE TABLE [`"]?([a-zA-Z0-9_]+)[`"]?/i);
    if (createMatch) {
      tables.push(createMatch[1]);
      currentTable = createMatch[1];
    }

    const insertMatch = line.match(/INSERT INTO [`"]?([a-zA-Z0-9_]+)[`"]?/i);
    if (insertMatch) {
      const tbl = insertMatch[1];
      if (!insertStats[tbl]) {
        insertStats[tbl] = { statementCount: 0, approxTuples: 0 };
      }
      insertStats[tbl].statementCount++;
      // Count tuples roughly by counting "),"
      const tuples = (line.match(/\),/g) || []).length + 1;
      insertStats[tbl].approxTuples += tuples;
    }
  }

  console.log('--- ANALYSIS RESULTS ---');
  console.log('Tables defined (' + tables.length + '):', tables);
  console.log('Insert statistics:');
  console.table(insertStats);
}

analyze().catch(console.error);
