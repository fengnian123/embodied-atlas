"""One-time extraction of the user's supplied notes. Run before manual curation only.
Requires openpyxl for source extraction, never used by the website/build.
"""
import json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT.parent/'extracted'
records={}; merges=[]
def norm(s): return re.sub(r'[^a-z0-9]','',s.lower())
def urls(s): return re.findall(r'https?://[^\s<>|)]+',str(s))
def base(title,alias=None):
 return dict(id='p-'+hashlib.sha256(norm(title).encode()).hexdigest()[:12],title=title,short=alias or title.split(':')[0][:60],aliases=[],authors=[],institutions=[],firstPublished=None,updated=None,publicationYear=None,venue=None,publicationStatus='未核实',year=None,tags={'direction':[],'task':[],'paradigm':[],'system':[],'contribution':[],'problem':[],'environment':[],'training':[]},summary='仅建立基础索引；方法、训练和实验信息待原文核验。',method=None,training=None,evaluation=[],limitations={'author':[],'analysis':[]},resources={},sources=[],related=[],bibtex=None,status='待核实',checked=None,gaps=['作者与机构','日期与发表状态','方法和训练细节','资源开放状态'],sourceNotes=[])
def add(p):
 key=norm(p['title'])
 for k,v in records.items():
  if norm(v['title'])==key:
   v['sources']+=p['sources'];v['sourceNotes']+=p['sourceNotes'];v['aliases']=list(set(v['aliases']+p['aliases']+[p['short']]))
   for d,t in p['tags'].items():v['tags'][d]=list(dict.fromkeys(v['tags'][d]+t))
   merges.append([p['title'],v['title']]);return v
 records[p['id']]=p;return p
def note(p,file,locator):
 p['sources'].append({'kind':'user','label':file,'locator':locator,'url':None,'supports':['基础索引（未核实）']})
def tags(p,**kw):
 for k,v in kw.items():p['tags'][k]=v.split('|')
def table(name): return next(iter(json.loads((INPUT/name).read_text()).values()))
for row in table('长期室内巡检论文调研.json')[5:]:
 if not row[0]:continue
 title=str(row[0]).split('\n')[0];p=base(title)
 note(p,'长期室内巡检论文调研.xlsx','论文调研 / '+title)
 p['summary']=str(row[1]).replace('\n',' ')[:230];p['sourceNotes']=[{'label':'用户调研摘记；未回查原文','method':row[2],'evaluation':row[3],'training':row[4],'analysis':row[5]}]
 tags(p,direction='导航',task='巡检',system='模块化系统',contribution='方法',problem='记忆|动态环境')
 if 'Benchmark' in title or 'Bench' in title:p['tags']['contribution']=['Benchmark']
 add(p)
for row in table('具身导航近期论文Benchmark对比汇总.json')[4:]:
 if not row[0]:continue
 p=base(row[0]);note(p,'具身导航近期论文Benchmark对比汇总.xlsx','近期论文汇总 / '+row[0])
 tags(p,direction='导航',task='VLN' if ('R2R' in str(row[2])) else 'ObjectNav',contribution='方法',system='模块化系统')
 p['sourceNotes']=[{'label':'用户调研摘记；发表、训练及开放状态未核实','evaluation':row[2],'comparisons':row[3],'training':row[4],'resourceClaim':row[5]}];add(p)
# EQA variants are experiment settings, not separate papers. Keep their evidence together.
alias_map={'ExploreEQA':'Explore-EQA','3D-Mem':'3D-Mem','Human-Inspired Memory':'Human-Inspired Memory','ABot-AgentOS':'ABot-AgentOS','NaviLLM':'NaviLLM'}
skip=['Blind ','LLaVA','Multi-frame','Gemini-','GPT-','Qwen','InternVL','o4-','Random ','Frontier-based','Goal-oriented','Habitat-Lab','A-mem','Mem0','GraphMem','MemoryOS','ObsMem','Sparse Voxel','ConceptGraphs']
for row in table('EQA_Benchmark.json')[4:14]:
 if not row[0]:continue
 ms=str(row[4]).splitlines()
 for i,m in enumerate(ms):
  if any(m.startswith(s) for s in skip):continue
  title=re.split('[＋，（]',m)[0].strip();title=alias_map.get(title,title)
  p=base(title);note(p,'EQA_Benchmark.xlsx','01_方法与结果 / '+row[0]+' / '+m)
  tags(p,direction='导航',task='EQA',system='模块化系统',contribution='方法',problem='记忆|空间理解')
  # Numbers stay in the source spreadsheet until full protocols are rechecked.
  p['sourceNotes']=[{'label':'用户调研摘记；分数与协议未复核，故未导入排行榜','setting':row[0],'variant':m}]
  src=str(row[11]).splitlines();u=src[i] if len(src)==len(ms) else src[0]
  if u.startswith('http'):p['sources'].append({'kind':'reference','label':'原表引用来源（不一定是本方法原论文）','url':u,'locator':str(row[12] or ''),'supports':['待回查']})
  add(p)
 # Benchmark index, without calling method paper the dataset paper.
 if row[0] not in ['OpenEQA EM-EQA','OpenEQA A-EQA','OpenEQA 多选转换']:
  p=base(row[0]);note(p,'EQA_Benchmark.xlsx','01_方法与结果 / '+row[0]);tags(p,direction='导航',task='EQA',contribution='Benchmark',environment='仿真|室内')
  p['sourceNotes']=[{'label':'用户调研摘记；任务协议待核实','inputProtocol':row[9],'scale':row[10]}];add(p)
