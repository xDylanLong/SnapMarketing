# Plugin Center UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Plugin Center 改成单行插件列表，提供提交式搜索、仓库查看、安装状态、UI 插件 slot 能力展示和客户端分页。

**Architecture:** 继续由 `PluginCenterTab` 管理目录快照、搜索草稿/已提交查询、分页和安装反馈；不新增 Host 或 Remote 接口。`PluginCard` 保留文件名但改为无详情的列表行，直接展示仓库链接与安装状态。分页发生在现有 `filterPlugins` 过滤结果之后，默认每页 10 条。

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, existing `@snapmarketing/plugin-manifest` filtering and DSH slot/Remote types.

## Global Constraints

- 页面内不再重复显示 `Snap Plugin Marketing` 标题。
- 搜索区域保持单行：左侧显示 `发现 DeepSeek Harness 生态插件` 和小号总数量，右侧为搜索框与其右侧的搜索按钮。
- 列表一行一个插件，只显示名称、简短描述、版本/类型、状态和 `查看`/`安装` 操作。
- `查看` 打开 Manifest 的 `repository` 链接；安装成功后显示 `已安装`，不在本次列表暴露卸载按钮。
- 已安装 UI 插件显示 `placement.slots`；没有声明时显示 `未声明 slot 摆放能力`；能力插件不显示 slot 信息。
- 默认每页 10 个，过滤结果超过一页才显示分页；搜索、重新加载和安装成功后的刷新回到第 1 页。
- 保留现有安装 Remote、错误提示和 `.gitignore` 未提交改动，不做真实 Harness 安装或外部仓库验证。

---

### Task 1: Extend client behavior tests for the list contract

**Files:**
- Modify: `packages/plugin-center/tests/plugin-center.client.spec.tsx`

**Interfaces:**
- Consumes: existing `PluginCenterTabInjected`, `PluginCenterSnapshot`, and `PluginMetadata` types.
- Produces: executable assertions for the later `PluginCenterTab` and `PluginCard` changes.

- [ ] **Step 1: Replace the one-entry fixture with a reusable fixture builder and include an installed UI plugin**

Add a `makePlugin(index, overrides)` helper near the existing `snapshot` constant. Its defaults should be a valid capability plugin, and an explicit UI plugin should include `placement: { enabled: true, slots: ['settings.sidebar', 'conversation.view'], defaultSlot: 'settings.sidebar' }`. Build an 11-entry manifest so the default 10-item page can be tested.

```tsx
function makePlugin(index: number, overrides: Partial<PluginMetadata> = {}): PluginMetadata {
  return {
    id: `plugin-${index}`,
    name: `Plugin ${index}`,
    description: `Description ${index}`,
    author: { name: 'Example', url: 'https://github.com/example' },
    repository: `https://github.com/example/plugin-${index}`,
    version: '0.1.0',
    install: { type: 'package', source: `@example/plugin-${index}` },
    hasUI: false,
    category: 'capability',
    ...overrides,
  }
}

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

- [ ] **Step 2: Add a failing test for the compact list, repository view link, and removal of the duplicate title**

Render the tab and assert that `Snap Plugin Marketing` is not a heading, the discovery copy and `12 个插件` are visible, exactly one row exists for the first plugin, and the first row contains an external link with the matching repository URL.

```tsx
it('renders a compact list and opens each repository from 查看', async () => {
  renderTab()
  await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

  expect(screen.queryByRole('heading', { name: 'Snap Plugin Marketing' })).toBeNull()
  expect(screen.getByText('发现 DeepSeek Harness 生态插件')).toBeTruthy()
  expect(screen.getByText('12 个插件')).toBeTruthy()
  expect(document.querySelectorAll('[data-plugin-id]')).toHaveLength(10)

  const viewLink = screen.getAllByRole('link', { name: '查看' })[0]
  expect(viewLink).toHaveAttribute('href', 'https://github.com/example/plugin-1')
  expect(viewLink).toHaveAttribute('target', '_blank')
})
```

- [ ] **Step 3: Add a failing test for submitted search and pagination**

Use the searchbox to type `Plugin 11`, assert that the result remains unchanged until clicking `搜索`, then assert only Plugin 11 is visible. Clear and submit an empty search, click page 2, and assert Plugin 11 appears while Plugin 1 does not.

