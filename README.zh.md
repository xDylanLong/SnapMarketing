<p align="center">
  <img src="packages/plugin-center/assets/snapmarketing-logo.png" width="96" alt="dsh-snapmarketing logo">
</p>

# dsh-snapmarketing

[English](README.md) | 中文

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的轻量、本地优先插件发现与管理入口。

打开 Harness 设置里的 **插件市场**，搜索插件、查看来源，然后通过 Harness 现有的插件安装能力完成安装。

- `@snapmarketing/plugin-manifest`：Manifest V1 Schema、分类一致性校验、目录筛选和安装来源策略。
- `@snapmarketing/dsh-plugin-center`：DSH Host/Client 插件，提供目录、详情预览、安装、卸载和已安装状态。
- 随 Plugin Center 包发布的 marketing 专属静态目录：[`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json)，每条包含中英文 SEO 标签；全量源数据备份在 [`plugins.full.json`](packages/plugin-center/registry/plugins.full.json)。

## 安装到 DSH Profile

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

重启 `dsh web`，然后打开 **设置 → 插件市场**。

dsh-snapmarketing 是 Harness 里的一个插件，不是另起一个应用，也不重新实现包管理器。它沿用 Harness 当前的 Profile 和安装能力，因此插件仍由 Harness 的正常运行时和生命周期负责。

## 你会得到什么

- **发现与搜索**——浏览随插件包发布的目录，按名称或描述搜索，查看仓库和版本信息。
- **一键安装**——选择目录中的插件，由 Harness 执行实际的包操作；页面展示安装进度和真实操作结果。
- **已安装状态**——页面读取 Harness 当前插件清单，不把一次点击直接当成插件已经生效。
- **界面型与能力型插件**——目录元数据说明插件预期用途；界面型插件负责自己的界面，能力型插件通过 Harness、Agent 或其声明的工作流使用。
- **需要刷新时明确提示**——安装后如果 Harness 需要刷新，dsh-snapmarketing 会明确提示，不会把待生效状态说成已经上线。

## 工作方式

```text
随包发布的 Manifest
          ↓
dsh-snapmarketing 插件市场
          ↓  校验后的插件 id
Harness 现有安装能力
          ↓
Harness Loader 与插件运行时
```

目录以 `registry/plugins.json` 的形式随 `@snapmarketing/dsh-plugin-center` 发布。Host 会校验 Manifest，把用户选择的插件 id 解析为已确认的包来源，再交给 Harness 执行安装或卸载。浏览器不能提交任意包地址或安装来源。

## 为什么保持轻量

dsh-snapmarketing 有意只做 Harness 上面的一层入口，不负责：

- 托管插件包或建设 Marketplace 后台；
- 创建账号、处理支付或接受任意上传；
- 检查、分析或沙箱化第三方插件源码；
- 替代 Harness 的包管理器、Loader、UI Slot 或插件生命周期。

目录是安装白名单，不等于对第三方插件背书。请只安装你信任来源和权限的插件。

## 开发

```sh
pnpm install
pnpm dev
```

`pnpm dev` 会构建 dsh-snapmarketing，把本地 Plugin Center 以 link 方式安装到 web Profile，启动 Harness Web，并监听客户端 bundle。默认使用名为 `dsh-snapmarketing-dsh-home` 的隔离临时目录，默认地址是 `http://127.0.0.1:3081`。

常用覆盖参数：

```sh
DSH_ROOT=/path/to/deepseek-harness-demo pnpm dev
DSH_HOME=/tmp/dsh-snapmarketing-dsh-home pnpm dev
DSH_PORT=4099 pnpm dev
DSH_SKIP_HARNESS_BUILD=1 pnpm dev
```

只管理当前项目的插件时，可以直接运行：

```sh
pnpm dsh:add
pnpm dsh:remove
```

这两个命令固定操作 `@snapmarketing/dsh-plugin-center` 的 `web` profile：添加时使用当前项目的本地 `link:` 路径，删除时使用当前项目的包名。它们默认与 `pnpm dev` 共用系统临时目录下的 `dsh-snapmarketing-dsh-home`，也支持通过 `DSH_ROOT` 和 `DSH_HOME` 覆盖。

常规静态检查仍可单独运行：

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

设置 `GITHUB_TOKEN` 后运行 `pnpm registry:collect`，可刷新全量备份并重建 marketing 目录；只需从现有备份重建筛选结果时运行 `pnpm registry:marketing`。插件包仅发布 marketing 目录，安装后的客户端不会在运行时访问 GitHub。

## 目录与 Manifest

目录源文件位于 [`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json)。新增或更新条目时直接修改这个文件，并确认包名、仓库、版本、分类和安装来源都准确。

Manifest 只接受通过策略校验的包说明符；HTTP 地址、本地路径和任意 Git 来源都会被拒绝。详见 [Manifest V1](docs/manifest-v1.md) 和 [目录维护](docs/catalog-maintenance.md)。

## 参与贡献

请保持 Thin Layer 边界：复用 Harness 的安装和 UI API，把目录校验与运行时行为分开，不新增平行的包管理或布局系统。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

Apache-2.0
