# SnapMarketing

SnapMarketing 是面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Apache-2.0 轻量插件中心。

核心链路是：

`公开 Manifest → Plugin Center → Harness 现有安装能力 → Harness 插件运行时`

项目不建设 Marketplace 后台，不托管插件包、不做账号和支付、不接受任意上传、不动态分析插件源码，也不替代 Harness 的插件运行时和 UI Slot 系统。

## 当前包含

- `@snapmarketing/plugin-manifest`：Manifest V1 Schema、分类一致性校验、目录筛选和安装来源策略。
- `@snapmarketing/dsh-plugin-center`：DSH Host/Client 插件，提供目录、详情预览、安装、卸载和已安装状态。
- GitHub 静态目录：[`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json)。

## 安装到 DSH Profile

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

安装后，Harness 现有的“插件”设置中会出现 `Plugin Center` 标签页。默认 Host 适配器继续调用 `dsh plugin --profile web add/remove`，不会重新实现包管理器。

目录源可以通过 Profile patch 改成自己的静态 GitHub Raw URL。浏览器只能提交 Manifest 中已确认的插件 id，不能提交任意包地址。

## 开发

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

详见 [Manifest V1](docs/manifest-v1.md)、[安装说明](docs/installation.md) 和 [目录维护](docs/catalog-maintenance.md)。
