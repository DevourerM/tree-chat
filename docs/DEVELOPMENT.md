# 独立项目与开发目录

`tree-chat/` 是本项目的根目录，包含自己的 `.git/` 和 `package.json`。父级 `dsh-plugin/` 只是容纳多个插件的目录，没有 Git 仓库；新插件应在自己的平级子目录独立初始化 Git。

所有日常命令在本目录执行：

```powershell
git status
npm run build
npm test
npm run check:host
npm run pack:plugin
```

## 文件归属

| 目录 | 内容与管理方式 |
| --- | --- |
| `src/`、`lib/`、`assets/`、`locale/` | 插件源码、预构建运行文件和资源，由当前 Git 仓库管理 |
| `scripts/`、`test/`、`docs/`、`dist/` | 开发脚本、测试、文档和发行校验；发行包 `.tgz` 忽略 |
| `research/` | 本项目宿主运行时、接口研究及分析资料，本地保留，Git 忽略 |
| `artifacts/` | 合成会话、测试截图、报告、浏览器依赖、历史开发工件，本地保留，Git 忽略 |
| `tools/web-agent/`、`web-agent-handoff/` | 本项目历史网页协作工具和记录，本地保留，Git 忽略 |

开发脚本默认只查找本项目内的资源，不回退使用父级或其他插件的目录。可通过环境变量覆盖：

- `DSH_DEV_RUNTIME`：真实 DSH 运行时的 `node_modules`；默认依次查找 `research/compat-0.2.1-rc.5/dsh/node_modules`、`research/compat-0.2.1-rc.3/dsh/node_modules`、`research/compat-0.2.1-rc.2/dsh/node_modules` 和 `research/dsh/node_modules`。
- `TREE_ARTIFACTS`：默认 `artifacts/`。
- `TREE_PLAYWRIGHT`：浏览器驱动入口；默认查找本项目的 `node_modules/playwright/index.mjs` 和 `artifacts/browser-tools/node_modules/playwright/index.mjs`。
- `TREE_CHROMIUM`：测试 Chromium 的可执行文件，未设置时使用 Playwright 默认浏览器。

原有测试数据与协作记录直接迁移保留，没有批量改写历史对话或报告中的原始路径。`artifacts/` 内的旧版本一次性生成脚本属于历史工件；常规开发以受 Git 管理的 `scripts/` 和 npm 命令为入口。

## Git 历史

2026-10-25 将外层开发目录收拢为独立项目：

- 当前 `main` 承接公开 tree-chat 仓库的历史，远端 `origin` 为 `https://github.com/DevourerM/tree-chat.git`。
- 已发布版本标签完整保留。
- 原来以外层目录为根的完整开发历史保留在本仓库的 `codex/tree-chat` 分支；当时插件源码位于历史树中的 `tree-chat/`，不改写旧提交。
- `artifacts/tree-chat-publish/` 是既有的发行核对检出，已随项目迁入；正常开发直接使用当前仓库，不必再将源码从外层仓库复制过去。

查看早期开发记录时可使用：

```powershell
git log codex/tree-chat -- tree-chat
git show codex/tree-chat:tree-chat/package.json
```

本次整理不改变插件版本、DSH 配置或原生聊天，也不修改远端已有提交和发行包。

## 整理后验证

- 在本项目根目录直接构建，`lib/` 与整理前一致。
- 45 项测试及真实 DSH V4 重放通过；测试使用本项目内的宿主运行时和产物目录。
- 真实合成 Host 的框选、平移、节点菜单、集合删除/撤销及刷新恢复通过。
- 标准包预检仍为 24 个文件，不包含研究资料、测试会话或协作工具；已发布的校验文件保持原样。
- Git 根为 `tree-chat/`，父目录不是 Git 工作树；原开发历史及所有已发布标签可读取。
