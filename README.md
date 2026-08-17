<p align="center">
  <img src="packages/plugin-center/assets/snapmarketing-logo.png" width="96" alt="SnapMarketing logo">
</p>

# SnapMarketing

中文 | [English](README.en.md)

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的营销插件中心：在 Harness 内发现、搜索、安装和管理营销相关插件。

SnapMarketing 是一个建立在 Harness 之上的轻量入口，沿用 Harness 已有的 Profile、安装器和插件运行时，让营销插件保持在 Harness 的正常生命周期内。

## 安装

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

重启 `dsh web`，然后打开 **设置 → 插件市场**。

如果你想先了解产品定位和界面，可以访问 [dsh-snapmarketing 官网](https://dsh-snapmarketing.com)。本仓库是安装与运行 Plugin Center 的代码仓库。

## 你会得到什么

- **营销插件目录**——随包发布精选的营销插件目录，展示名称、描述、分类、版本、仓库和安装来源。
- **搜索与筛选**——按插件名称和描述搜索，快速找到适合当前营销工作流的插件。
- **一键安装与卸载**——选择目录条目后，由 Harness 执行真实的包操作；界面展示进度和操作结果。
- **真实的已安装状态**——读取当前 Harness Profile 的插件清单，不把一次按钮点击当成插件已经生效。
- **界面型与能力型插件**——通过目录元数据说明插件用途；界面型插件拥有自己的 UI，能力型插件通过 Harness、Agent 或声明的工作流使用。
- **明确的刷新提示**——安装后如果 Harness 需要刷新，页面会明确提示待生效状态。

## 工作方式

```text
随包发布的营销目录
          ↓
SnapMarketing 插件市场
          ↓  校验后的插件 id
Harness 现有安装器
          ↓
Harness Loader 与插件运行时
```

目录文件位于 [`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json)，随 `@snapmarketing/dsh-plugin-center` 一起发布。Host 会校验 Manifest，把用户选择的插件 id 解析为已确认的包来源，再交给 Harness 执行安装或卸载。已安装的客户端不会在运行时访问 GitHub。

## 安全与边界

SnapMarketing 有意只做 Harness 上面的一层入口，不负责：

- 托管插件包或建设独立的 Marketplace 后台；
- 创建账号、处理支付或接受任意上传；
- 检查、分析或沙箱化第三方插件源码；
- 替代 Harness 的包管理器、Loader、UI Slot 或插件生命周期。

Manifest 策略会拒绝 HTTP 地址、本地路径和任意 Git 来源等未批准的安装来源。目录是精选 allowlist，不等于对第三方插件背书；请只安装你信任来源和权限的插件。

## 开发

```sh
pnpm install
pnpm dev
```

`pnpm dev` 会构建 SnapMarketing，把本地 Plugin Center 以 link 方式安装到 web Profile，启动 Harness Web，并监听客户端 bundle。默认使用名为 `dsh-snapmarketing-dsh-home` 的隔离临时目录，默认地址是 `http://127.0.0.1:3081`。

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

常规检查：

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

## 目录与文档

- [营销插件目录](packages/plugin-center/registry/plugins.json)
- [完整目录备份](packages/plugin-center/registry/plugins.full.json)
- [Manifest V1](docs/manifest-v1.md)
- [目录维护](docs/catalog-maintenance.md)
- [贡献指南](CONTRIBUTING.md)
- [SnapMarketing-Landing 官网仓库](https://github.com/xDylanLong/SnapMarketing-Landing)

新增或更新目录条目时，请确认包名、仓库、版本、分类和安装来源准确。保持 Thin Layer 边界：复用 Harness 的安装和 UI API，不新增平行的包管理或布局系统。

## 许可证

Apache-2.0
