# SnapMarketing

SnapMarketing 是面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Apache-2.0 轻量插件营销入口。

核心链路是：

`公开 Manifest → Snap Plugin Marketing → Harness 现有安装能力 → Harness 插件运行时`

项目不建设 Marketplace 后台，不托管插件包、不做账号和支付、不接受任意上传、不动态分析插件源码，也不替代 Harness 的插件运行时和 UI Slot 系统。

## 当前包含

- `@snapmarketing/plugin-manifest`：Manifest V1 Schema、分类一致性校验、目录筛选和安装来源策略。
- `@snapmarketing/dsh-plugin-center`：DSH Host/Client 插件，提供目录、详情预览、安装、卸载和已安装状态。
- GitHub 静态目录：[`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json)。

## 安装到 DSH Profile

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

安装后，Harness 现有的“插件”设置中会出现 `Snap Plugin Marketing` 标签页。默认 Host 适配器继续调用 `dsh plugin --profile web add/remove`，不会重新实现包管理器。

目录源可以通过 Profile patch 改成自己的静态 GitHub Raw URL。浏览器只能提交 Manifest 中已确认的插件 id，不能提交任意包地址。

## 开发

最简单的本地调试方式是直接启动隔离的 Harness Web 环境：

```sh
pnpm dev
```

它会自动构建 SnapMarketing，把 `packages/plugin-center` 以 `link:` 安装到本地 `web` profile，并启动 Client bundle watcher 与 Harness Web。默认调试数据放在系统临时目录 `snapmarketing-dsh-home`，默认地址是 `http://127.0.0.1:3081`；修改 `src/client` 会触发 HMR，修改 Host 代码或 profile 配置后重新执行 `pnpm dev`。

如果 Harness checkout 不在默认位置，可以覆盖：

```sh
DSH_ROOT=/path/to/deepseek-harness-demo pnpm dev
DSH_HOME=/tmp/snapmarketing-dsh-home pnpm dev
DSH_PORT=4099 pnpm dev
DSH_SKIP_HARNESS_BUILD=1 pnpm dev
```

常规静态检查仍可单独运行：

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

详见 [Manifest V1](docs/manifest-v1.md)、[安装说明](docs/installation.md) 和 [目录维护](docs/catalog-maintenance.md)。
