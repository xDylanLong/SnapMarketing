# SnapMarketing Plugin Center Design

## Goal

SnapMarketing is an Apache-2.0 DeepSeek Harness plugin that provides a thin discovery, installation, and management entry point for an allowlisted plugin catalog.

## Product boundary

The public catalog is a static GitHub-hosted `plugins.json` document. SnapMarketing validates and displays that document, but it does not host plugin packages, accept submissions, inspect source code, infer UI capabilities, provide accounts, process payments, or implement review workflows.

Harness remains responsible for loading and running plugins. SnapMarketing only passes the Manifest's `install.source` to the existing `dsh plugin add` or `dsh plugin remove` capability through a host adapter. A plugin UI remains owned by the installed plugin; SnapMarketing never injects DOM or replaces Harness's slot system.

## Repository architecture

The repository contains two publishable packages:

- `@snapmarketing/plugin-manifest` owns the Manifest V1 schema, runtime validation, category consistency checks, catalog filtering, and JSON-safe types.
- `@snapmarketing/dsh-plugin-center` owns the DSH Host and Client halves. The Host exposes catalog, installed-state, install, and uninstall operations. The Client contributes a `settings.plugins.tab` page with category tabs, search, cards, detail previews, and install state.

The example registry lives at `packages/plugin-center/registry/plugins.json` and is intentionally replaceable by a GitHub raw URL configured in the Host bundle. The default URL is the repository's raw catalog, so an installed copy can discover updates without a Marketplace backend.

## Data flow

1. The Host fetches the configured static Manifest URL and validates the JSON with `@snapmarketing/plugin-manifest`.
2. The Host reads installed Loader entries from `ctx.loader`; it maps package module names to Manifest entries without creating a second lifecycle authority.
3. The Client mounts the generated `pluginCenter` Remote and loads the catalog lazily when the Plugin Center tab is first opened.
4. Install and uninstall requests use only a catalog plugin id. The Host resolves the id to its validated package source, invokes the configured Harness installer, and returns a point-in-time operation result.
5. The Client refreshes the catalog and inventory after a successful operation. If the Harness process needs a restart or reload, the UI shows `需要刷新` rather than claiming that the plugin is live.

## Install adapter

The package exposes `HarnessPluginInstaller`, a small interface with `install(source)` and `uninstall(source)` methods. The default adapter invokes the existing `dsh plugin --profile <profile> add/remove <source>` command with `spawnFile`, preserving the Harness profile and package-manager behavior. Tests inject a fake adapter; deployments can provide another adapter without changing the catalog or UI.

The Host rejects unknown ids, non-`package` install types, and sources that are not package specifiers accepted by the allowlist policy. It does not accept an arbitrary URL from the browser.

## UI behavior

The Plugin Center is a feature tab inside Harness's existing Plugins settings section. It has four views: 全部, UI 插件, 能力插件, 已安装. Cards show Manifest metadata, status, author, tags, and a detail disclosure. Detail views show screenshots and usage examples when present. UI plugins are described as owning their own UI; capability plugins are described as adding agent/tool/workflow capabilities.

The first release includes search, tag filtering, install, uninstall, error display, and placement metadata display. It does not implement drag-and-drop placement because that requires an existing Harness slot allowlist and a separate persistence contract.

## Verification

Pure tests cover Manifest validation, category derivation, catalog filtering, and install-source policy. Host tests cover catalog allowlisting, operation delegation, inventory projection, and failure preservation. Client tests cover category rendering, search, install/uninstall actions, and error state. The release gate runs tests, typecheck, build, package-file checks, and a fresh Git status audit.
