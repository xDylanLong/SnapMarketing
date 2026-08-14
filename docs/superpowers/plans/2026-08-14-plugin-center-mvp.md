# SnapMarketing Plugin Center MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an Apache-2.0 DeepSeek Harness plugin that discovers allowlisted plugins from a static GitHub catalog and delegates installation and removal to Harness.

**Architecture:** A pure Manifest package owns schema validation and catalog policy. The DSH plugin package owns a Host Typert Remote backed by a configurable Harness installer and a Client settings tab backed by the Remote. The package exports a DSH bundle patch and browser roster metadata so it can be installed with `dsh plugin add`.

**Tech Stack:** TypeScript, ESM, pnpm workspaces, Zod, React 18, Vitest, tsdown, DeepSeek Harness Client Slots and Typert Remote APIs.

## Global Constraints

- License is Apache-2.0.
- Manifest V1 uses `schemaVersion: "1.0"`, ISO `updatedAt`, and the PRD plugin fields.
- `hasUI: true` must map to `category: "ui"`; `hasUI: false` must map to `category: "capability"`.
- Only static public Manifest data is trusted as catalog input; the Client cannot submit arbitrary package sources.
- Harness owns plugin loading and UI slots; SnapMarketing does not reimplement the runtime, package manager, or DOM injection.
- The default installer delegates to `dsh plugin --profile <profile> add/remove`.
- P0 includes catalog loading, categories, details, previews, installation, installed state, and Harness integration; P1 includes search, tags, placement metadata, and uninstall.
- Accounts, submissions, moderation, comments, ratings, rankings, payments, source analysis, and Marketplace backend are outside this release.

---

