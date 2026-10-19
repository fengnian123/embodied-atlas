import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(R,p),'utf8');
const json=p=>JSON.parse(read(p));
const papers=fs.readdirSync(path.join(R,'data/papers')).filter(f=>f.endsWith('.json')).sort().map(f=>json('data/papers/'+f));
for(const p of papers)p.reproduction=p.id==='p-a2ae5d358c9c'?json('data/reproduction-unilavira.json'):{status:'未复现'};
const audit={total:papers.length,fulltext:papers.filter(p=>p.verificationLevel==='fulltext').length,metadata:papers.filter(p=>p.verificationLevel==='metadata').length,unresolved:papers.filter(p=>!p.verificationLevel||p.verificationLevel==='unresolved').length,numericEvidence:papers.filter(p=>p.evaluation?.some(e=>e.table?.rows?.length||e.tables?.some(t=>t.rows?.length)||e.metrics?.length)).length};
const data={schemaVersion:1,checked:'2026-10-19',audit,papers,taxonomy:json('data/taxonomy.json'),redirects:json('data/redirects.json'),...json('data/editorial.json')};
const dist=path.join(R,'dist');fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
for(const f of ['index.html','style.css','core.js','detail-content.js','app.js'])fs.copyFileSync(path.join(R,'src',f),path.join(dist,f));
if(fs.existsSync(path.join(R,'src/assets')))fs.cpSync(path.join(R,'src/assets'),path.join(dist,'assets'),{recursive:true});
const script='window.ATLAS_DATA = '+JSON.stringify(data).replace(/</g,'\\u003c')+';\n';
fs.writeFileSync(path.join(dist,'data.js'),script);
fs.writeFileSync(path.join(dist,'catalog.json'),JSON.stringify(data,null,2));
fs.writeFileSync(path.join(dist,'.nojekyll'),'');
fs.writeFileSync(path.join(dist,'favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#087e83"/><text x="15" y="47" font-family="Georgia,serif" font-style="italic" font-size="55" fill="white">a</text><circle cx="48" cy="14" r="4" fill="#b9e4df"/></svg>');
// Hash routes never need server rewrites; 404 retains an actionable recovery link.
fs.writeFileSync(path.join(dist,'404.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>页面地址有误</title><body style="font-family:system-ui;padding:10vw;background:#f6f8f8;color:#24343c"><h1>页面地址有误</h1><p>本网站使用首页后的 #/paper/论文ID 访问详情。请从已部署仓库首页重新打开论文库。</p><p>复制链接时请保留仓库子路径和 # 后的全部内容。</p></body></html>');
// Standalone preview: all data, CSS and code in one offline-capable HTML artifact.
let html=read('src/index.html').replace('<link rel="stylesheet" href="./style.css">',()=>'<style>'+read('src/style.css')+'</style>');
html=html.replace('<link rel="icon" href="./favicon.svg" type="image/svg+xml">','');
const assetData={};
function embedAssets(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())embedAssets(file);else if(/\.(png|jpg|jpeg|webp|svg)$/.test(entry.name)){const key=path.relative(path.join(R,'src'),file).split(path.sep).join('/');const mime=entry.name.endsWith('.svg')?'image/svg+xml':entry.name.match(/\.jpe?g$/)?'image/jpeg':entry.name.endsWith('.webp')?'image/webp':'image/png';assetData[key]='data:'+mime+';base64,'+fs.readFileSync(file).toString('base64');}}}
if(fs.existsSync(path.join(R,'src/assets')))embedAssets(path.join(R,'src/assets'));
const offlineScript='window.ATLAS_DATA = '+JSON.stringify({...data,offlinePreview:true,assetData}).replace(/</g,'\\u003c')+';\n';
for(const [file,content] of [['data.js',offlineScript],['core.js',read('src/core.js')],['detail-content.js',read('src/detail-content.js')],['app.js',read('src/app.js')]])html=html.replace(`<script defer src="./${file}"></script>`,()=>`<script defer>\n${content.replace(/<\/script/gi,'<\\/script')}\n</script>`);
// Inline defer scripts execute during parsing, so move them after the DOM shell.
const scripts=[...html.matchAll(/<script defer>[\s\S]*?<\/script>/g)].map(m=>m[0].replace(' defer','')).join('\n');
html=html.replace(/<script defer>[\s\S]*?<\/script>/g,'').replace('</body>',()=>scripts+'</body>');
fs.writeFileSync(path.join(R,'embodied-atlas-preview.html'),html);
const pending=papers.filter(p=>p.gaps?.length);
fs.writeFileSync(path.join(R,'docs/PENDING.md'),'# 待核实与待完善清单\n\n生成于 2026-10-19。重点详解仅表示核心内容已查阅原始来源；缺口不隐藏。\n\n'+pending.map(p=>`- **${p.title}** (${p.id})：${p.gaps.join('；')}。状态：${p.status}。`).join('\n')+'\n');
const modules=papers.reduce((n,p)=>n+(p.method?.modules?.length||0),0);
const tables=papers.reduce((n,p)=>n+p.evaluation.reduce((m,e)=>m+Number(!!e.table)+(e.tables?.length||0),0),0);
const unconfirmed=papers.filter(p=>!p.verificationLevel||p.verificationLevel==='unresolved');
fs.writeFileSync(path.join(R,'docs/VERIFICATION.md'),`# 内容核验覆盖\n\n生成日期：${data.checked}。数量由正式 JSON 数据计算，不把协议别名或讨论标题重复计数。\n\n| 项目 | 数量 | 统计口径 |\n|---|---:|---|\n| 唯一论文记录 | ${papers.length} | 稳定 ID 去重 |\n| 已回查原文 | ${audit.fulltext} | 已取得原文并整理核心方法，不代表全部字段已确认 |\n| 基础来源核验 | ${audit.metadata} | 已确认可取得的书目或官方来源，原文细节仍有缺口 |\n| 身份或来源待确认 | ${audit.unresolved} | 保留索引和检索线索，明示未知 |\n| 模块级方法解析 | ${papers.filter(p=>p.method?.modules?.length).length} | 共 ${modules} 个模块 |\n| 含量化证据 | ${audit.numericEvidence} | 共 ${tables} 张表；含论文规模统计或临床研究结果，非统一机器人榜单 |\n| 用户复现记录 | 1 | Uni-LaViRA 单例记录，其余均未复现 |\n\n## 身份或原文来源尚待确认\n\n${unconfirmed.length?unconfirmed.map(p=>`- **${p.title}**（${p.id}）：${p.verification||p.gaps.join('；')}`).join('\n'):'无。'}\n\n## 阅读核验状态\n\n元数据、方法、训练、实验、资源与许可证是独立的核验范围。已回查原文不等于下载运行代码，也不保证作者机构、全部训练超参数或正式发表目录均已完整。逐条缺口见 [PENDING.md](PENDING.md)，表值的版本和条件以网站对应条目为准。\n\n删除的非论文标题见 [excluded-headings.json](excluded-headings.json)，同篇合并说明见 [identity-merges.json](identity-merges.json)。资源HTTP检查见 [link-audit.json](link-audit.json)；403、429和超时属于未能判定，不视为资源不存在。\n`);
console.log(`Built dist/: ${papers.length} records. Standalone preview: embodied-atlas-preview.html (${(Buffer.byteLength(html)/1024).toFixed(0)} KiB).`);
