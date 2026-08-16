# dsh-snapmarketing 插件市场 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 dsh-snapmarketing 从 Harness 的“插件”设置分区移出，作为 Agent 预设下方的独立“插件市场”设置页，并呈现带产品头部的无分类插件列表。

**Architecture:** 复用现有 `PluginCenterTab`、目录加载和安装 Remote，只把注册点从 `settings.plugins.tab` 改成顶层 `settings.section`。页面保留搜索、分页、安装反馈和仓库查看；`PluginCard` 变成不读取 placement 状态的纯插件行。产品 logo 作为包内压缩 PNG，并以内联 data URL 进入浏览器 client bundle，避免浏览器 CJS loader 依赖 Node URL shim。

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, DSH settings/slot contracts, tsdown.

## Global Constraints

- 旧 `settings.plugins.tab` 贡献必须移除；只注册顶层 `settings.section`。
- 新入口 id 为 `plugin-market`，label 为 `插件市场`，order 为 `21`，紧跟 Agent 预设。
- 页面顶部必须显示产品 logo 和 `dsh-snapmarketing`；第二行显示“发现 DeepSeek Harness 生态插件”、数量、搜索框和“搜索”按钮。
- 列表不显示分类筛选、UI/工具插件标识、slot、显示位置或 placement 控件。
- 保留目录加载、提交式搜索、每页 10 条分页、仓库查看、安装进度、错误反馈和已安装状态。
- 只修改本次需求涉及的文件；保留工作区现有其他修改，不执行 reset、checkout 或清理操作。
- 必须先观察到 focused 测试因新行为缺失而失败，再写生产实现。

---

### Task 1: Add failing client-contract tests for the new settings entry and page

**Files:**
- Modify: `packages/plugin-center/tests/plugin-center.client.spec.tsx`
- Test: `packages/plugin-center/tests/plugin-center.client.spec.tsx`

**Interfaces:**
- Consumes: `apply`, `inject`, `PluginCenterTab`, `PluginCenterSnapshot`, and the existing fixture helpers.
- Produces: executable requirements for `settings.section`, the logo header, and the simplified list.

- [ ] **Step 1: Update the fixture to exercise a mixed catalog without making category/placement part of the UI contract**

Keep the existing `makePlugin` helper valid for Manifest V1, but include at least 12 entries and one installed UI plugin with placement metadata. The metadata remains in the fixture so the test can prove the rendered page does not expose it:

```tsx
const snapshot: PluginCenterSnapshot = {
  manifest: {
    schemaVersion: '1.0',
    updatedAt: '2026-08-14T00:00:00Z',
    plugins: [
      ...Array.from({ length: 10 }, (_, index) => makePlugin(index + 1)),
      makePlugin(11),
      makePlugin(12, {
        id: 'ui-plugin',
        name: 'UI Plugin',
        hasUI: true,
        category: 'ui',
        placement: { enabled: true, slots: ['settings.sidebar', 'conversation.view'], defaultSlot: 'settings.sidebar' },
      }),
    ],
  },
  installed: [{
    pluginId: 'ui-plugin',
    packageName: '@example/plugin-12',
    moduleName: '@example/plugin-12@0.1.0',
    enabled: true,
    phase: 'active',
  }],
}
```

- [ ] **Step 2: Replace old placement/category assertions with the desired page assertions**

The page test must wait for `Plugin 1`, then assert the product header, discovery row, first-page row count, and absence of the removed UI concepts:

```tsx
expect(screen.getByRole('heading', { name: 'dsh-snapmarketing' })).toBeTruthy()
expect(screen.getByAltText('dsh-snapmarketing 产品 logo')).toBeTruthy()
expect(screen.getByText('发现 DeepSeek Harness 生态插件')).toBeTruthy()
expect(screen.getByText('12 个插件')).toBeTruthy()
expect(document.querySelectorAll('[data-plugin-id]')).toHaveLength(10)
expect(screen.queryByText('UI 插件')).toBeNull()
expect(screen.queryByText('工具插件')).toBeNull()
expect(screen.queryByText(/slot/i)).toBeNull()
expect(screen.queryByText(/显示位置/)).toBeNull()
```

Keep the repository link, explicit search submission, pagination, install progress, and installed-state assertions from the existing client test where they still describe the desired behavior. Remove tests that specifically open the placement popover.

- [ ] **Step 3: Add a failing registration test for the top-level settings section**

Use the existing `apply` test context and assert that the injected slot is `settings.section`, not `settings.plugins.tab`. Invoke the registration callback so the options can be inspected:

