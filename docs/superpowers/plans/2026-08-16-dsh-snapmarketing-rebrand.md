# dsh-snapmarketing Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the repository identity and all first-party user-facing product copy to `dsh-snapmarketing` while preserving installed package compatibility.

**Architecture:** Update repository metadata, documentation, scripts, and client-visible copy in place. Keep `@snapmarketing/...` package names, Remote IDs, TypeScript symbols, and CSS/data selectors stable because they are runtime compatibility contracts.

**Tech Stack:** pnpm workspace, TypeScript, React, Vitest, GitHub CLI/API.

## Global Constraints

- User-visible product name and root project name must be exactly `dsh-snapmarketing`.
- GitHub target must be `xDylanLong/dsh-snapmarketing`.
- Preserve `@snapmarketing/plugin-manifest` and `@snapmarketing/dsh-plugin-center` package identities.
- Do not rewrite third-party plugin names, authors, repositories, or catalog descriptions.
- Preserve unrelated worktree changes and do not create a new branch.

### Task 1: Update metadata and primary documentation

**Files:**
- Modify: `package.json`
- Modify: `packages/manifest/package.json`
- Modify: `packages/plugin-center/package.json`
- Modify: `README.md`
- Modify: `README.zh.md`
- Modify: `docs/installation.md`
- Modify: `docs/catalog-maintenance.md`

- [ ] Change the root package name to `dsh-snapmarketing`, update its description, and point its repository URL to `https://github.com/xDylanLong/dsh-snapmarketing.git`.
- [ ] Change first-party package descriptions to describe `dsh-snapmarketing` while leaving their package names and install commands unchanged.
- [ ] Update README titles, product descriptions, visible product labels, repository links, and temporary debug-home examples.
- [ ] Update installation and catalog-maintenance copy to use the new visible product name.

### Task 2: Update runtime-adjacent first-party copy and tests

**Files:**
- Modify: `scripts/dsh-home.mjs`
- Modify: `scripts/dev.spec.mjs`
- Modify: `scripts/dsh-plugin.spec.mjs`
- Modify: `packages/plugin-center/src/client/PluginCenterTab.tsx`
- Modify: `packages/plugin-center/src/client/index.ts`
- Modify: `packages/plugin-center/src/index.ts`
- Modify: `packages/plugin-center/src/self-update.ts`
- Modify: `packages/plugin-center/src/types.ts`
- Modify: `packages/plugin-center/tests/plugin-center.client.spec.tsx`

- [ ] Change the default debug-home label to `dsh-snapmarketing-dsh-home` and update its tests/examples.
- [ ] Replace only user-visible first-party product copy in the client and update flow with `dsh-snapmarketing`; retain TypeScript symbol names and package identifiers.
- [ ] Update client tests to assert the new heading and logo alt text.

### Task 3: Update first-party historical design/planning copy

**Files:**
- Modify: `docs/superpowers/specs/2026-08-14-plugin-center-design.md`
- Modify: `docs/superpowers/specs/2026-08-14-plugin-center-ui-design.md`
- Modify: `docs/superpowers/specs/2026-08-14-plugin-market-ui-design.md`
- Modify: `docs/superpowers/specs/2026-08-14-plugin-dev-entry-design.md`
- Modify: `docs/superpowers/specs/2026-08-14-snapmarketing-update-design.md`
- Modify: `docs/superpowers/specs/2026-08-14-dsh-plugin-toggle-design.md`
- Modify: `docs/superpowers/plans/2026-08-14-plugin-center-mvp.md`
- Modify: `docs/superpowers/plans/2026-08-14-plugin-center-ui-optimization.md`
- Modify: `docs/superpowers/plans/2026-08-14-plugin-market-ui.md`
- Modify: `docs/superpowers/plans/2026-08-14-plugin-dev-entry.md`
- Modify: `docs/superpowers/plans/2026-08-14-dsh-plugin-toggle.md`
- Modify: `packages/plugin-center/cordis.patch.yml`

- [ ] Replace historical first-party product wording and old repository path references with `dsh-snapmarketing`.
- [ ] Leave compatibility package names, technical symbols, and third-party catalog content unchanged.

### Task 4: Verify and rename the GitHub repository

**Files:**
- Modify: `.git/config` through `git remote set-url origin`.

- [ ] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm check:package`.
- [ ] Run a repository-wide search that confirms old user-facing brand/repository references are absent except documented compatibility identifiers and the rebrand history/spec.
- [ ] Check `gh auth status` and current repository permissions before the external rename.
- [ ] Rename `xDylanLong/SnapMarketing` to `xDylanLong/dsh-snapmarketing` through GitHub, update `origin`, and verify the new remote repository metadata.
