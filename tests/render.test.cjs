/* Render-contract tests use a small DOM boundary double, not a real browser.
   They catch route/data/runtime failures without claiming visual browser QA. */
const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function boot(query='',hash='#/',base='https://example.github.io/embodied-atlas/'){
 const handlers={},nodes={},store={},timers=[];let tray=null;
 function node(id=''){return nodes[id]??=( {id,innerHTML:'',textContent:'',open:false,dataset:{},style:{},classList:{toggle(){},add(){},remove(){},contains(){return false;}},addEventListener(type,fn){handlers[id+':'+type]=fn;},setAttribute(){},focus(){},select(){},remove(){if(this===tray)tray=null;},scrollIntoView(){},setSelectionRange(){}});}
 const doc={activeElement:{id:'',tagName:'BODY'},title:'',getElementById:node,querySelectorAll(){return[];},querySelector(sel){return sel==='.compare-tray'?tray:null;},createElement(){return node('created-'+Math.random());},addEventListener(type,fn){handlers[type]=fn;},execCommand(){return true;},body:{append(el){tray=el;}}};
 const loc=new URL(base+query+hash);const ctx={document:doc,location:loc,history:{replaceState(_,__,u){const next=new URL(u,loc);loc.href=next.href;}},navigator:{},localStorage:{getItem(k){return store[k]||null;},setItem(k,v){store[k]=v;}},URL,URLSearchParams,Blob,setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},console};
 ctx.window=ctx;ctx.globalThis=ctx;ctx.scrollY=400;ctx.scrollTo=()=>{};ctx.addEventListener=(type,fn)=>handlers['window:'+type]=fn;
 vm.createContext(ctx);vm.runInContext(read('dist/data.js'),ctx);vm.runInContext(read('src/core.js'),ctx);vm.runInContext(read('src/detail-content.js'),ctx);vm.runInContext(read('src/app.js'),ctx);
 function click(dataset){const el={dataset,classList:{contains(){return false;}},hasAttribute(k){return false;}};handlers.click({target:{closest(){return el;}},preventDefault(){}});}
 return {ctx,nodes,handlers,store,click,html:()=>node('root').innerHTML,timers};
}
test('list renders real content, independent controls and no HTML injection',()=>{
 const b=boot('?q='+encodeURIComponent('<script>alert(1)</script>'));assert(!b.html().includes('<script>alert(1)</script>'));assert(b.html().includes('&lt;script&gt;'));assert(b.html().includes('暂时没有匹配'));
 const a=boot();assert(a.html().includes(String(JSON.parse(read('dist/catalog.json')).papers.length)));assert(a.html().includes('探索论文'));assert(JSON.parse(read('dist/catalog.json')).papers.some(p=>a.html().includes('data-paper="'+p.id+'"')));assert(a.html().includes('data-setting="density"'));assert(a.html().includes('data-setting="view"'));
});
test('every paper renders an independent detail route without runtime errors',()=>{
 const catalog=JSON.parse(read('dist/catalog.json'));for(const p of catalog.papers){const b=boot('','#/paper/'+p.id);assert(b.html().includes('参考资料'),p.id);assert(!b.html().includes('undefined'),p.id);assert(b.html().includes(p.title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')),p.id);}
});
test('subpath detail links preserve filters when copied/refreshed',()=>{
 const b=boot('?f.direction='+encodeURIComponent('导航')+'&view=table','#/paper/agenticnav-vln','https://example.github.io/research/library/');assert(b.html().includes('data-back'));assert(b.html().includes('f.direction='));assert(b.html().includes('view=table'));assert.equal(b.ctx.location.pathname,'/research/library/');
});
test('compare renders 2-4 real records and dedicated benchmark protocol',()=>{
 const b=boot('?compare=openeqa,goat-bench,homesafebench','#/compare');assert(b.html().includes('使用 Benchmark'));assert(b.html().includes('OpenEQA'));b.handlers.change({target:{id:'benchmark-only',checked:true,dataset:{}}});assert(b.html().includes('采集、生成与质量控制'));assert(b.html().includes('信息泄漏')||b.html().includes('泄漏与潜在偏差'));assert.equal(new URLSearchParams(b.ctx.location.search).get('compareMode'),'benchmark');assert(boot('?compare=openeqa,goat-bench&compareMode=benchmark','#/compare').html().includes('采集、生成与质量控制'));
});
test('all density/layout combinations render with identical filter selection',()=>{
 for(const view of ['cards','table'])for(const density of ['minimal','standard','detailed']){const b=boot('?f.direction='+encodeURIComponent('导航')+'&view='+view+'&density='+density);assert(b.html().includes('研究方向：导航'));assert(b.html().includes(view==='table'?'paper-table':'paper-grid'));}
});
test('all grouping dimensions render correctly',()=>{
 for(const group of ['direction','task','year','venue','paradigm','system','contribution','problem','environment','training']){const b=boot('?group='+group);assert(b.html().includes('总数已去重'),group);}
});
test('missing and redirected IDs, reading routes and about have useful output',()=>{
 assert(boot('','#/paper/no-such-record').html().includes('没有找到'));
 const catalog=JSON.parse(read('dist/catalog.json'));for(const old of Object.keys(catalog.redirects))assert(boot('','#/paper/'+old).html().includes('参考资料'));
 assert(boot('','#/routes').html().includes('两种 4DGS'));assert(boot('','#/about').html().includes('关于知识库'));
});
test('star and read handlers persist validated local state',()=>{
 const b=boot();b.click({star:'openvla'});let stored=JSON.parse(b.store['embodied-atlas.personal.v1']);assert.equal(stored.papers.openvla.starred,true);
 b.handlers.change({target:{dataset:{read:'openvla'},value:'read'}});stored=JSON.parse(b.store['embodied-atlas.personal.v1']);assert.equal(stored.papers.openvla.read,'read');
});
test('comparison selection caps at four and URL remains reviewable',()=>{
 const b=boot();for(const id of ['openvla','openeqa','goat-bench','homesafebench','eta'])b.handlers.change({target:{dataset:{compare:id}}});assert.equal(new URLSearchParams(b.ctx.location.search).get('compare').split(',').length,4);assert(b.nodes.toast.textContent.includes('最多'));
});
test('input and presentation state immediately persist to URL',()=>{
 const b=boot();b.handlers.input({target:{id:'search',value:'空间记忆'}});assert.equal(new URLSearchParams(b.ctx.location.search).get('q'),'空间记忆');b.click({setting:'density',value:'detailed'});assert.equal(new URLSearchParams(b.ctx.location.search).get('density'),'detailed');assert.equal(new URLSearchParams(b.ctx.location.search).get('q'),'空间记忆');
});
test('build emits local assets, hash routes and one-file offline preview',()=>{
 const html=read('dist/index.html');for(const name of ['data.js','core.js','detail-content.js','app.js','style.css'])assert(html.includes('./'+name));assert(!html.includes('src="/'));assert(!html.includes('href="/'));
 const offline=read('embodied-atlas-preview.html');assert(!offline.includes('src="./app.js"'));assert(offline.includes('window.ATLAS_DATA'));assert(offline.lastIndexOf('(function ()')>offline.indexOf('id="root"'));
});