### Task 1: Repository foundation and Manifest package

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.editorconfig`
- Create: `LICENSE`, `README.md`, `README.zh.md`, `CONTRIBUTING.md`
- Create: `packages/manifest/package.json`, `packages/manifest/tsconfig.json`, `packages/manifest/src/index.ts`, `packages/manifest/src/policy.ts`
- Create: `packages/manifest/tests/manifest.spec.ts`, `packages/manifest/tests/policy.spec.ts`
- Create: `packages/plugin-center/registry/plugins.json`

**Interfaces:**
- Produces `PluginManifest`, `PluginMetadata`, `InstallSpec`, `PlacementMetadata`, `parseManifest(input)`, `filterPlugins(plugins, filter)`, and `assertInstallable(plugin)` for the DSH package.

- [ ] Define the workspace scripts `test`, `typecheck`, `build`, `lint`, and `check:package` and pin the published DSH peer range in one root variable.
- [ ] Write failing tests for valid PRD data, missing required fields, invalid category/`hasUI` combinations, duplicate ids, and unknown install types.
- [ ] Implement Zod validation and policy functions with error messages that name the plugin id and field.
- [ ] Add one UI plugin and one capability plugin to the sample catalog, using no fake package name that could be mistaken for a published dependency.
- [ ] Run `pnpm exec vitest run packages/manifest/tests` and `pnpm exec tsc -p packages/manifest/tsconfig.json --noEmit`, then commit the foundation.

### Task 2: Host installer and Typert Remote

**Files:**
- Create: `packages/plugin-center/package.json`, `packages/plugin-center/tsconfig.json`, `packages/plugin-center/tsdown.config.ts`
- Create: `packages/plugin-center/src/index.ts`, `packages/plugin-center/src/types.ts`, `packages/plugin-center/src/catalog.ts`, `packages/plugin-center/src/installer.ts`, `packages/plugin-center/src/inventory.ts`
- Create: `packages/plugin-center/src/typert.ts`, `packages/plugin-center/src/remote.ts`, `packages/plugin-center/src/host-manifest.ts`
- Create: `packages/plugin-center/tests/catalog.host.spec.ts`, `packages/plugin-center/tests/installer.host.spec.ts`

**Interfaces:**
- Consumes `parseManifest()` and `assertInstallable()` from Task 1.
- Produces `PluginCenterGateway` with direct Remote methods `catalog()`, `installed()`, `install(pluginId)`, and `uninstall(pluginId)`.
- Produces `HarnessPluginInstaller`, `createDshCliInstaller(options)`, and `PluginCenterConfig`.

- [ ] Write host tests proving unknown ids never reach the installer, valid ids pass the exact Manifest source, installed status is derived from Loader entries, and installer errors return a failed result without deleting state.
- [ ] Implement the DSH CLI adapter with `spawnFile('dsh', ['plugin', '--profile', profile, 'add'|'remove', source])`, preserving stdout/stderr in the operation result and never accepting a source from the browser.
- [ ] Implement the Host gateway using the current DSH `TypertRemoteService`/`@Remote` contract and a checked-in generated `./typert` plus `./remote` artifact for strict RPC codecs.
- [ ] Export `dsh.bundle.patch` and `dsh.client` metadata so the package can be composed as an out-of-tree DSH plugin.
- [ ] Run focused Host tests and typecheck the package before committing.

### Task 3: Client Plugin Center UI

**Files:**
- Create: `packages/plugin-center/src/client/index.ts`, `packages/plugin-center/src/client/PluginCenterTab.tsx`, `packages/plugin-center/src/client/PluginCard.tsx`, `packages/plugin-center/src/client/PluginDetail.tsx`, `packages/plugin-center/src/client/locales.ts`, `packages/plugin-center/src/client/styles.module.css`
- Create: `packages/plugin-center/tests/plugin-center.client.spec.tsx`
- Modify: `packages/plugin-center/package.json`, `packages/plugin-center/tsdown.config.ts`

**Interfaces:**
- Consumes `ctx.remote.pluginCenter`, the `settings.plugins.tab` slot, and Manifest types from Task 1.
- Produces one localized settings tab whose list/detail actions call the Host Remote and refresh authoritative state after install or uninstall.

- [ ] Write client tests for the four category tabs, empty/error/loading states, search and tag filtering, screenshot preview rendering, install action, uninstall action, and `需要刷新` status.
- [ ] Implement lazy Remote mounting and load-on-first-render; do not fetch the catalog during plugin activation.
- [ ] Render cards from Manifest metadata only, with separate copy for UI and capability plugins and no assumptions about a plugin's eventual surface.
- [ ] Implement serialized per-plugin operations so double-clicks cannot issue concurrent install/uninstall requests; preserve the returned error message.
- [ ] Run jsdom client tests and the package typecheck before committing.

### Task 4: Integration docs, examples, and release checks

**Files:**
- Create: `docs/manifest-v1.md`, `docs/installation.md`, `docs/catalog-maintenance.md`, `packages/plugin-center/cordis.patch.yml`, `.github/workflows/ci.yml`
- Modify: `README.md`, `README.zh.md`, `CONTRIBUTING.md`, package manifests

- [ ] Document the exact Manifest JSON with field meanings, allowlist policy, GitHub raw catalog configuration, and the DSH install command.
- [ ] Document that package authors own their UI and must not use DOM injection; placement metadata is descriptive until a Harness allowlist is available.
- [ ] Add CI commands for install, test, typecheck, build, and package-file audit on Node 22.
- [ ] Run the complete local release gate and inspect the generated package contents with `pnpm pack --dry-run`.

### Task 5: Public repository publication

**Files:**
- Git metadata only; no source changes after the release gate unless verification finds a defect.

- [ ] Initialize Git on `main`, inspect the full diff, and create an intentional initial commit.
- [ ] Check `gh auth status` and create the public repository `SnapMarketing` with the Apache-2.0 source.
- [ ] Push `main`, verify the remote URL and public visibility, and record the published repository URL in the final handoff.
- [ ] Re-run `git status --short --branch` and verify the working tree is clean before claiming publication.
