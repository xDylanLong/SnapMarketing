# DSH Plugin Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pnpm dsh:add` and `pnpm dsh:remove` commands that manage the current SnapMarketing plugin in the DSH web profile without a plugin-name argument.

**Architecture:** Add a small dependency-free ESM command runner with pure command/config helpers and a single subprocess boundary. Root package scripts pass fixed actions (`add` or `remove`); the runner resolves the DSH checkout, uses the current repository's plugin path for add, and uses the fixed package name for remove.

**Tech Stack:** Node.js ESM, `node:child_process`, `node:fs`, `node:path`, pnpm, Vitest.

## Global Constraints

- The public commands are exactly `pnpm dsh:add` and `pnpm dsh:remove`.
- The commands operate only on `@snapmarketing/dsh-plugin-center`; callers do not provide a plugin name.
- The DSH profile is fixed to `web`.
- `DSH_ROOT` overrides the default sibling checkout path; when omitted, `DSH_HOME` defaults to the same system-temporary `snapmarketing-dsh-home` used by `pnpm dev`, while an explicit value is preserved.
- Preserve unrelated working-tree changes.

---

### Task 1: Specify the command contract with tests

**Files:**
- Create: `scripts/dsh-plugin.spec.mjs`
- Modify: `vitest.config.ts` only if the existing script glob does not cover the test

**Interfaces:**
- Tests import `buildPluginCommand`, `resolvePluginConfig`, and `validateHarnessRoot` from `scripts/dsh-plugin.mjs`.

- [ ] **Step 1: Write tests for fixed add/remove arguments**

Assert that add produces `{ cwd: '/work/ChatGPT/deepseek-harness-demo', argv: ['dsh', 'plugin', '--profile', 'web', 'add', 'link:/work/SnapMarketing/packages/plugin-center'] }` and remove produces the same prefix with `['remove', '@snapmarketing/dsh-plugin-center']`.

- [ ] **Step 2: Write tests for config and checkout validation**

Assert default and `DSH_ROOT` paths, resolve the shared default `DSH_HOME`, preserve an explicit `DSH_HOME` in the returned environment, and assert validation accepts a fixture containing `package.json` plus `apps/cli/src/bin.ts` while rejecting a missing checkout with the `DSH_ROOT` guidance.

- [ ] **Step 3: Run the focused test and verify the expected missing-module failure**

Run `pnpm exec vitest run scripts/dsh-plugin.spec.mjs`; it must fail because the implementation module has not been created yet.

### Task 2: Implement and expose the command runner

**Files:**
- Create: `scripts/dsh-plugin.mjs`
- Modify: `package.json`

**Interfaces:**
- `resolvePluginConfig({ env, repoRoot })` returns absolute `repoRoot`, `harnessRoot`, `pluginRoot`, and `env`.
- `buildPluginCommand(action, config)` returns one `{ cwd, argv }` command for `add` or `remove`.
- `validateHarnessRoot(harnessRoot)` throws a clear error for a non-DSH checkout.

- [ ] **Step 1: Implement pure config, command, and validation helpers**

Use `path.resolve`, fixed profile/package constants, and `link:${pluginRoot}` only for add. Reject unknown actions before spawning.

- [ ] **Step 2: Implement the single pnpm subprocess and CLI entrypoint**

Run `pnpm` with inherited stdio and the resolved environment; report failures with the command and exit nonzero. Require exactly one internal action argument and reject extra user arguments with a usage message.

- [ ] **Step 3: Add root package scripts**

Add `"dsh:add": "node scripts/dsh-plugin.mjs add"` and `"dsh:remove": "node scripts/dsh-plugin.mjs remove"`.

- [ ] **Step 4: Run focused tests and type/build checks**

Run the focused script test, `pnpm test`, `pnpm typecheck`, and `pnpm build`.

### Task 3: Document and verify the real command boundary

**Files:**
- Modify: `README.zh.md`

- [ ] **Step 1: Document both commands and `DSH_ROOT`/`DSH_HOME` overrides**

Explain that the commands act on the current project plugin and require no plugin name.

- [ ] **Step 2: Run add/remove against an isolated DSH home**

Use a temporary `DSH_HOME`, run both commands, and inspect the profile dependency state to confirm add and remove terminal results.

- [ ] **Step 3: Run final verification**

Run `pnpm exec vitest run scripts/dsh-plugin.spec.mjs`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check:package`, and `git diff --check`; report real DSH results separately from static checks.
