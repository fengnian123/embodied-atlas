"""One-time identity reconciliation and provenance-completeness fixes."""
import json,re
from pathlib import Path
R=Path(__file__).resolve().parents[1];files=R/'data/papers';ps={p.stem:json.loads(p.read_text()) for p in files.glob('*.json')};redirect=json.loads((R/'data/redirects.json').read_text());merges=[]
def merge(old,new,reason):
 a,b=ps[old],ps[new];b['aliases']=list(dict.fromkeys(b['aliases']+[a['title'],a['short']]+a['aliases']));b['sources']+=a['sources'];b['sourceNotes']+=a['sourceNotes'];redirect[old]=new;del ps[old];merges.append(dict(old=old,new=new,reason=reason))
def find(title):return next(p['id'] for p in ps.values() if p['title']==title)
merge(find('Uni-LaViRA'),find('Uni-LaViRA: Language-Vision-Robot Actions Translation for Unified Embodied Navigation'),'简称与完整标题合并')
merge(find('ABot-AgentOS static memory'),'abot-agentos','8/24帧是实验设置，不是独立论文')
merge(find('MTU3D'),find('Move to Understand a 3D Scene: Bridging Visual Grounding and Exploration for Efficient and Versatile Embodied Navigation'),'官方方法简称 MTU3D 与论文标题统一；原笔记来源保留')
for p in ps.values():
 p['tags']['training']=['训练细节未核实' if t=='训练细节未公开' else t for t in p['tags']['training']]
 if p.get('training') and '未公开' in p['training']['regime']:p['training']['regime']='训练细节未核实'
 if not p['gaps']:p['gaps']=['资源许可证与下载可用性仍需核实']
# Correct a summary-based implementation field that did not establish the exact module training regime.
ps['roboharness-routing']['tags']['training']=['训练细节未核实']
ps['gap']['tags']['paradigm']=['LLM'];ps['typego']['tags']['paradigm']=['LLM']
ps['remembr']['benchmark']={
 'motivation':'用长导航视频中的空间、时间与描述问题评估检索记忆。',
 'task':'NaVQA：对过去观测进行问答；论文另展示机器人按检索目标导航。',
 'input':'长程导航视频、时间/位置记录及问题',
 'output':'自然语言答案，部署系统可输出导航目标',
 'actions':'问答集本身不允许任意新采集；实机演示与离线问答分开。',
 'success':'按原文问答评价与延迟；没有统一导航 SR 定义。',
 'collection':'为长程机器人导航视频标注空间、时间和描述问题。',
 'scale':'用户调研记录7段视频/210问答；本轮未回查该数字，暂不作为已核实规模。',
 'split':'未核实', 'metrics':'问答质量与检索/推理延迟（具体版本按原文）',
 'baselines':'LLM 与 VLM 基线', 'assets':'论文提供数据、代码与视频的官方项目入口；下载未逐项验证。',
 'license':'未核实','reproduction':'需要观测描述、时间位置记录、检索存储和模型接口。',
 'coverage':'长历史的何时/何地/描述性检索','boundary':'不评测自主复查调度或未观测未来状态预测。',
 'leakage':'记忆仅包含许可的历史；问题、答案与未来观测不可混入历史描述。'}
ps['remembr']['gaps']+=['NaVQA规模与划分逐项回查']
# Reliable arXiv-format BibTeX is composed from checked title, full author list, date and ID.
for p in ps.values():
 paper=p['resources'].get('paper',{}).get('url','')
 if p['authors'] and p['firstPublished'] and re.fullmatch(r'https://arxiv.org/abs/\d{4}\.\d{4,5}',paper):
  ax=paper.rsplit('/',1)[1];year=p['firstPublished'][:4]
  p['bibtex']='@misc{'+p['id'].replace('-','')+year+',\n  title = {'+p['title']+'},\n  author = {'+' and '.join(p['authors'])+'},\n  year = {'+year+'},\n  eprint = {'+ax+'},\n  archivePrefix = {arXiv},\n  url = {'+paper+'}\n}'
  p['citationNote']='以已核实完整作者、标题与 arXiv 元数据生成的预印本格式；不是会议版 BibTeX。'
for f in files.glob('*.json'):f.unlink()
for p in ps.values():(files/(p['id']+'.json')).write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
(R/'data/redirects.json').write_text(json.dumps(redirect,ensure_ascii=False,indent=2)+'\n')
(R/'docs/identity-merges.json').write_text(json.dumps(merges,ensure_ascii=False,indent=2)+'\n')
taxonomy={d:sorted(set(t for p in ps.values() for t in p['tags'][d])) for d in next(iter(ps.values()))['tags']}
taxonomy['aliases']={'Object Navigation':'ObjectNav','ObjectGoalNav':'ObjectNav','视觉语言导航':'VLN','具身问答':'EQA','4DGS':'3D/4D 表征','Agent':'具身 Agent','benchmark':'Benchmark'}
(R/'data/taxonomy.json').write_text(json.dumps(taxonomy,ensure_ascii=False,indent=2)+'\n')
print('最终',len(ps),'篇；重点详解',sum(p['status']=='重点详解' for p in ps.values()),'篇；可靠引用',sum(bool(p['bibtex']) for p in ps.values()))
