# GitHub Daily Trending 协作规范

本仓库负责 GitHub Trending 抓取、元数据整理、中文编审内容与网页看板，不负责开源贡献自动化。

- GitHub 原始描述、Star、Fork、语言、许可证等事实字段必须保留来源，不得由模型臆造。
- 中文内容必须标明 `reviewed`、`draft` 或 `metadata`；自动生成内容不能标成人工编审。
- `data/editorial.json` 是人工编审覆盖层；刷新任务不得覆盖已有编审内容。
- 禁止提交 Token、Cookie 或 GitHub 登录信息。公开数据可匿名读取，Token 只能通过 `GITHUB_TOKEN` 环境变量注入。
- 页面修改后运行 `npm test`、`npm run build`，并完成桌面与移动端截图检查。
- 验证后使用中文提交信息提交，并只推送到自有发布远端。
