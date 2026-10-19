/* Shared, dependency-free domain logic. Also tested in Node. */
(function (root) {
  'use strict';
  const facets = ['direction','task','paradigm','system','contribution','problem','environment','training','year','venue','resource'];
  const defaults = {q:'',filters:{},from:'',to:'',group:'none',sort:'curated',view:'cards',density:'standard',status:'all',library:'all',compareMode:'general',columns:['year','task','training','resources'],compare:[]};
  const normalize = x => String(x ?? '').normalize('NFKC').toLowerCase().replace(/[‐‑–—]/g,'-');
  function values(p,dim) {
    if(dim==='year') return [p.firstPublished?.slice(0,4)||'日期未核实'];
    if(dim==='venue') return [p.venue||'发表未核实'];
    if(dim==='resource') return Object.entries(p.resources).filter(([,r])=>r.url&&r.status==='已核实入口').map(([k])=>({paper:'论文',code:'代码',data:'数据',weights:'权重',project:'项目页'})[k]);
    return p.tags[dim]||[];
  }
  function textOf(p) {const tags=Object.values(p.tags).flat();const synonyms=Object.entries(root.ATLAS_DATA?.taxonomy?.aliases||{}).filter(([,v])=>tags.includes(v)).map(([k])=>k);return normalize([p.title,p.short,...(p.aliases||[]),...p.authors,...p.institutions,p.summary,p.overview||'',...tags,...synonyms,...p.sources.map(s=>s.label)].join(' '));}
  function matches(p,state,personal={},ignore=null) {
    const query = normalize(state.q).trim().split(/\s+/).filter(Boolean);
    if(!query.every(q=>textOf(p).includes(q))) return false;
    if(state.status==='fulltext'&&p.verificationLevel!=='fulltext')return false;
    if(state.status==='metadata'&&p.verificationLevel!=='metadata')return false;
    if(state.status==='unresolved'&&p.verificationLevel&&p.verificationLevel!=='unresolved')return false;
    if(state.status==='numbers'&&!p.evaluation.some(e=>e.table?.rows?.length||e.tables?.some(t=>t.rows?.length)||e.metrics?.length))return false;
    if(state.status==='deep'&&p.status!=='重点详解')return false;
    if(state.status==='pending'&&!(p.gaps?.length||p.status==='待核实'))return false;
    if(state.from&&(!p.firstPublished||p.firstPublished<state.from))return false;
    if(state.to&&(!p.firstPublished||p.firstPublished>state.to))return false;
    const u=personal[p.id]||{};
    if(state.library==='starred'&&!u.starred)return false;
    if(state.library==='unread'&&u.read!=='unread')return false;
    if(state.library==='read'&&u.read!=='read')return false;
    return Object.entries(state.filters).every(([dim,selected])=>dim===ignore||!selected.length||selected.some(v=>values(p,dim).includes(v)));
  }
  function results(papers,state,personal) {
    return papers.filter(p=>matches(p,state,personal)).sort((a,b)=>{
      if(state.sort==='title')return a.title.localeCompare(b.title,'en');
      if(state.sort==='date-asc'||state.sort==='date-desc') {
        if(!a.firstPublished&&!b.firstPublished)return a.title.localeCompare(b.title);
        if(!a.firstPublished)return 1;if(!b.firstPublished)return -1;
        return state.sort==='date-asc'?a.firstPublished.localeCompare(b.firstPublished):b.firstPublished.localeCompare(a.firstPublished);
      }
      return Number(b.status==='重点详解')-Number(a.status==='重点详解') || (b.firstPublished||'').localeCompare(a.firstPublished||'')||a.title.localeCompare(b.title);
    });
  }
  function counts(papers,state,personal,dim) {
    const map={};
    for(const p of papers)for(const v of values(p,dim))if(v)map[v]??=0;
    for(const p of papers)if(matches(p,state,personal,dim))for(const v of new Set(values(p,dim)))if(v)map[v]++;
    return map;
  }
  function groups(papers,dim) {
    if(dim==='none')return [['全部论文',papers]];
    const map={};for(const p of papers)for(const v of new Set(values(p,dim).length?values(p,dim):['待分类']))(map[v]??=[]).push(p);
    return Object.entries(map).sort(([a],[b])=>dim==='year'?b.localeCompare(a):a.localeCompare(b,'zh'));
  }
  function encode(state) {
    const p=new URLSearchParams();
    for(const k of ['q','from','to','group','sort','view','density','status','library','compareMode'])if(state[k]&&state[k]!==defaults[k])p.set(k,state[k]);
    for(const dim of facets)for(const v of state.filters[dim]||[])p.append('f.'+dim,v);
    if(state.columns.join(',')!==defaults.columns.join(','))p.set('cols',state.columns.join(','));
    if(state.compare.length)p.set('compare',state.compare.join(','));
    return p.toString();
  }
  function decode(query) {
    const p=new URLSearchParams(query);const s=JSON.parse(JSON.stringify(defaults));
    for(const k of ['q','from','to'])s[k]=(p.get(k)||'').slice(0,300);
    for(const [k,allowed] of Object.entries({group:['none',...facets.filter(x=>x!=='resource')],sort:['curated','date-desc','date-asc','title'],view:['cards','table'],density:['minimal','standard','detailed'],status:['all','deep','pending','fulltext','metadata','unresolved','numbers'],library:['all','starred','unread','read'],compareMode:['general','benchmark']}))if(allowed.includes(p.get(k)))s[k]=p.get(k);
    for(const dim of facets){const aliases=root.ATLAS_DATA?.taxonomy?.aliases||{};const a=[...new Set(p.getAll('f.'+dim).map(x=>aliases[x]||x))].slice(0,50);if(a.length)s.filters[dim]=a;}
    if(p.has('cols'))s.columns=p.get('cols').split(',').filter(x=>['year','task','training','venue','summary','resources','status'].includes(x));
    s.compare=[...new Set((p.get('compare')||'').split(',').filter(Boolean))].slice(0,4);
    for(const k of ['from','to'])if(!/^\d{4}-\d{2}-\d{2}$/.test(s[k]))s[k]='';
    return s;
  }
  function importPersonal(payload,known,redirects={}) {
    if(!payload||payload.schemaVersion!==1||typeof payload.papers!=='object'||!payload.papers||Array.isArray(payload.papers))throw Error('文件格式不正确，需要本网站导出的版本 1 阅读记录。');
    const allowed=new Set(known),out={};let skipped=0;
    for(const [id,v] of Object.entries(payload.papers)){
      const target=redirects[id]||id;
      if(!allowed.has(target)){skipped++;continue;}
      if(!v||typeof v!=='object'||!['none','unread','read',undefined].includes(v.read)||![true,false,undefined].includes(v.starred))throw Error('阅读状态字段无效，未导入任何内容。');
      out[target]={starred:v.starred===true,read:v.read||'none'};
    }
    return {data:out,skipped};
  }
  const api={facets,defaults,normalize,values,textOf,matches,results,counts,groups,encode,decode,importPersonal};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.AtlasCore=api;
})(typeof window!=='undefined'?window:globalThis);
