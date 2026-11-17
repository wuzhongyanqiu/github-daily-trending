# GitHub Daily Trending 协作规范

本仓库负责 GitHub Trending 抓取、元数据整理、中文编审内容与网页看板，不负责开源贡献自动化。

- GitHub 原始描述、Star、Fork、语言、许可证等事实字段必须保留来源，不得由模型臆造。
- 中文内容必须标明 `reviewed`、`draft` 或 `metadata`；自动生成内容不能标成人工编审。
- `data/editorial.json` 是人工编审覆盖层；刷新任务不得覆盖已有编审内容。
- 禁止提交 Token、Cookie 或 GitHub 登录信息。公开数据可匿名读取，Token 只能通过 `GITHUB_TOKEN` 环境变量注入。
- 页面修改后运行 `npm test`、`npm run build`，并完成桌面与移动端截图检查。
- 验证后使用中文提交信息提交，并只推送到自有发布远端。

## 构建产物验收（2026-11-17 起）

- `npm run build` 必须产出**单文件可双击**的 `dist/index.html`：JS/CSS 内联，数据在 `file://` 下走构建期内联快照。
- 任何构建产物交付前，必须用 `file://` 实际打开验证（Chromium/Chrome 实测渲染 + 控制台无报错 + 截图），dev server 能跑不算通过。
- 服务端部署仍走 `http(s)` 下拉取 `data/trending.json` 的逻辑，内联快照只在 `file:` 协议下生效。
- 构建验证必须覆盖两种环境：**本地不设 base**（`npm run build`）与 **CI 设 base**（`VITE_BASE_PATH=/github-daily-trending/ npm run build`）。只验本地等于没验——CI 的 base 前缀会让引用路径变长，曾因此把部署打挂。

## 每日推荐的真实试验要求（2026-11-17 起）

- 每天推荐的 3 个项目中，至少 1 个必须**真跑一遍**：库→安装并调用 API；应用→跑起来走主流程；工具→用真实任务试一次。
- 结论必须回答：**值不值得用、坑在哪、适合谁**；写清实际版本、命令/入口、观察到的报错或限制。
- 没跑就写“未实测”，不许用 README 复述冒充体验结论。
