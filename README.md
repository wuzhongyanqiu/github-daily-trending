# GitHub Daily Trending

每日质量规范：先看快照 `coverage.pendingResearch` 与 `metadataFailures`。新增研究写入 `data/research.json`，保持 `draft`、完整 commit、阅读日期与一手来源；人工 `data/editorial.json` 始终优先。当前 12 个项目已补充作用机制、试用步骤和边界，资料阅读不代表功能实测。

更新器原子写入快照。仓库 API 失败时保留此前许可等字段并标注 `stale` / `unavailable`，不把失败伪装成今日核验；退出码 2 表示部分刷新，空榜或格式错误拒绝覆盖。先提交本任务改动、核对自有远端，再重新构建与发布；本仓库尚无远端时保留本地提交并报告未推送，不自行创建远端。

一个面向中文读者的 GitHub 每日趋势观察看板。它每天读取 GitHub Trending 与公开仓库元数据，并把“今天什么项目在升温”整理成可搜索、可筛选、可连续阅读的中文技术简报。

## 看板内容

- 今日排名、当日新增 Star、累计 Star、Fork、主要语言与最近推送时间。
- 项目是什么、值得关注的能力、适用场景、目标人群与采用风险。
- GitHub 原始英文简介、仓库主页、许可证和 Topics，便于回到一手来源核验。
- 中文内容状态：`人工编审`、`AI 草稿` 或 `元数据整理`，避免把自动概括当作项目官方描述。
- 桌面端排行与详情双栏浏览，移动端响应式单列布局。

## 数据边界

GitHub Trending 是动态网页，不是稳定的公开 API。本项目解析其每日榜单页面，再通过 GitHub REST API 补齐公开仓库元数据。抓取器在页面结构异常、完全未解析到项目时会失败并保留上一版数据，不会生成空榜单。

`data/editorial.json` 是人工编审覆盖层。刷新时已有中文内容会按仓库全名保留；新上榜项目会先生成明确标记为 `metadata` 的中文元数据说明，等待后续复核。

Star 热度不等于项目质量、安全性或可维护性。采用任何项目之前都应检查 README、许可证、提交历史、Issue、安全策略和依赖风险。

## 本地运行

需要 Node.js 22+。

```bash
npm install
npm run update
npm run dev
```

打开 Vite 输出的本地地址即可查看看板。

## 验证

```bash
npm test
npm run build
```

## 自动更新与部署

Codex 本地定时任务 `github` 每天北京时间 08:20 刷新数据、验证并在数据变化时提交，同时把执行结果写入 `sync-controller` 综合看板。`.github/workflows/update-trending.yml` 只保留手动补跑入口，避免与本地任务双跑；`deploy-pages.yml` 在主分支更新后构建并发布 GitHub Pages。

匿名 GitHub API 请求有较低限额。自动化使用 GitHub Actions 自动提供的 `GITHUB_TOKEN`；本地需要更高限额时也只能通过同名环境变量注入，禁止写入仓库。

## 目录

```text
data/editorial.json          人工中文编审覆盖层
public/data/trending.json    当前可发布数据快照
scripts/update-data.mjs      Trending 抓取与仓库元数据补全
src/                         React 看板
tests/                       抓取解析测试
```

## 许可证

MIT
