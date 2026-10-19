const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../src/core.js');
const ps=fs.readdirSync(path.join(__dirname,'../data/papers')).map(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data/papers',f))));
const fresh=()=>JSON.parse(JSON.stringify(C.defaults));
test('same-dimension OR and cross-dimension AND',()=>{
 const s=fresh();s.filters={direction:['导航','操作'],environment:['真实世界'],contribution:['Benchmark']};
 const r=C.results(ps,s,{});
 assert(r.length>=1);assert(r.some(p=>p.id==='remembr'));
 assert(r.every(p=>p.tags.direction.some(x=>['导航','操作'].includes(x))&&p.tags.environment.includes('真实世界')&&p.tags.contribution.includes('Benchmark')));
 assert(!r.some(p=>p.id==='hm3d'),'real scanned assets must not be mislabeled real robot experiments');
});
test('date range uses verified first-publication date, not acceptance year',()=>{
 const s=fresh();s.from='2024-01-01';s.to='2024-12-31';s.filters={direction:['导航'],environment:['真实世界'],contribution:['Benchmark']};
 assert(C.results(ps,s,{}).some(p=>p.id==='remembr'));
 assert(!C.results(ps,s,{}).some(p=>p.id==='homesafebench'));
 s.filters={};const ids=C.results(ps,s,{}).map(p=>p.id);assert(!ids.includes('4dgs-native'));assert(ids.includes('shape-of-motion'));
});
test('unknown dates are available in all-papers and explicitly grouped',()=>{
 const s=fresh();assert.equal(C.results(ps,s,{}).length,ps.length);
 const g=C.groups(ps,'year');assert(g.some(([k,v])=>k==='日期未核实'&&v.length>0));
});
test('facet counts respect other dimensions and ignore current OR dimension',()=>{
 const s=fresh();s.filters={direction:['导航'],environment:['真实世界']};
 const cs=C.counts(ps,s,{},'direction');
 for(const d of Object.keys(cs))assert.equal(cs[d],ps.filter(p=>p.tags.environment.includes('真实世界')&&p.tags.direction.includes(d)).length);
});
test('URL roundtrip preserves Chinese, multiselect, presentation, date, compare, columns',()=>{
 const s=fresh();Object.assign(s,{q:'空间 memory + 4D',from:'2023-01-01',to:'2026-10-19',group:'year',view:'table',density:'detailed',sort:'date-desc',status:'pending',library:'starred',columns:[],compare:['openeqa','goat-bench']});s.filters={task:['VLN','EQA'],environment:['真实世界']};
 assert.deepEqual(C.decode(C.encode(s)),s);
});
test('unknown/malicious view parameters cannot create application settings',()=>{
 const s=C.decode('?view=script&group=__proto__&density=unbounded&cols=title,bogus,year&compare=a,b,c,d,e&from=oops');
 assert.equal(s.view,'cards');assert.equal(s.group,'none');assert.equal(s.density,'standard');assert.deepEqual(s.columns,['year']);assert.equal(s.compare.length,4);assert.equal(s.from,'');
});
test('case-insensitive bilingual title, author, tag and summary search',()=>{
 for(const [q,id] of [['OPENVLA','openvla'],['Guanjun Wu','4dgs-deformation'],['HexPlane','4dgs-deformation'],['四维高斯','4dgs-native'],['真实','remembr']]){const s=fresh();s.q=q;assert(C.results(ps,s,{}).some(p=>p.id===id),q);}
});
test('multi-label groups repeat records but unique result total remains unchanged',()=>{
 const groups=C.groups(ps,'direction');const all=groups.flatMap(([,a])=>a);assert(all.length>ps.length);assert.equal(new Set(all.map(p=>p.id)).size,ps.length);
});
test('date ordering keeps missing values last in both directions',()=>{
 for(const sort of ['date-asc','date-desc']){const s=fresh();s.sort=sort;const r=C.results(ps,s,{});let missing=false,prev=null;for(const p of r){if(!p.firstPublished){missing=true;continue;}assert(!missing);if(prev)assert(sort==='date-asc'?prev<=p.firstPublished:prev>=p.firstPublished);prev=p.firstPublished;}}
});
test('personal import validates all entries before mutation and skips unknown IDs',()=>{
 const imported=C.importPersonal({schemaVersion:1,papers:{openvla:{starred:true,read:'read'},unknown:{read:'unread'}}},ps.map(p=>p.id));
 assert.equal(imported.skipped,1);assert.deepEqual(imported.data.openvla,{starred:true,read:'read'});
 const migrated=C.importPersonal({schemaVersion:1,papers:{oldid:{starred:true,read:'read'}}},['openvla'],{oldid:'openvla'});assert.deepEqual(migrated.data.openvla,{starred:true,read:'read'});assert.equal(migrated.skipped,0);
 assert.throws(()=>C.importPersonal({schemaVersion:1,papers:{openvla:{read:'executed'}}},ps.map(p=>p.id)));
 assert.throws(()=>C.importPersonal({schemaVersion:2,papers:{}},[]));
 assert.throws(()=>C.importPersonal({schemaVersion:1,papers:[]},[]));
});
test('starred, unread and read filters are independent and persisted values work',()=>{
 const personal={openvla:{starred:true,read:'unread'},openeqa:{read:'read'}};
 const s=fresh();s.library='starred';assert.deepEqual(C.results(ps,s,personal).map(p=>p.id),['openvla']);s.library='read';assert.deepEqual(C.results(ps,s,personal).map(p=>p.id),['openeqa']);s.library='unread';assert.deepEqual(C.results(ps,s,personal).map(p=>p.id),['openvla']);
});
test('unverified resource links do not count as released code',()=>{
 const s=fresh();s.filters={resource:['代码']};const r=C.results(ps,s,{});assert(r.some(p=>p.id==='openvla'));assert(!r.some(p=>p.id==='abot-agentos'));
});
test('empty search remains a normal empty result without dropping existing state',()=>{
 const s=fresh();s.q='this-does-not-exist-12345';s.filters={task:['VLN']};assert.deepEqual(C.results(ps,s,{}),[]);assert.deepEqual(s.filters,{task:['VLN']});
});
