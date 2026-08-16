# dsh-snapmarketing Plugin Dev Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm dev` start an isolated Harness Web profile plus a watched dsh-snapmarketing client bundle for local plugin debugging.

**Architecture:** Add a dependency-free Node process orchestrator at `scripts/dev.mjs`. It resolves the Harness checkout and isolated `DSH_HOME`, runs the two repositories' preparation commands sequentially, then runs the dsh-snapmarketing tsdown watcher and Harness Web process concurrently with signal-aware cleanup. Export pure command/path helpers so the orchestration contract is covered without launching real services in unit tests.

**Tech Stack:** Node.js ESM, `node:child_process`, `node:path`, Vitest, pnpm, tsdown, DeepSeek Harness CLI.

## Global Constraints

- Keep the current branch/worktree and unrelated WIP unchanged.
- Do not add `concurrently` or another runtime dependency.
- Default Harness checkout is the sibling-relative path `../ChatGPT/deepseek-harness-demo`; `DSH_ROOT` overrides it.
- Default debug home is the system temp directory `dsh-snapmarketing-dsh-home`; `DSH_HOME` overrides it. It must stay outside the dsh-snapmarketing workspace because the Harness profile owns a nested `pnpm-workspace.yaml`.
- Default Web port is `3081`; `DSH_PORT` overrides it and must be an integer from 1 to 65535.
- `DSH_SKIP_HARNESS_BUILD=1` skips only the Harness build, not the dsh-snapmarketing build or local plugin installation.
- Client source changes use HMR; Host source and profile changes require restarting `pnpm dev`.

---

### Task 1: Define the dev command contract with failing tests

**Files:**
- Create: `scripts/dev.spec.mjs`
- Modify: `vitest.config.ts:10-14`

**Interfaces:**
- Tests import named pure helpers from `scripts/dev.mjs`: `resolveDevConfig`, `buildDevCommands`, and `isMainModule`.
- The tests must be written before `scripts/dev.mjs` exists so the first run fails for the intended missing-module reason.

- [ ] **Step 1: Write the failing tests**

Add tests for these exact behaviors:

```js
import { describe, expect, it } from 'vitest'
import { buildDevCommands, resolveDevConfig } from './dev.mjs'

describe('resolveDevConfig', () => {
  it('uses the sibling Harness checkout and project-local debug home by default', () => {
    const config = resolveDevConfig({ env: {}, repoRoot: '/work/dsh-snapmarketing' })
    expect(config.harnessRoot).toBe('/work/ChatGPT/deepseek-harness-demo')
    expect(config.dshHome).toBe('/work/dsh-snapmarketing/.dev/dsh-home')
    expect(config.skipHarnessBuild).toBe(false)
  })

  it('allows environment overrides and the Harness build skip flag', () => {
    const config = resolveDevConfig({
      env: {
        DSH_ROOT: '/tmp/harness',
        DSH_HOME: '/tmp/dsh-home',
        DSH_SKIP_HARNESS_BUILD: '1',
      },
      repoRoot: '/work/dsh-snapmarketing',
    })
    expect(config.harnessRoot).toBe('/tmp/harness')
    expect(config.dshHome).toBe('/tmp/dsh-home')
    expect(config.skipHarnessBuild).toBe(true)
  })
})

describe('buildDevCommands', () => {
  it('prepares the linked web profile and starts both live processes', () => {
    const commands = buildDevCommands({
      repoRoot: '/work/dsh-snapmarketing',
      harnessRoot: '/work/ChatGPT/deepseek-harness-demo',
      dshHome: '/work/dsh-snapmarketing/.dev/dsh-home',
      skipHarnessBuild: false,
    })
    expect(commands.prepare).toEqual([
      { cwd: '/work/dsh-snapmarketing', argv: ['build'] },
      { cwd: '/work/ChatGPT/deepseek-harness-demo', argv: ['run', 'build'] },
      {
        cwd: '/work/ChatGPT/deepseek-harness-demo',
        argv: ['dsh', 'plugin', '--profile', 'web', 'add', 'link:/work/dsh-snapmarketing/packages/plugin-center'],
      },
    ])
    expect(commands.watch).toEqual({ cwd: '/work/dsh-snapmarketing', argv: ['--filter', '@snapmarketing/dsh-plugin-center', 'exec', 'tsdown', '--watch'] })
    expect(commands.web).toEqual({ cwd: '/work/ChatGPT/deepseek-harness-demo', argv: ['dsh', '--profile', 'web'] })
  })

  it('does not include the Harness build when explicitly skipped', () => {
    const commands = buildDevCommands({
      repoRoot: '/work/dsh-snapmarketing',
      harnessRoot: '/work/ChatGPT/deepseek-harness-demo',
      dshHome: '/tmp/dsh-home',
      skipHarnessBuild: true,
    })
    expect(commands.prepare.map(command => command.argv)).toEqual([
      ['build'],
      ['dsh', 'plugin', '--profile', 'web', 'add', 'link:/work/dsh-snapmarketing/packages/plugin-center'],
    ])
  })
})
```