```tsx
it('submits search explicitly and paginates filtered results', async () => {
  renderTab()
  await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

  const searchbox = screen.getByRole('searchbox')
  fireEvent.change(searchbox, { target: { value: 'Plugin 11' } })
  expect(screen.getByText('Plugin 1')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '搜索' }))
  expect(screen.getByText('Plugin 11')).toBeTruthy()
  expect(screen.queryByText('Plugin 1')).toBeNull()

  fireEvent.change(searchbox, { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: '搜索' }))
  fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))
  expect(screen.getByText('Plugin 11')).toBeTruthy()
  expect(screen.queryByText('Plugin 1')).toBeNull()
})
```

- [ ] **Step 4: Add a failing test for installed state and UI slot capability**

Assert that the installed UI row displays `已安装` and both declared slot names, while the first uninstalled row has an `安装` button. Update the fake install result and load response in a focused test if needed so a successful install re-renders the installed state.

```tsx
it('shows installed UI slot capability and changes the install action after refresh', async () => {
  const installedSnapshot = {
    ...snapshot,
    installed: [...snapshot.installed],
  }
  const load = vi.fn().mockResolvedValue(installedSnapshot)
  renderTab({ load })
  await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

  fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))
  expect(screen.getByText('已安装')).toBeTruthy()
  expect(screen.getByText('Slot 摆放：settings.sidebar、conversation.view')).toBeTruthy()
})
```

- [ ] **Step 5: Run the focused client tests and verify they fail for the intended missing UI**

Run: `pnpm vitest run packages/plugin-center/tests/plugin-center.client.spec.tsx`

Expected: FAIL because the current card layout still renders the duplicate heading, no explicit search button, no list pagination, and no compact installed slot row.

---

### Task 2: Implement submitted search and client pagination in the tab

**Files:**
- Modify: `packages/plugin-center/src/client/PluginCenterTab.tsx`

**Interfaces:**
- Consumes: `filterPlugins`, `PluginCenterSnapshot`, and existing `install` callback.
- Produces: `PluginCard` rows for the current page and the `搜索`/pagination controls expected by Task 1.

- [ ] **Step 1: Replace category/query state with draft query, submitted query, and page state**

Remove `CATEGORIES` and the category state. Add:

```tsx
const PAGE_SIZE = 10
const [queryDraft, setQueryDraft] = useState('')
const [query, setQuery] = useState('')
const [page, setPage] = useState(1)
```

Reset `page` to `1` inside `refresh`, and define `submitSearch` to copy `queryDraft` into `query` and reset the page. Keep `filterPlugins` as the only matching implementation.

- [ ] **Step 2: Derive filtered results, page count, and the visible page**

Call `filterPlugins(snapshot.manifest.plugins, { query }, installedIds)` without a category filter. Derive `pageCount = Math.max(1, Math.ceil(plugins.length / PAGE_SIZE))` and `visiblePlugins = plugins.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)`. Add an effect that clamps the current page to `pageCount` when a reload or search result makes the old page invalid.

- [ ] **Step 3: Render the one-line search area and remove the duplicate title/category controls**

Use a `header` with class `sm-plugin-center__toolbar` containing the discovery copy, small count, search input and button. The input must be a controlled searchbox with `aria-label="搜索插件"`; the form submit handler calls `submitSearch` so Enter works. Do not render an `h2` named `Snap Plugin Marketing` or the old category nav.

```tsx
<form className="sm-plugin-center__toolbar" onSubmit={event => { event.preventDefault(); submitSearch() }}>
  <div className="sm-plugin-center__intro">
    <p>发现 DeepSeek Harness 生态插件</p>
    <span className="sm-plugin-center__count">{plugins.length} 个插件</span>
  </div>
  <div className="sm-plugin-center__search">
    <input aria-label="搜索插件" type="search" value={queryDraft} onChange={event => { setQueryDraft(event.currentTarget.value) }} />
    <button className="sm-button sm-button--primary" type="submit">搜索</button>
  </div>
</form>
```

- [ ] **Step 4: Render only the current page and add accessible pagination**

Map `visiblePlugins` rather than all filtered plugins. Render pagination only when `plugins.length > PAGE_SIZE`; provide `上一页`, numbered `第 N 页` buttons with `aria-current="page"`, and `下一页`. Disable previous/next at the boundaries. Keep the existing loading, error, empty, and per-plugin message states.

- [ ] **Step 5: Run the focused client tests and confirm only card/stylesheet assertions remain failing**

Run: `pnpm vitest run packages/plugin-center/tests/plugin-center.client.spec.tsx`

Expected: the tab-level assertions pass; failures, if any, are limited to the old `PluginCard` markup or style-dependent selectors.

---

### Task 3: Convert PluginCard into a compact plugin row

**Files:**
- Modify: `packages/plugin-center/src/client/PluginCard.tsx`

