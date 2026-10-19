# Embodied Atlas · 具身智能论文知识库

中文研究导航网站，适合 GitHub Pages。从用户调研资料出发逐篇回查原始来源，明确区分原文事实、作者报告和本库分析。最新覆盖数量与逐条缺口见 `docs/VERIFICATION.md` 和 `docs/PENDING.md`。

## 直接预览

打开项目根目录的 **`embodied-atlas-preview.html`**。它内嵌样式、数据和脚本，可离线浏览、筛选、阅读及对比。论文/代码等外部链接需要网络。离线预览的文件链接不能当作公开网站地址分享；部署后复制的链接才具有公开可达性。

完整站点在 `dist/`，可以使用任意静态服务器预览。本站无运行时依赖，无须 `npm install`，不需要 API 密钥或账户。

## 本地维护

需要 Node.js 20+（建议 22）：

```bash
npm run check
```

它会检查数据、构建 `dist/` 和单文件预览，并运行测试。修改数据后必须重建。`dist/catalog.json` 与 `dist/data.js` 都是生成产物，不要直接改它们。

```bash
npm run validate
npm run build
npm test
```

## 功能

- 全局中英文检索：标题、简称、别名、作者、机构、标签、摘要和概览。
- 方向、任务、范式、系统、贡献、问题、环境、训练、年份、会议、资源独立筛选。同维度 OR、跨维度 AND，计数随其他筛选条件更新。
- 分组与筛选独立；首次公开日期范围与可靠字段排序。
- 卡片 / 表格布局与极简 / 标准 / 详细密度独立；表格可选列、按标题或时间排序。
- 2–4 篇对比；Benchmark / 数据集有专属协议字段。
- 独立详情及目录；模块级方法解析，以及保留版本、协议、单位和来源定位的原文数据表。
- Uni-LaViRA复现详情：配置、步骤日志、原始bbox、问题记录、截图和测试PDF；其他论文明确为未复现。
- 默认只展示论文内容，参考资料折叠收纳；来源页码保留在结构化数据中。
- 原文事实、作者报告、作者局限与本库分析分开；支持筛选原文回查、基础核验、未确认身份和有量化数据的条目。
- 收藏、待读、已读：浏览器本地保存，JSON 导入/导出。不会自动跨设备同步。
- 筛选、展示选项、对比选择保存在 URL；详情分享链接不依赖服务器 rewrite。
- 有完整已核实书目信息时复制 BibTeX；否则明确禁用并解释缺口。
- 阅读路线、资料来源说明、缺失项登记与空结果反馈。

## GitHub Pages 部署

目标仓库：[fengnian123/embodied-atlas](https://github.com/fengnian123/embodied-atlas)。预期站点地址（启用 Pages 并成功部署后可访问）：`https://fengnian123.github.io/embodied-atlas/`。推送 `main` 后由 GitHub Actions 校验、构建并部署；具体发布结果以 Actions 为准。

1. 新建一个仓库，例如 `embodied-atlas`，或选择一个独立空仓库；已部署版本可直接维护上述仓库。
2. 将本目录内容放在仓库根目录。必须包含 `.github/workflows/pages.yml`，不要只上传压缩包，也不要遗漏隐藏目录。
3. 默认分支使用 `main`；若使用其他名字，修改 workflow 中的分支名。
4. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
5. 推送代码，查看 Actions 中的 **Validate and deploy GitHub Pages**。成功后，部署任务会提供网站地址。
6. 通常地址为 `https://<owner>.github.io/<repo>/`。如仓库为 `<owner>.github.io`，则从站点根目录访问。

已有本地 Git 环境时，在本目录中执行以下命令（替换 URL）：

```bash
git init
git add .
git commit -m "Build embodied AI paper atlas"
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

如果目标仓库已经有内容，先在该仓库独立分支中合并，不要直接覆盖。GitHub 仓库/组织的 Pages 与 Actions 策略可能需要管理员启用。

工作流依照 [GitHub 官方 custom workflow 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) 配置上传与部署权限。PR 只验证构建；`main` 推送或手动触发才部署。

### 为什么详情刷新不会 404

详情使用 `https://<owner>.github.io/<repo>/#/paper/<id>`。`#` 后由本地脚本处理，服务器始终请求仓库首页。资源全部使用相对地址，保留任意仓库子路径。不要将路径改成 `/paper/<id>`，也不要删掉 `#`。

筛选示例（部署后在页面中选择并复制即可）：

```text
?f.direction=导航&f.environment=真实世界&f.contribution=Benchmark&from=2024-01-01&to=2024-12-31&group=year#/
?compare=openeqa,goat-bench,homesafebench#/compare
?f.direction=导航&view=table#/paper/remembr
```

## 添加论文

1. 在 `data/papers/` 添加一个 JSON 文件；文件名必须等于稳定 `id`。参考 `docs/DATA_MODEL.md` 和 `docs/paper-template.json`。
2. 新标签先加入 `data/taxonomy.json`。可以添加别名，禁止把任务、模型与贡献混成一个维度。
3. 不能确认的信息用 `null`、空数组或“未核实”；不要凭 arXiv 编号猜首次公开日，不要把没有查到代码写成没有代码。
4. 补充原始来源、章节/表格定位、核验范围与日期。结果必须注明数据集、版本、子集与模型设置。
5. 已有条目改标题、发表信息或新增版本链接时，继续使用原 ID。合并误重复时，在 `data/redirects.json` 中为旧 ID 添加映射。
6. 执行 `npm run check` 后提交。Pages 自动部署更新。

批量导入迁移脚本 `scripts/ingest.py`、`curate.py`、`finalize-data.py` 仅保存本轮处理的来历。它们依赖当时的附件中间文件，并会重建数据，**日常维护不要重跑**。平时只编辑 JSON。

## 目录

```text
data/papers/            每篇论文的独立 JSON
data/taxonomy.json      多维标签与检索别名
data/editorial.json     类别说明与阅读路线
data/redirects.json     旧 ID 到正式 ID 的映射
src/                   页面、CSS、应用与纯逻辑
scripts/validate.mjs    字段、日期、标签、重复身份与链接格式校验
scripts/build.mjs       静态构建；不需要第三方依赖
tests/                 筛选逻辑与页面渲染合同测试
docs/                  来源盘点、字段说明、待核实清单与验收报告
dist/                  可直接托管的构建产物
.github/workflows/      GitHub Pages 自动验证与部署
```

## 内容与验证边界

重点详解表示已核验核心问题与方法，不表示所有资源、作者机构、训练超参数或版本均已完整。基础索引保留用户材料和待回查线索；协议未对齐的 EQA 分数没有导入成统一排行榜。少量相关工业视觉和医疗综述作为背景收录，实际行动范围在详情中说明。

已通过自动数据/逻辑/渲染合同测试。当前环境未提供支持的浏览器控制能力，**未进行真实浏览器的视觉与键盘端到端验收**。研究代码、模型、数据下载和 GPU 复现也不在本次验证范围内。详见 `docs/QA.md`；覆盖统计见 `docs/VERIFICATION.md`。

原论文、截图、数据、模型和第三方代码各自的许可不因本站收录而改变。项目未打包研究论文原PDF、XLSX或模型资产。Uni-LaViRA用户提供的测试PDF、文字提取和选定截图随复现详情一同提供；它不是论文作者的正式评测。

可选HTTP检查：`python scripts/check-links.py`（复用上次观测；加 `--refresh` 重查）。HTTP可达性不等于下载、许可或结果复现；限流、403和超时不自动标为资源不存在。
