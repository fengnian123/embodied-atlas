const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.join(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'dist/catalog.json'))),papers=data.papers;
test('discussion headings never enter the formal paper catalog',()=>{
 for(const title of ['从“异常描述”到“故障原因”仍有明显距离','缺少面向室内设备的公开 Benchmark','VLM 的语言解释不等于可信诊断'])assert(!papers.some(p=>p.title===title));
});
test('all other papers explicitly remain not reproduced',()=>{
 const r=papers.filter(p=>p.reproduction.status!=='未复现');assert.equal(r.length,1);assert.equal(r[0].id,'p-a2ae5d358c9c');assert(r[0].reproduction.summary.includes('不含完整测试集统计'));
 for(const p of papers.filter(p=>p.id!=='p-a2ae5d358c9c'))assert.equal(p.reproduction.status,'未复现');
});
test('Uni-LaViRA record preserves actual configuration and original bbox evidence',()=>{
 const r=papers.find(p=>p.id==='p-a2ae5d358c9c').reproduction;
 assert(r.setup.episode.startsWith('10'));assert.equal(r.setup.languageModel,'gemini-3.1-pro-preview（LA）');assert.equal(r.setup.visionModel,'qwen3.5-27b（VA）');assert.equal(r.setup.hfov,'79°');assert(r.setup.cameraPosition.includes('0.88'));
 assert.deepEqual(r.timeline.find(x=>x.step===12&&x.actor==='VA').bbox,[405,613,789,999]);assert(r.timeline.some(x=>x.step===68&&x.action.includes('stop=true')));assert(r.timeline.some(x=>x.step===95&&x.action.includes('无官方环境成功回执')));
});
test('user-provided PDF and image assets are packaged locally',()=>{
 const r=papers.find(p=>p.id==='p-a2ae5d358c9c').reproduction;
 const crypto=require('node:crypto');const pdf=fs.readFileSync(path.join(root,'dist',r.source.url));assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'),r.source.sha256);
 for(const x of r.gallery)assert(fs.statSync(path.join(root,'dist',x.path)).size>0);
 const preview=fs.readFileSync(path.join(root,'embodied-atlas-preview.html'),'utf8');assert(preview.includes('data:image/png;base64,'));assert(preview.includes('offlinePreview'));
});
test('method modules and numeric tables render as escaped evidence, not raw HTML',()=>{
 const ctx={ATLAS_DATA:{assetData:{},offlinePreview:true}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/detail-content.js'),'utf8'),ctx);
 const method=ctx.AtlasDetail.method({method:{input:'image',output:'action',flow:['感知','执行'],explanation:'<script>bad</script>',modules:[{name:'模块',purpose:'目的',input:'输入',mechanism:'机制',output:'输出'}]}});assert(method.includes('具体怎么做'));assert(!method.includes('<script>bad'));
 const evidence=ctx.AtlasDetail.evidence({evaluation:[{benchmark:'R2R',setting:'Val Unseen',result:'原文报告',locator:'Table 1',table:{caption:'关键结果',columns:['方法','SR (%)'],rows:[['方法A',50.2]],sourceUrl:'https://arxiv.org/abs/1234.56789',locator:'Table 1'}}]});assert(evidence.includes('50.2'));assert(evidence.includes('SR (%)'));assert(evidence.includes('Val Unseen'));assert(evidence.includes('核对原文图表'));
});
