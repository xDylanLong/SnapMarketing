# dsh-snapmarketing Rebrand Design

## Goal

将本项目的仓库身份和用户可见产品名称统一为 `dsh-snapmarketing`，同时保留现有已安装插件依赖的兼容性。

## Scope

- GitHub 仓库从 `xDylanLong/SnapMarketing` 重命名为 `xDylanLong/dsh-snapmarketing`。
- 本地 Git remote、根 `package.json` 的项目名和仓库 URL 更新为 `dsh-snapmarketing`。
- README、安装说明、包描述、插件中心标题、界面提示、脚本提示和项目文档中的第一方产品称呼统一为 `dsh-snapmarketing`。
- 用户可见的仓库链接、安装示例和产品描述同步更新。
- 保留 `@snapmarketing/plugin-manifest`、`@snapmarketing/dsh-plugin-center` 及其内部 API、Remote 标识和 CSS/data 属性，避免破坏已安装插件和自更新协议。
- 第三方插件名称、作者、仓库地址和目录描述不改写。

## Approach

1. 先扫描第一方文本和元数据，区分产品文案、内部标识和第三方目录数据。
2. 修改根项目元数据、第一方包描述、界面文案、文档链接与脚本默认目录命名；保留兼容性包名和协议标识。
3. 增加或调整针对关键用户可见名称和仓库 URL 的测试断言，运行 focused tests、typecheck、build 和 package 检查。
4. 检查 GitHub 登录身份和当前仓库权限后执行仓库重命名，并把本地 `origin` 更新到新 URL；验证旧地址重定向/新地址可访问。

## Success Criteria

- 用户可见产品名、根项目名和 GitHub 仓库名均为 `dsh-snapmarketing`。
- README 和安装路径不再指向旧 GitHub 仓库名。
- 现有 `@snapmarketing/...` 包安装命令和内部运行时契约保持不变。
- focused tests、typecheck、build 和 package 检查均通过。
- GitHub 仓库重命名成功，且本地 `origin` 指向新地址。

## Risks and Mitigations

- 直接重命名 npm 包 scope 会破坏已安装插件，因此只更新项目身份和用户可见品牌，不改包 scope。
- 批量替换可能误改第三方目录描述或协议标识，因此只修改扫描确认的第一方文案和元数据。
- GitHub 重命名需要仓库管理权限；执行前先用 `gh auth status` 和仓库 API 检查身份/权限，权限不足时保留本地改动并报告阻塞点。
