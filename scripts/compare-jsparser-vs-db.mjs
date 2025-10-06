import path from 'path';
import fs from 'fs';

// 1) Parse using the parser factory (AST parser tier)
const { ParserFactory } = await import('../packages/code-intelligence/dist/code-parser/ParserFactory.js');
const parserFactory = new ParserFactory();

const repoRoot = process.cwd();
const fileRel = 'packages/code-intelligence/src/code-parser/parsers/JavaScriptParser.ts';
const filePath = path.join(repoRoot, fileRel);
const content = fs.readFileSync(filePath, 'utf-8');
const parseResult = await parserFactory.parseDocument(filePath, content, {
  enableInitialLinking: false,
  enableAggregation: false
});

const parserComps = parseResult.components.map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId, filePath: c.filePath })).sort((a,b)=> (a.type+a.name).localeCompare(b.type+b.name));

// 2) Load DB components for same file
const { DatabaseManager } = await import('../apps/server/dist/features/storage/DatabaseManager.js');
const db = new DatabaseManager(repoRoot);
await db.initialize();
const compRepo = db.getComponentRepository();
const dbCompsAll = await compRepo.getComponentsByFile(filePath);
const dbComps = dbCompsAll.map(c => ({ id: c.id, name: c.name, type: c.type, parentId: (c).parentId, filePath: c.filePath })).sort((a,b)=> (a.type+a.name).localeCompare(b.type+b.name));

function indexByNameType(arr){
  const m = new Map();
  for (const c of arr){
    m.set(`${c.type}:${c.name}`, c);
  }
  return m;
}

const pIdx = indexByNameType(parserComps);
const dIdx = indexByNameType(dbComps);

const onlyInParser = [];
const onlyInDb = [];
const parentIdMismatches = [];

for (const k of pIdx.keys()){
  if (!dIdx.has(k)) onlyInParser.push(pIdx.get(k));
}
for (const k of dIdx.keys()){
  if (!pIdx.has(k)) onlyInDb.push(dIdx.get(k));
}
for (const k of pIdx.keys()){
  if (dIdx.has(k)){
    const p = pIdx.get(k), d = dIdx.get(k);
    if ((p.parentId||'') !== (d.parentId||'')){
      parentIdMismatches.push({ key:k, parserParent:p.parentId, dbParent:d.parentId, parserId:p.id, dbId:d.id });
    }
  }
}

const typeCounts = arr => arr.reduce((acc,c)=>{acc[c.type]=(acc[c.type]||0)+1; return acc;},{});

console.log('FILE:', filePath);
console.log('\nParser counts by type:', typeCounts(parserComps));
console.log('DB counts by type:    ', typeCounts(dbComps));
console.log(`\nDiff: only in parser (${onlyInParser.length})`);
for (const c of onlyInParser.slice(0,20)) console.log('  +', c.type, c.name);
if (onlyInParser.length>20) console.log(`  ... and ${onlyInParser.length-20} more`);
console.log(`\nDiff: only in DB (${onlyInDb.length})`);
for (const c of onlyInDb.slice(0,20)) console.log('  -', c.type, c.name);
if (onlyInDb.length>20) console.log(`  ... and ${onlyInDb.length-20} more`);
console.log(`\nParentId mismatches (${parentIdMismatches.length}) (showing up to 15)`);
for (const m of parentIdMismatches.slice(0,15)) console.log(`  * ${m.key} parserParent=${m.parserParent} dbParent=${m.dbParent}`);

await db.disconnect();
