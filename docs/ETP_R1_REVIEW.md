# ETP-R1 本地评测发布检阅

本次只新增 ETP-R1，保留 Uni-LaViRA 原记录。DualVLN 草稿暂存于研究工作区，未包含在发布内容中。线上尚未更新。

## 核对成绩

| 协议 | Episodes | SR (%) | SPL (%) | OSR (%) | NE (m) | nDTW (%) | sDTW (%) |
|---|---:|---:|---:|---:|---:|---:|---:|
| R2R-CE val_unseen | 1839 | 64.65 | 55.00 | 70.47 | 3.988 | 65.55 | 53.34 |
| RxR-CE val_unseen guide / all languages | 11006 | 59.41 | 48.79 | 65.91 | 5.255 | 65.20 | 50.09 |

R2R 为英语；RxR 包含英语、印地语和泰卢固语。成绩为 PAI DSW 本地实测，非作者报告。
R2R 检查覆盖、数值和汇总一致性，缺少完整轨迹复算；RxR 全部 11,006 条任务完成，结果覆盖与指标校验通过；分两段执行。

## 手动检阅

1. 打开仓库根目录 embodied-atlas-preview.html。
2. 搜索 ETP-R1，进入论文详情，点击“复现详情”。
3. 对照上表，检查两条记录的协议、数量、数值和限制。
4. 如需查看附件，在仓库根目录执行 python -m http.server 8000 --directory dist，用该服务器预览。单文件离线预览的附件链接不保证可用。
5. 在完整站点预览中下载两份结果/校验摘要 JSON。附件仅含摘要，不含完整原始轨迹。

## 阅读数据

打开 data/reproductions/etp-r1.json：

- paperId: 对应论文稳定 ID，必须保持 etp-r1。
- summary: 整条复现记录的简介。
- runs: 多次运行组成的数组；runs[0] 为 R2R，runs[1] 为 RxR。
- scope / episodeCount: 协议与任务数量。
- metrics.success: SR 的原始比例，0.646547... 显示为 64.65%。
- metrics.spl / oracle_success / ndtw / sdtw: 同样使用 0–1 原始比例。
- metrics.distance_to_goal: NE，单位米，不乘 100。
- limitations: 复现限制，不能删成无条件的“全部成功”。
- evidence: 附件地址及其内容校验值。修改附件后必须重新计算 SHA256。

可先练习修改 summary 的措辞，保存后在仓库根目录运行 npm run check，重新打开预览。
实测数值只能根据原始结果文件更新，不作为练习随意修改。

## 发布

检阅后提交源文件、两份摘要及必要的生成产物，通过 PR 审阅并合并 main。
main 会触发已有 GitHub Pages 工作流；部署成功后核对 #/paper/etp-r1。
本次准备过程未提交、推送或发布。
