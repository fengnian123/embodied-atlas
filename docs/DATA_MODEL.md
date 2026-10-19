# 数据字段与维护约定

所有展示条目来自 `data/papers/*.json`，一篇一个文件。使用 UTF-8，`null` 表示尚无确认值。示例模板位于同目录 `paper-template.json`，它不参与网站正式数据构建。

| 字段 | 类型 | 含义与约束 |
|---|---|---|
| id | string | 稳定唯一 ID，字母/数字/短横线；等于文件名，不随标题变化 |
| title / short / aliases | string / string / string[] | 英文完整标题、简称、搜索别名 |
| authors / institutions | string[] | 经确认的完整作者列表与机构；空数组明确显示未核实 |
| firstPublished | ISO date / null | 首次公开日；日期筛选和时间排序仅使用此字段 |
| updated | ISO date / null | 原来源最新版本日；未知不得用核验日替代 |
| publicationYear | integer / null | 正式发表年份，独立于首次公开年份 |
| publicationStatus / venue | string / string或null | 状态与会议/期刊。作者声明的录用与官方论文集分别标注 |
| year | integer / null | 本轮导入的兼容字段；前端不以它推断首次公开日期 |
| tags | object | 独立维度标签数组，必须在 taxonomy 登记 |
| summary | string | 列表一句话贡献；基础索引不得伪装成已核实摘要 |
| overview | string（可选） | 约100–200字：问题、意义、思路与主要改变 |
| method | object或null | input / output / flow[] / assumptions / difference / explanation / modules[]。每个模块写 name、purpose、input、mechanism、output，可附 sourceUrl 与 locator |
| training | object或null | regime / models / trainable / frozen / data / objective / stages |
| evaluation | object[] | benchmark / setting / result / locator / attribution / sourceUrl；可附 table 或 tables[]，不跨协议合并排行榜 |
| limitations | object | author[] 是原文自述，analysis[] 是本库分析；二者不能互相冒充 |
| benchmark | object（可选） | 下表的基准专属协议 |
| resources | object | paper/code/project/data/weights，每个对象包含 url 和明确 status |
| sources | object[] | kind、label、url或null、locator、supports[]。保留字段级核验范围 |
| related | object[] | id 与 reason，明确关联理由；自动推荐注明共享标签 |
| status | enum | 待核实 / 基础索引 / 重点详解，不代表质量评分 |
| checked | ISO date或null | 最近查阅并核验的日期 |
| verification | string（可选） | 核验范围说明 |
| verificationLevel | enum | fulltext / metadata / unresolved；原文回查、基础来源核验、身份或原文来源尚未确认 |
| gaps | string[] | 待完善项，不因有缺口隐藏条目 |
| sourceNotes | object[] | 未核实的用户摘记，详情折叠展示，不提升为正式结论 |
| bibtex | string或null | 来源完整可靠时提供；arXiv格式与会议格式应分别说明 |
| citationNote | string（可选） | 引用格式的来源与版本说明 |

`resources.*.status = "已核实入口"` 才计入“已核实资源”筛选。它仅证明入口在原始来源出现，不证明下载、训练、许可和结果已经复现。占位仓库和待回查链接应使用明确的其他状态。

## 标签维度

| key | 中文 | 例子 |
|---|---|---|
| direction | 研究方向 | 导航、操作、场景表征 |
| task | 具体任务 | VLN、ObjectNav、EQA、巡检 |
| paradigm | 技术范式 | VLM、VLA、LLM、3D/4D 表征 |
| system | 系统形态 | 端到端策略、模块化系统、具身 Agent |
| contribution | 贡献类型 | 方法、Benchmark、数据集、系统 |
| problem | 核心问题 | 记忆、规划、实时性、动态环境 |
| environment | 环境与平台 | 真实世界、真实采集资产、仿真、预采集观测池 |
| training | 训练方式 | 监督微调、强化学习、冻结主干并训练模块、仅推理使用、场景表示优化、训练细节未核实、不适用 |

年份与会议从元数据派生，不重复手写标签。“没有 VLM”不等于“整个系统无训练”；3D/4D 场景拟合有训练/优化，但不是 VLM 微调。

## Benchmark 专属字段

`motivation, task, input, output, actions, success, collection, scale, split, metrics, baselines, assets, license, reproduction, coverage, boundary, leakage`。

规模必须说明统计单位，如场景、建筑、room scene、episode、子任务、轨迹、帧、问答。无法回查的数量明确写未核实，不以旧笔记替代当前原文。方法和数据集同属一篇时保留在一条记录，使用贡献标签并行表达。

## 合并与版本

对已知 arXiv ID 与规范标题执行重复检查。简称不同但同一论文需要人工合并，保留原始来源并为旧 ID 建重定向。同名不同论文不能合并，例如两种 RoboHarness 与两种 AgenticNav。

如果一个会议/期刊扩展显著改变研究内容，先核对作者与官方版本声明，再决定是同条版本资源还是强关联独立论文；不要仅根据相似标题自动合并。

## 数据校验范围

`npm run validate` 检查 ID、文件名、规范标题、同 arXiv 论文身份、标签、日期有效性与先后关系、URL语法和协议、来源存在性、关联链接、重定向、阅读路线与详解所需字段。它不对互联网 URL 发请求，因此不能把校验成功描述成“全网链接全部可用”。

## 原文数据表

`evaluation[].table` 或 `tables[]` 接受 `{caption, columns: string[], rows: any[][], sourceUrl, locator, note}`。每行长度必须与列数相同。关键结果须包含原文表号、版本、单位与评测条件。由图估读的数据必须在 attribution / note 中明确标为近似值，不能伪装成精确表值；正文报告的相对提升不能改写为绝对百分点。跨论文、跨模型或跨版本的数值不得自动归入统一排名。

## 复现详情

Uni-LaViRA 的用户测试记录单独保存在 `data/reproduction-unilavira.json`，构建时按稳定 ID 注入。包含 `source, setup, pipeline, timeline, metrics, observations, gallery, missing`。其他记录统一注入 `{status: "未复现"}`。作者论文结果属于 `evaluation`，不能据此把 reproduction 改为已复现。

图像和原测试PDF位于 `src/assets/reproduction/unilavira/`。图像已内嵌进单文件预览；PDF与全文文字随完整项目托管。原始框坐标保留日志值，不默默纠正或标准化。