**Interfaces:**
- Consumes: `PluginMetadata`, `installed`, `busy`, `onInstall`, and optional `message` from `PluginCenterTab`.
- Produces: a single `[data-plugin-id]` row containing `查看`, `安装`/`已安装`, and installed UI placement copy.

- [ ] **Step 1: Remove local detail state and unused content**

Delete `useState`, the icon, author, tags, long description/details section, and uninstall props. Keep the plugin name, `description`, type/version, status, action message, and repository link.

- [ ] **Step 2: Render repository view and install status actions**

Render `查看` as an anchor with `href={plugin.repository}`, `target="_blank"`, and `rel="noreferrer"`. Render an uninstalled primary `安装` button, a busy disabled `安装中…` button, or an installed disabled `已安装` button. Do not render an uninstall action.

- [ ] **Step 3: Render placement capability only for installed UI plugins**

Use this exact rule:

```tsx
{installed && plugin.hasUI ? (
  <p className="sm-card__placement">
    {plugin.placement?.enabled && plugin.placement.slots?.length
      ? `Slot 摆放：${plugin.placement.slots.join('、')}`
      : '未声明 slot 摆放能力'}
  </p>
) : null}
```

- [ ] **Step 4: Run the focused client tests and verify the compact row behavior**

Run: `pnpm vitest run packages/plugin-center/tests/plugin-center.client.spec.tsx`

Expected: PASS for list layout, explicit search, pagination, repository links and installed slot capability. Update only assertions that depended on removed card details; do not restore the removed UI.

---

### Task 4: Update responsive styles for the one-row list

**Files:**
- Modify: `packages/plugin-center/src/client/styles.ts`

**Interfaces:**
- Consumes: the class names emitted by `PluginCenterTab` and `PluginCard`.
- Produces: a compact desktop list that remains usable on narrow screens.

- [ ] **Step 1: Replace grid/card rules with list-row rules**

Change `.sm-plugin-center__toolbar` to a two-column single-row layout with the intro on the left and search controls on the right. Add styles for `.sm-plugin-center__intro`, `.sm-plugin-center__search`, `.sm-plugin-center__count`, and `.sm-plugin-center__pagination`. Change `.sm-plugin-center__grid` to a vertical list with no multi-column card grid, and make `.sm-card` a compact row using flex/grid alignment.

- [ ] **Step 2: Keep actions and status readable without excessive content**

Use smaller muted metadata, a short description with overflow handling, and keep the action group aligned to the right on wide screens. Ensure anchors share the existing accent color and disabled install state is visually distinct.

- [ ] **Step 3: Add narrow-screen layout rules**

At the existing 640px breakpoint, stack the intro and search controls, allow the row actions to wrap below metadata, and make the search button remain immediately to the right of the input within its search group.

- [ ] **Step 4: Run TypeScript and focused tests**

Run: `pnpm vitest run packages/plugin-center/tests/plugin-center.client.spec.tsx && pnpm typecheck`

Expected: PASS with no TypeScript errors.

---

### Task 5: Final verification and handoff

**Files:**
- Inspect: `packages/plugin-center/src/client/PluginCenterTab.tsx`
- Inspect: `packages/plugin-center/src/client/PluginCard.tsx`
- Inspect: `packages/plugin-center/src/client/styles.ts`
- Inspect: `packages/plugin-center/tests/plugin-center.client.spec.tsx`

**Interfaces:**
- Consumes: all changes from Tasks 1–4.
- Produces: verified local UI implementation with unrelated work preserved.

- [ ] **Step 1: Run the complete test suite**

Run: `pnpm test`

Expected: all existing Manifest, Host, Remote, operations, and client tests pass.

- [ ] **Step 2: Run the package build and package checks**

Run: `pnpm build` and `pnpm check:package`

Expected: all packages build and package-file checks pass.

- [ ] **Step 3: Review the final diff and worktree boundary**

Run: `git diff --check`, `git status --short`, and `git diff -- packages/plugin-center/src/client packages/plugin-center/tests/plugin-center.client.spec.tsx`

Expected: only the planned UI/test files are changed in addition to the committed design/plan docs; the pre-existing `.gitignore` modification remains untouched.

- [ ] **Step 4: Commit the implementation changes**

```bash
git add packages/plugin-center/src/client/PluginCenterTab.tsx packages/plugin-center/src/client/PluginCard.tsx packages/plugin-center/src/client/styles.ts packages/plugin-center/tests/plugin-center.client.spec.tsx
git commit -m "feat: simplify plugin center list UI"
```
