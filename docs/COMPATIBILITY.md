# 宿主兼容性

## tree-chat 1.0.0（2026-10-19）

| 宿主 | 验证范围 |
| --- | --- |
| Windows / DSH 0.2.1-rc.2 | 33 项测试通过；原生 V4 重放；集合、权限、新枝、导航、布局、长历史和轮询 GUI |
| Windows / DSH 0.2.0-rc.2 | 32 项通过，仅新版工作目录事件测试跳过；原生 V4 重放 |
| 其他版本与系统 | 尚未验证 |

命名集合使用可选 groups 字段，原始节点和上下文结构不变。旧图直接打开，无需迁移；建议保存过集合后持续使用 1.0 或更新版本。

权限继承通过原生 permissionPresets、setSandboxMode 和 setApprovalPolicy；目标分支未在内存时先原生 resume，再应用来源选择。所有准入仍交给宿主，Auto 不可用时拒绝。适配模块独立于图数据，不修改宿主文件。

新增集合纯函数、集合状态适配、集合对话框与宿主权限桥；Host 和客户端继续共用投影/布局。大图按视野渲染，无变更轮询返回 unchanged/revision，批量导入共用空间索引。具体证据见 [VALIDATION.md](VALIDATION.md)，Argon 协作范围见 [V1-REVIEW.md](V1-REVIEW.md)。


## tree-chat 0.2.3（2026-10-19）

支持范围仍为 Windows / DSH 0.2.0-rc.2、0.2.1-rc.2。新版原生运行时 23 项测试全部通过，旧版 22 项通过，仅新版工作目录事件的原生测试跳过。

新增 `draftBranches` 可选元数据，继续兼容旧的 `pendingBranch`。空分支持续保留在树中，首轮完成后沿用该节点 ID 和位置；旧单分支无需手工迁移。多个空分支的保留、重启重读、指定删除、后台完成与布局撤销均有服务回归。

Host 和客户端共用布局模块，尺寸变化不改变逻辑坐标。整理操作只调整坐标、按当前左右位置排序，不改节点关系或消息上下文。新节点寻找最近空位，已有节点在新分支加入时保持位置。

原生 GUI 已验证实线空节点、多个空分支刷新恢复、移动后避让、保序整理、撤销/重做、首轮完成后原位填入内容，以及深浅主题与 320/480/650px 侧栏。界面夹具使用隔离数据和本地模型。

## tree-chat 0.2.2（2026-10-19）

| 宿主 | Windows 验证结果 |
| --- | --- |
| DSH 0.2.0-rc.2，build `04f392c9` | 19 项测试通过；仅新版工作目录事件的原生测试跳过；V4 重放、导航、删除桥接及轮询 GUI 通过 |
| DSH 0.2.1-rc.2，build `332895e0` | 20 项测试全部通过；V4 重放、分枝全流程、导航、删除桥接、轮询及布局 GUI 通过 |
| 其他版本、其他系统 | 尚未验证 |

新版运行时来自本机更新器已下载的官方安装包，在工作区解包后使用独立 `DSH_HOME` 启动 Web Host。没有运行安装包、停止日常 Desktop 或读取日常聊天内容。原生持久化依赖来自同一安装包；隔离测试未包含与插件无关的 Office/PDF 转换依赖。

### 新版接口检查

- Session 格式仍为 V4，原生构造、完整轮次、工具调用/结果、派生会话及持久化重放接口可用。
- 原生 Slot、`useTabInfo().tab.visible`、保留挂载的右侧栏、会话视图切换及消息历史加载接口可用。
- 聊天消息定位依赖的 `data-conversation-*`、`data-chat-turn` 标记仍可用，单击选择、双击定位、拖动、删除与撤销已实测。
- 新增 `working-directory/change`；分枝现在按所选路径末端节点的有效目录构造 Session 元数据。根分枝使用原始目录，历史分枝不带入其后的目录变更。
- 新版向模型请求注入 `source.kind = runtime-context` 的环境快照。GUI 验证按来源区分真实用户输入，完整请求仍留存并由宿主处理。
- peer 范围显式包含 `0.2.1-rc.2`，避免 npm semver 对不同版本预发布号的默认排除规则；辅助安装器只允许实际验证的宿主版本。

### 性能优化验收

侧栏保持挂载以保存布局，但只在其原生 `tab.visible` 为真时轮询；隐藏面板不会覆盖当前树的共享视野缓存。切回时立即请求最新图，原有轮询继续处理生成完成后的节点。

GUI 测试保留至少两个面板，跨两个轮询周期观察网络：只有可见分支发出 `get`；收起侧栏后没有 `get`；重开立即同步。两版宿主均通过。

### 复现

将 `DSH_DEV_RUNTIME` 指向目标版本已解包的 `node_modules` 后执行：

```bash
npm run build
npm test
npm run check:host
npm run pack:plugin
```

无宿主运行时时运行核心测试：17 项通过，3 项宿主集成测试明确跳过。GUI 使用 `scripts/prepare-dev.mjs` 创建隔离配置，配合 `scripts/ui-navigation-test.mjs`、`scripts/ui-branch-creation-test.mjs`、`scripts/ui-polling-test.mjs` 和 `scripts/ui-layout-test.mjs`；运行条件见 [验证记录](VALIDATION.md)。

用户通过 DSH 插件界面安装，不需要设置上述开发变量。新版公开发行包安装结果记录在 [验证记录](VALIDATION.md)。
