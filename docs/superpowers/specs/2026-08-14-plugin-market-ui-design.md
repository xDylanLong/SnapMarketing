# SnapMarketing 插件市场 UI 改造设计

## 目标

将 SnapMarketing 从 Harness 的“插件”设置分区中移出，作为设置弹框左侧的独立顶层入口“插件市场”。进入后，右侧展示完整的插件发现与安装列表。

## 范围与不变项

- 移除 `settings.plugins.tab` 入口，不再显示在 Harness 的“插件”设置分区内。
- 以 `settings.section` 注册独立入口，标签为“插件市场”，排序紧跟 Agent 预设之后。
- 保留现有目录读取、Manifest 校验、安装 Remote、安装进度、错误提示、仓库查看和已安装状态。
- 仅调整 UI 呈现；Manifest 的 `category` 与 `placement` 字段继续保留给目录和兼容逻辑使用，但不在插件市场列表中展示。

## 页面结构

右侧页面从上到下分为三层：

1. 产品头部：使用用户提供的紫色鲸鱼/拼图产品 logo，旁边显示 `SnapMarketing`。
2. 发现与搜索行：左侧显示“发现 DeepSeek Harness 生态插件”和插件数量，右侧显示搜索框与“搜索”按钮。搜索仍为提交式，按 Enter 或点击按钮后生效。
3. 插件列表：不再有分类筛选，不区分 UI 插件与工具插件，不展示 slot 或显示位置。每行显示插件名称、简短描述、版本、仓库“查看”链接，以及“安装”/“安装中…”/“已安装”状态。

列表继续使用现有分页逻辑，每页 10 条；搜索、刷新和安装成功后的刷新回到第一页。窄屏下搜索行和插件行允许换行，操作按钮保持可点击。

## 实现边界

- `client/index.ts`：将贡献点从 `settings.plugins.tab` 改为 `settings.section`，注册 id `plugin-market`、label `插件市场`、order `21`，从而紧跟 Agent 预设。
- `PluginCenterTab.tsx`：改用 `PropsRuntime<'settings.section'>`，移除 placement 状态、localStorage 持久化和 UI/category 展示依赖，增加产品头部结构。
- `PluginCard.tsx`：移除 slot 弹出选择、UI/工具分类文字和 slot 状态文案，保留列表行、仓库链接、安装状态和进度反馈。
- `styles.ts`：增加产品头部样式，保持第二行发现/搜索布局，并将插件内容保持为单列列表。
- 测试：先为顶层入口、产品头部、无分类/无 slot 列表和搜索行为补充失败测试，再实现并运行 focused client tests；随后运行完整测试、typecheck 和 build。

## 数据流与错误处理

页面首次挂载时复用现有 `load()` 并行读取目录和已安装清单。目录加载失败继续显示可重试错误；安装失败保留当前行的错误消息和进度状态；安装成功后重新读取清单并显示“已安装”。产品 logo 作为插件包内静态资源发布，加载失败时使用轻量的文字标识，不阻塞插件列表。

## 验收标准

- 设置左侧可看到“插件市场”，位置在 Agent 预设下方。
- “插件”设置分区中不再有 SnapMarketing 标签页。
- 右侧顶部出现 logo 与 `SnapMarketing`；下一行出现发现文案、数量和搜索栏。
- 列表没有分类筛选、UI/工具插件标识、slot、显示位置或 placement 控件。
- 搜索、分页、查看仓库、安装进度、错误提示和已安装状态仍可用。
- focused client tests、完整测试、typecheck、build 均通过。
