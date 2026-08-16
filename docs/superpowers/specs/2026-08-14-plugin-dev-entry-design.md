# dsh-snapmarketing Plugin Dev Entry Design

## Goal

让开发者在 dsh-snapmarketing 根目录执行 `pnpm dev`，即可启动一个隔离的 DeepSeek Harness Web 调试环境，并在修改 Client 代码后获得自动构建与 HMR。

## Scope

本次只覆盖本地开发入口，不改变插件运行时、安装协议或生产构建产物：

- 使用已存在的 Harness 源码 checkout。
- 使用系统临时目录 `dsh-snapmarketing-dsh-home` 作为默认 Harness 数据目录，避免嵌入 dsh-snapmarketing workspace 或污染用户 profile。
- 首次启动前构建 dsh-snapmarketing，并将 `packages/plugin-center` 以 `link:` 安装到 `web` profile。
- 使用独立的 `3081` 端口，避免与 Harness 默认 `3080` 冲突。
- 启动 dsh-snapmarketing 的 `tsdown --watch`，持续重写 `lib/client.js`。
- 启动 Harness 的 `web` profile。
- 捕获 Ctrl-C 和子进程退出，清理同一调试会话启动的子进程。

## Non-goals

- 不自动修改或安装 Harness 源码 checkout 的依赖。
- 不把 dsh-snapmarketing 加入 Harness workspace。
- 不为 Host 代码实现热替换；Host 代码或 profile 配置变化需要重新执行 `pnpm dev`。
- 不添加 `concurrently` 等新的运行时依赖。

## Architecture

新增 `scripts/dev.mjs` 作为轻量进程编排器。Harness 根目录通过 `DSH_ROOT` 环境变量配置，默认使用当前已知的本地 checkout；调试数据目录通过 `DSH_HOME` 配置，默认指向系统临时目录 `dsh-snapmarketing-dsh-home`；Web 端口通过 `DSH_PORT` 配置，默认是 `3081`。脚本按顺序执行：构建 dsh-snapmarketing、构建 Harness（若用户没有显式跳过）、通过 `dsh plugin --profile web add link:<repo>/packages/plugin-center` 安装本地插件、并发启动 Client watcher 与 Harness Web。

脚本把可测试的路径和参数解析抽成纯函数，测试覆盖默认路径、环境变量覆盖、命令参数以及子进程失败时的错误信息。真正的 Harness 启动属于集成边界，验证时使用一次无 API key 的启动检查，并以可控退出结束。

## User-facing commands

```sh
pnpm dev
```

可选环境变量：

```sh
DSH_ROOT=/path/to/deepseek-harness-demo pnpm dev
DSH_HOME=/tmp/dsh-snapmarketing-dsh-home pnpm dev
DSH_PORT=4099 pnpm dev
DSH_SKIP_HARNESS_BUILD=1 pnpm dev
```

## Error handling

- `DSH_ROOT` 不存在或不是 Harness checkout 时，在启动前输出清晰错误并以非零状态退出。
- 任一前置构建或本地 link 安装失败时，不启动剩余服务。
- Client watcher 或 Harness 进程异常退出时，终止另一个子进程并透传非零结果。
- Ctrl-C 时向子进程发送 SIGINT，随后在必要时发送 SIGTERM，最终以正常用户中断状态退出。

## Verification

- `pnpm test --run` 覆盖脚本纯函数与现有插件测试。
- `pnpm typecheck` 和 `pnpm build` 确认新增脚本相关类型/包产物没有破坏现有项目。
- 使用独立 `DSH_HOME` 执行 `pnpm dev`，确认 Harness Web 能启动，随后手动 Ctrl-C 验证清理路径。