```tsx
const register = vi.fn()
const injectSlot = vi.fn((_name: string, callback: () => unknown) => { callback(); return undefined })
const ctx = {
  remote: { $mount: vi.fn().mockResolvedValue(vi.fn().mockResolvedValue(undefined)) },
  get: vi.fn().mockReturnValue({ catalog: vi.fn(), installed: vi.fn(), installPlugin: vi.fn(), uninstallPlugin: vi.fn() }),
  slots: { inject: injectSlot, register },
} as never

await apply(ctx)

expect(injectSlot).toHaveBeenCalledWith('settings.section', expect.any(Function))
expect(injectSlot).not.toHaveBeenCalledWith('settings.plugins.tab', expect.anything())
expect(register).toHaveBeenCalledWith(expect.objectContaining({
  name: 'settings.section', id: 'plugin-market', order: 21, label: '插件市场',
}), expect.anything())
```

Adapt the existing mock shape only as required by the actual slot registration call; do not add a second registration path.

- [ ] **Step 4: Run the focused test and verify it fails for the intended missing behavior**

Run:

```bash
pnpm vitest run packages/plugin-center/tests/plugin-center.client.spec.tsx
```

Expected: FAIL because the production code still registers `settings.plugins.tab`, renders no product header, and still exposes placement/category UI. Fix test setup errors until the failures directly identify those missing behaviors.

### Task 2: Add the package logo asset and migrate the client entry to the top-level settings section

**Files:**
- Create: `packages/plugin-center/assets/snapmarketing-logo.png` (copy the user-provided logo image)
- Create: `packages/plugin-center/src/client/logo.ts`
- Modify: `packages/plugin-center/package.json`
- Modify: `packages/plugin-center/src/client/index.ts`
- Modify: `packages/plugin-center/src/client/PluginCenterTab.tsx`
- Test: `packages/plugin-center/tests/plugin-center.client.spec.tsx`

**Interfaces:**
- Consumes: DSH `settings.section`, `PluginCenterTabInjected`, and `PluginCenterTab`.
- Produces: `plugin-market` top-level settings registration and a page component typed for `settings.section`.

- [ ] **Step 1: Copy the supplied logo into the published plugin package**

Copy `/var/folders/_4/7r7073hj4nb2_mfwh29hb_w40000gp/T/codex-clipboard-5f96d673-5807-480b-a217-e1f45defd93b.png` to `packages/plugin-center/assets/snapmarketing-logo.png`. Verify the source and destination are PNG files before continuing. Add `assets` to the package `files` list so the runtime resource is included in the published package.

- [ ] **Step 2: Change the client registration to `settings.section`**

In `packages/plugin-center/src/client/index.ts`, keep the existing Remote mounting and callback construction, but replace the final registration with:

```tsx
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section',
  id: 'plugin-market',
  order: 21,
  label: '插件市场',
  inject: () => ({ load, install, uninstall }),
}, PluginCenterTab))
```

Do not retain a `settings.plugins.tab` registration. Keep `uninstall` in the injected service contract for compatibility even though the simplified page does not render an uninstall control.

- [ ] **Step 3: Update the page prop contract and render the product header**

Change `PluginCenterTabProps` from `PropsRuntime<'settings.plugins.tab'>` to `PropsRuntime<'settings.section'>`. Export a stable inline logo URL from `src/client/logo.ts` so the browser bundle does not call Node's `url` module:

```tsx
export const SNAPMARKETING_LOGO_URL = 'data:image/png;base64,...'
```

Render this header before the discovery/search form:

```tsx
<header className="sm-plugin-center__brand">
  <img src={SNAPMARKETING_LOGO_URL} alt="dsh-snapmarketing 产品 logo" />
  <h1>dsh-snapmarketing</h1>
</header>
```

If the image cannot be displayed by the host, keep the accessible alt text and do not prevent the list from rendering; the stylesheet should give the image a bounded size and the heading remains the visual fallback.

- [ ] **Step 4: Run the focused test and confirm registration/header behavior passes**

Run:

```bash
pnpm vitest run packages/plugin-center/tests/plugin-center.client.spec.tsx
```

Expected: the `settings.section` and brand-header assertions pass; remaining failures are limited to placement/category markup and styles until Task 3 and Task 4 are complete.

### Task 3: Remove category and slot controls from the page and plugin rows

**Files:**
- Modify: `packages/plugin-center/src/client/PluginCenterTab.tsx`
- Modify: `packages/plugin-center/src/client/PluginCard.tsx`
- Test: `packages/plugin-center/tests/plugin-center.client.spec.tsx`

**Interfaces:**
- Consumes: `filterPlugins`, `PluginMetadata`, `PluginCenterSnapshot`, install progress callbacks.
- Produces: a single flat list filtered only by submitted text query; `PluginCard` accepts no placement props.

- [ ] **Step 1: Remove page-level placement persistence and props**