Extend Vitest's include list with `scripts/**/*.spec.mjs` while leaving existing package test globs unchanged.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `pnpm exec vitest run scripts/dev.spec.mjs`

Expected: FAIL because `scripts/dev.mjs` does not exist yet; do not proceed if the failure is caused by a malformed test or Vitest configuration error.

- [ ] **Step 3: Commit the failing test and test configuration**

```bash
git add scripts/dev.spec.mjs vitest.config.ts
git commit -m "test: specify plugin dev command contract"
```

### Task 2: Implement the dependency-free process orchestrator

**Files:**
- Create: `scripts/dev.mjs`
- Modify: `package.json:12-22`
- Modify: `.gitignore:1-8`

**Interfaces:**
- `resolveDevConfig({ env, repoRoot })` returns `{ repoRoot, harnessRoot, dshHome, skipHarnessBuild }` with absolute paths.
- `buildDevCommands(config)` returns `{ prepare, watch, web }`, where every command is `{ cwd, argv }` and `prepare` is ordered.
- `main()` validates the Harness checkout, creates `dshHome`, executes preparation commands, then starts and supervises watcher/Web children.

- [ ] **Step 1: Implement the minimal pure helpers**

Use `path.resolve` to derive the default Harness root from `repoRoot/../ChatGPT/deepseek-harness-demo`; use `DSH_ROOT` and `DSH_HOME` when non-empty; treat only `DSH_SKIP_HARNESS_BUILD === '1'` as true. Build commands with `pnpm`-compatible argv exactly as asserted in Task 1.

- [ ] **Step 2: Run the focused tests and verify they pass**

Run: `pnpm exec vitest run scripts/dev.spec.mjs`

Expected: PASS for all path/config/command assertions.

- [ ] **Step 3: Add process execution and cleanup**

Implement `runCommand(command, env)` with `spawn('pnpm', command.argv, { cwd, env, stdio: 'inherit' })`, rejecting on spawn errors or non-zero exits. Validate `harnessRoot` by checking `package.json` and `apps/cli/src/bin.ts` before any child starts. Create `dshHome` recursively.

Start watcher and Web with the same environment plus `DSH_HOME`. Track both children; on SIGINT/SIGTERM, send the signal to both, wait briefly for exit, then SIGTERM any survivor. If either live child exits non-zero, terminate the other and return the same failure. Print the key boundary clearly: `Client changes use HMR; Host/config changes require restarting pnpm dev.`

- [ ] **Step 4: Add the public `pnpm dev` script and ignore runtime state**

Add:

```json
"dev": "node scripts/dev.mjs"
```

Add `.dev/` to `.gitignore` so the isolated Harness home and any local runtime state cannot become source changes.

- [ ] **Step 5: Run focused tests and package checks**

Run: `pnpm exec vitest run scripts/dev.spec.mjs`

Expected: PASS with no warnings. Then run `pnpm typecheck` and `pnpm build` from the dsh-snapmarketing root.

- [ ] **Step 6: Commit the implementation**

```bash
git add scripts/dev.mjs package.json .gitignore
git commit -m "feat: add one-command plugin dev entry"
```

### Task 3: Verify the real local debug path

**Files:**
- Modify: `README.zh.md:25-31`

**Interfaces:**
- Documentation exposes `pnpm dev`, `DSH_ROOT`, `DSH_HOME`, and `DSH_SKIP_HARNESS_BUILD` without claiming Host HMR.

- [ ] **Step 1: Document the command and HMR boundary**

Add a short development section showing `pnpm dev`, the optional environment overrides, and the restart requirement for Host/config changes.

- [ ] **Step 2: Run the real debug entry with an isolated home**

Run `DSH_HOME=/tmp/snapmarketing-dsh-verify pnpm dev`, confirm the Harness Web startup reaches its listening state, then send Ctrl-C and confirm both child processes exit. Do not provide an API key or perform authenticated external validation.

- [ ] **Step 3: Run the final verification ladder**

Run:

```bash
pnpm exec vitest run scripts/dev.spec.mjs
pnpm test
pnpm typecheck
pnpm build
git diff --check
git status --short
```

Report static checks separately from the real Harness startup result.

- [ ] **Step 4: Commit the documentation update**

```bash
git add README.zh.md
git commit -m "docs: explain one-command plugin debugging"
```