text=(INPUT/'粘贴的文本 (3).txt').read_text();section=''
for line in text.splitlines():
 if line.startswith('## '):section=line[3:]
 m=re.match(r'\d+\. \*\*\[([^]]+)\]\*\* \| ([^|]+) \| ([^|]+) \| (.*)',line)
 if not m:continue
 alias,venue,title,rest=m.groups();title=title.strip()
 if alias=='SRT-H-Data':continue # supplementary dataset is a resource, not another paper
 p=base(title,alias);p['aliases']=[alias]
 note(p,'粘贴的文本 (3).txt',section+' / '+alias)
 # Retain raw venue as a claim, never assert acceptance without primary evidence.
 p['sourceNotes']=[{'label':'用户清单；出版信息与链接尚未回查','venueClaim':venue.strip(),'section':section}]
 tags(p,direction='综合具身智能' if section=='Embodied Intelligence Foundations' else '具身医疗',contribution='综述' if any(w in title.lower() for w in ['survey','review']) else '方法')
 if any(w in section for w in ['Surgical','Rehabilitation']):p['tags']['direction']=['操作','具身医疗']
 if 'Hospital' in section:p['tags']['direction']=['导航','具身医疗']
 if section=='Datasets, Simulators, and Benchmarks':p['tags']['contribution']=['数据集','Benchmark']
 for u in urls(rest):p['sources'].append({'kind':'reference','label':'用户清单链接（未回查）','url':u,'supports':['待回查']})
 add(p)
md=(INPUT/'主动交互巡检与故障诊断_相关工作调研.md').read_text()
for m in re.finditer(r'^### \d+\. (.+)\n([\s\S]*?)(?=^### |^## |\Z)',md,re.M):
 title=re.sub(r'\([^)]*\)\s*$','',m.group(1)).strip();body=m.group(2);p=base(title)
 if '论文链接' not in body:continue # Discussion subheadings are not papers.
 note(p,'主动交互巡检与故障诊断_相关工作调研.md',m.group(1));tags(p,direction='综合具身智能',task='巡检|主动感知',contribution='方法')
 for u in urls(body)[:3]:p['sources'].append({'kind':'reference','label':'调研所引论文或项目（未回查）','url':u,'supports':['待回查']})
 add(p)
# Named items in prose notes: explicit coverage rather than guessing every bibliography reference.
names=['Mem2Ego','EvolveNav','BeliefMapNav','MTU3D','MapNav','SpaceVLN','HiMemVLN','CMMR-VLN','EvoNav / History to Future','VLingNav','Qwen-RobotNav','BridgeNav','POINav','Walk With Me','Back to the Familiar Future','DecoVLN','Uni-LaViRA','RAVEN: Long-Horizon Reasoning & Navigation with a Visuo-Spatio-Temporal Memory','ABot-Claw','AREAL2.0','Harness Handbook']
for name in names:
 p=base(name);note(p,'用户本轮消息与粘贴文本','名称索引 / '+name);tags(p,direction='导航' if name not in ['ABot-Claw','AREAL2.0','Harness Handbook'] else '综合具身智能',contribution='方法',problem='记忆')
 p['gaps'].insert(0,'论文全名与身份匹配');add(p)
for p in records.values():
 (ROOT/'data/papers'/f"{p['id']}.json").write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/import-log.json').write_text(json.dumps({'inputFiles':15,'initialRecords':len(records),'mergedAppearances':len(merges),'merges':merges},ensure_ascii=False,indent=2))
print('基础索引',len(records),'合并重复出现',len(merges))