Delete `DEFAULT_UI_PLACEMENT`, `PLACEMENT_STORAGE_KEY`, `readPlacements`, `defaultPlacement`, the `placements` state, its localStorage effect, and the `selectedPlacement`/`onPlacementChange` props passed to `PluginCard`. Keep `filterPlugins` with `{ query }` only, keep `installedIds` for button state, and keep the existing page size/pagination logic.

- [ ] **Step 2: Simplify `PluginCard` to one row without placement state**

Remove `useState`, `useRef`, placement option constants, outside-click handling, popover markup, type labels, and placement paragraphs. Change `PluginCardActions` to:

```tsx
export interface PluginCardActions {
  readonly installed: boolean
  readonly busy: boolean
  readonly onInstall: () => void
  readonly progress?: InstallProgress | undefined
}
```

Keep `plugin.name`, `plugin.description`, `v${plugin.version}`, the repository anchor (`target="_blank"`, `rel="noreferrer"`), install progress/message, and the three button states `安装`, `安装中…`, `已安装`. No UI/tool/category text may be emitted.

- [ ] **Step 3: Verify the flat-list behavior with the focused test**

Run:

```bash
pnpm vitest run packages/plugin-center/tests/plugin-center.client.spec.tsx
```

Expected: the test passes for absence of category, slot, and display-position UI, while preserving search, pagination, repository links, install progress, and installed-state behavior. If a failure comes from an assertion that still expects removed placement UI, delete or update that assertion rather than restoring the removed control.

### Task 4: Restyle the page for the new product header and compact flat list

**Files:**
- Modify: `packages/plugin-center/src/client/styles.ts`
- Test: `packages/plugin-center/tests/plugin-center.client.spec.tsx`

**Interfaces:**
- Consumes: `.sm-plugin-center__brand`, `.sm-plugin-center__toolbar`, `.sm-plugin-center__grid`, and the simplified `.sm-card` markup.
- Produces: readable desktop and narrow-screen layout with the logo/header hierarchy requested by the user.

- [ ] **Step 1: Add brand and list layout rules**

Add rules scoped under `.sm-plugin-center` for `.sm-plugin-center__brand`, its image and heading. Keep the header compact, align the logo and product name horizontally, bound the image to a small square, and use the existing DSH color variables. Keep the discovery/search form as a two-column row on wide screens and a stacked layout below the existing narrow breakpoint.

- [ ] **Step 2: Remove obsolete placement styles and keep the row actions usable**

Delete or stop referencing placement-trigger/popover rules. Keep one vertical list, metadata muted, descriptions truncated or wrapped without pushing actions off-screen, and action buttons aligned to the row end on wide screens. On narrow screens allow the card content and actions to wrap while preserving button hit area and progress visibility.

- [ ] **Step 3: Run focused tests and inspect the generated stylesheet contract**

Run:

```bash
pnpm vitest run packages/plugin-center/tests/plugin-center.client.spec.tsx
```

Expected: all focused client tests pass, including the `apply()` stylesheet assertions. If those assertions mention removed layout selectors, update them to assert the new brand selector and the absence of old placement selectors.

### Task 5: Run repository-level verification and review the diff

**Files:**
- Verify only: `packages/plugin-center/src/client/index.ts`
- Verify only: `packages/plugin-center/src/client/PluginCenterTab.tsx`
- Verify only: `packages/plugin-center/src/client/PluginCard.tsx`
- Verify only: `packages/plugin-center/src/client/styles.ts`
- Verify only: `packages/plugin-center/assets/snapmarketing-logo.png`
- Verify only: `packages/plugin-center/package.json`
- Verify only: `packages/plugin-center/tests/plugin-center.client.spec.tsx`

**Interfaces:**
- Consumes: completed tasks 1–4.
- Produces: fresh evidence for the requested UI behavior and package buildability.

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test --run
```

Expected: Vitest exits with code 0 and no failed tests.

- [ ] **Step 2: Run typecheck and build**

```bash
pnpm typecheck
pnpm build
```

Expected: both commands exit with code 0. Build output must include the client bundle and package asset without TypeScript errors.

- [ ] **Step 3: Run the package validation**

```bash
pnpm check:package
```

Expected: package metadata and bundled catalog validation pass.

- [ ] **Step 4: Check the diff and ensure unrelated WIP remains untouched**

```bash
git diff --check
git status --short
git diff -- packages/plugin-center/src/client/index.ts packages/plugin-center/src/client/PluginCenterTab.tsx packages/plugin-center/src/client/PluginCard.tsx packages/plugin-center/src/client/styles.ts packages/plugin-center/package.json packages/plugin-center/tests/plugin-center.client.spec.tsx
```

Confirm the diff contains only the requested UI/asset/test changes, while existing unrelated modified files remain present and are not reverted.
