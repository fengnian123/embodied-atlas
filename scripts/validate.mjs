import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(R,p),'utf8'));
const tax=read('data/taxonomy.json'),redirects=read('data/redirects.json'),editorial=read('data/editorial.json');
const files=fs.readdirSync(path.join(R,'data/papers')).filter(x=>x.endsWith('.json'));
const ps=files.map(f=>read('data/papers/'+f));const ids=new Set(),titles=new Set(),arxiv=new Map(),errors=[];
const assert=(ok,s)=>{if(!ok)errors.push(s);};
const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const iso=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
for(let i=0;i<ps.length;i++){
 const p=ps[i],n=p.id||files[i];
 assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id),`${n}: invalid stable ID`);
 assert(files[i]===p.id+'.json',`${n}: filename must equal ID`);
 assert(!ids.has(p.id),`${n}: duplicate ID`);ids.add(p.id);
 assert(typeof p.title==='string'&&p.title.length>2,`${n}: missing title`);
 assert(!titles.has(normalize(p.title)),`${n}: duplicate normalized title`);titles.add(normalize(p.title));
 assert(Array.isArray(p.authors)&&Array.isArray(p.institutions)&&Array.isArray(p.aliases),`${n}: invalid metadata arrays`);
 assert(['待核实','基础索引','重点详解'].includes(p.status),`${n}: invalid content status`);
 for(const d of ['firstPublished','updated','checked'])if(p[d]!==null&&p[d]!==undefined)assert(iso(p[d]),`${n}: invalid ${d}`);
 if(p.firstPublished&&p.updated)assert(p.firstPublished<=p.updated,`${n}: first date after latest date`);
 if(p.publicationYear!==null)assert(Number.isInteger(p.publicationYear)&&p.publicationYear>=1900&&p.publicationYear<=2100,`${n}: invalid publication year`);
 assert(Array.isArray(p.sources)&&p.sources.length>0,`${n}: missing provenance`);
 for(const d of Object.keys(tax).filter(k=>k!=='aliases')){
  assert(Array.isArray(p.tags?.[d]),`${n}: invalid tags.${d}`);
  for(const t of p.tags?.[d]||[])assert(tax[d].includes(t),`${n}: unknown tag ${d}/${t}`);
 }
 const checkURL=(u,loc)=>{if(u===null||u===undefined)return;try{assert(['https:','http:'].includes(new URL(u).protocol),`${n}: unsafe ${loc}`);}catch{errors.push(`${n}: invalid URL ${loc}`);}};
 for(const s of p.sources){checkURL(s.url,'source');assert(typeof s.label==='string',`${n}: source needs label`);}
 for(const [k,v] of Object.entries(p.resources)){assert(['paper','code','project','data','weights'].includes(k),`${n}: unknown resource kind`);checkURL(v.url,k);assert(typeof v.status==='string',`${n}: missing resource status`);
  if(k==='paper'&&v.url){const match=v.url.match(/arxiv.org\/abs\/(\d{4}\.\d{4,5})/);if(match){assert(!arxiv.has(match[1]),`${n}: duplicate arXiv identity ${arxiv.get(match[1])}`);arxiv.set(match[1],n);}}
 }
 assert(Array.isArray(p.evaluation)&&Array.isArray(p.limitations?.author)&&Array.isArray(p.limitations?.analysis),`${n}: invalid evidence/limitation arrays`);
 if(p.verificationLevel)assert(['fulltext','metadata','unresolved'].includes(p.verificationLevel),`${n}: invalid verification level`);
 if(p.method?.modules){assert(Array.isArray(p.method.modules),`${n}: method modules must be an array`);for(const m of p.method.modules)assert(m.name&&(m.mechanism||m.description||m.detail),`${n}: module needs name and mechanism`);}
 for(const e of p.evaluation){
  for(const t of [e.table,...(e.tables||[])].filter(Boolean)){
   assert(Array.isArray(t.columns)&&t.columns.length>0&&Array.isArray(t.rows),`${n}: invalid evidence table`);
   for(const row of t.rows||[])assert((Array.isArray(row)||typeof row==='object')&&Object.values(row).length===t.columns.length,`${n}: evidence row length differs from columns`);
   if(t.sourceUrl)checkURL(t.sourceUrl,'experiment table source');
  }
 }
 if(p.status==='重点详解')assert(p.checked&&p.overview&&p.method&&p.training,`${n}: deep note missing required analysis`);
 if(p.bibtex)assert(p.authors.length&&p.title&&(p.firstPublished||p.publicationYear),`${n}: citation lacks verified metadata`);
}
for(const p of ps)for(const r of p.related||[])assert(ids.has(r.id),`${p.id}: broken related ID ${r.id}`);
for(const [old,dest] of Object.entries(redirects)){assert(!ids.has(old),`${old}: redirect shadows live record`);assert(ids.has(dest),`${old}: broken redirect target`);}
for(const route of editorial.routes)for(const p of route.papers)assert(ids.has(p.id),`route ${route.title}: unknown ${p.id}`);
for(const [alias,target] of Object.entries(tax.aliases))assert(Object.values(tax).some(x=>Array.isArray(x)&&x.includes(target)),`alias ${alias}: invalid target`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Validated ${ps.length} records, ${ps.filter(p=>p.status==='重点详解').length} deep notes, ${Object.keys(redirects).length} redirects. No duplicate titles or arXiv IDs.`);
