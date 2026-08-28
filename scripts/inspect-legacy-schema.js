const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function inspectSchemaAndSamples() {
  const filePath = path.join(__dirname, '../legacy/Backup/wddump.sql');
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const tables = {};
  let currentTable = null;
  let capturingTable = false;
  let tableDef = '';

  for await (const line of rl) {
    const createMatch = line.match(/CREATE TABLE [`"]?([a-zA-Z0-9_]+)[`"]?/i);
    if (createMatch) {
      currentTable = createMatch[1];
      capturingTable = true;
      tableDef = '';
    }

    if (capturingTable) {
      tableDef += line + '\n';
      if (line.includes('ENGINE=')) {
        capturingTable = false;
        tables[currentTable] = { def: tableDef, sampleInsert: '' };
      }
    }

    const insertMatch = line.match(/INSERT INTO [`"]?([a-zA-Z0-9_]+)[`"]?/i);
    if (insertMatch && tables[insertMatch[1]] && !tables[insertMatch[1]].sampleInsert) {
      tables[insertMatch[1]].sampleInsert = line.substring(0, 300);
    }
  }

  let out = '';
  for (const [tbl, data] of Object.entries(tables)) {
    out += `\n================= TABLE: ${tbl} =================\n`;
    out += data.def.trim() + '\n';
    out += 'Sample INSERT: ' + data.sampleInsert + '\n';
  }

  fs.writeFileSync(path.join(__dirname, 'legacy-schema-dump.utf8.txt'), out, 'utf8');
  console.log('Written to legacy-schema-dump.utf8.txt successfully');
}

inspectSchemaAndSamples().catch(console.error);
