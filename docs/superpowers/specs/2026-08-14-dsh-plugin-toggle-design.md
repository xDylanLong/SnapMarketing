# DSH 当前插件快捷管理设计

## 目标

在 SnapMarketing 根目录提供无需插件名参数的 npm/pnpm 命令，快速把当前项目的 `@snapmarketing/dsh-plugin-center` 加入或移出 DSH 的 `web` profile。

## 方案

新增无依赖脚本 `scripts/dsh-plugin.mjs`，由根目录的 `package.json` 暴露：

```sh
pnpm dsh:add
pnpm dsh:remove
```

脚本固定使用当前仓库 `packages/plugin-center` 的绝对 `link:` spec 执行 add，固定使用包名执行 remove。DSH checkout 默认沿用 `scripts/dev.mjs` 的相邻路径，也支持 `DSH_ROOT` 覆盖；`DSH_HOME` 默认与 `pnpm dev` 共用系统临时目录下的 `snapmarketing-dsh-home`，显式设置时再使用调用方指定的目录。命令不需要也不接受插件名参数。

## 错误处理与验证

执行前检查 DSH checkout 中的 `package.json` 和 `apps/cli/src/bin.ts`。缺失时以非零状态退出并提示设置 `DSH_ROOT`。DSH 子进程的非零退出码直接转换为当前命令失败。测试覆盖 add/remove 参数、默认路径、环境覆盖和 checkout 校验；最后运行 focused test、完整测试、typecheck、build、package check 与 diff check。
