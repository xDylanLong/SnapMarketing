# SnapMarketing 自更新机制设计

## 目标

为已安装的 `@snapmarketing/dsh-plugin-center` 增加用户可控的版本检查和更新能力。用户在 SnapMarketing 页面中手动检查 npm 上的最新版本；如果有新版本，点击按钮通过 DSH 当前 profile 更新 SnapMarketing 自身。

本次范围只包含 SnapMarketing 自身，不增加市场内其他插件的更新能力。

## 交互

- 市场页面顶部显示当前 SnapMarketing 版本。
- 页面提供“检查更新”按钮。
- 未检查时不显示更新结论，避免把目录中的插件版本误当作 SnapMarketing 版本。
- 检查成功后显示最新版本；当最新版本高于当前版本时显示“更新 SnapMarketing”。
- 检查失败显示可重试的错误信息，不影响市场目录浏览和普通安装。
- 更新期间禁用更新相关按钮。
- 更新成功后提示“更新成功，请重启/刷新 Harness”；不在当前进程中假设新代码已经加载。
- 更新失败保留错误信息，用户可以再次检查或更新。

## 架构

### Host

在现有 `PluginCenterGateway` 中增加 SnapMarketing 自身的更新服务，不扩展市场插件的 `install/uninstall` 流程。

- 当前版本从已安装的 SnapMarketing package manifest 得到。
- 最新版本通过现有 DSH CLI 转发能力查询 profile 对应的 pnpm registry 信息。
- 更新调用 `dsh plugin --profile <profile> update --latest @snapmarketing/dsh-plugin-center`。
- Host 只接受固定的 SnapMarketing package name，不从浏览器接收任意 package source。
- 所有命令沿用现有 timeout、profile、command 和 commandArgs 配置。

### Remote

增加两个固定的 Remote 方法：

- `pluginCenter/updateStatus`：返回当前版本、最新版本、是否可更新。
- `pluginCenter/updateSelf`：执行 SnapMarketing 自身更新并返回 `needsReload` 与用户可见消息。

Remote schema 对版本字符串和操作结果做严格校验。现有目录、已安装状态、安装和卸载 Remote 保持不变。

### Client

在 `PluginCenterTab` 的品牌头部增加独立的 SnapMarketing 更新区域。更新状态与目录状态分开管理，避免更新检查触发目录安装状态的乐观变化。

- `检查更新` 调用 `updateStatus`。
- 发现新版本后显示 `更新 SnapMarketing`。
- 更新调用 `updateSelf`，成功后显示重启提示并刷新版本状态；不自动卸载、重新安装或修改其他插件。

## 版本判断

版本按标准 semver 比较。只有 `latestVersion` 严格大于 `currentVersion` 时才显示可更新。无法解析版本或 registry 返回非预期数据时，检查操作失败并返回明确错误。

## 错误和安全边界

- 网络、registry、pnpm 或 DSH CLI 失败都通过 Host 转换成可展示的错误消息。
- 更新命令不接受来自浏览器的 package name、版本号或路径参数。
- 不自动更新，不在后台轮询，不执行任意脚本入口。
- DSH profile 的锁文件和依赖状态仍由 DSH/pnpm 管理。
- 成功更新只代表 package manager 已完成操作；Harness 进程何时加载新 bundle 由用户重启/刷新完成。

## 测试

- Host：验证版本查询命令、版本解析/比较、更新命令固定参数、成功和失败结果。
- Remote：验证新增方法 descriptor 和 schema 与实现一致。
- Client：验证当前版本、检查按钮、可更新状态、更新中的禁用状态、成功重启提示和失败提示。
- 回归：现有目录加载、安装、卸载和已安装状态测试保持通过。

## 明确不做

- 不给 `plugins.json` 中的其他插件增加更新按钮或 update API。
- 不实现自动更新、后台轮询、跨平台安装器或独立下载器。
- 不把市场目录改成运行时远程目录；目录仍随 SnapMarketing 包发布。
