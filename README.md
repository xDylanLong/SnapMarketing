<p align="center">
  <img src="packages/plugin-center/assets/snapmarketing-logo.png" width="96" alt="dsh-snapmarketing logo">
</p>

# dsh-snapmarketing

English | [中文](README.zh.md)

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

A thin, local-first plugin discovery and management surface for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Open Harness Settings → **插件市场**, find a plugin, inspect its source, and install it through Harness's existing plugin path.

- `@snapmarketing/plugin-manifest`: Manifest V1 schema, category checks, catalog filters, and install-source policy.
- `@snapmarketing/dsh-plugin-center`: DSH Host and Client plugin with catalog, detail preview, install, uninstall, and installed-state views.
- A marketing-only static catalog at [`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json), with bilingual SEO tags and a complete source backup at [`plugins.full.json`](packages/plugin-center/registry/plugins.full.json).

## Install into a DSH profile

After publishing the package, install it with the existing Harness plugin path:

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

Restart `dsh web`, then open **Settings → 插件市场**.

dsh-snapmarketing is a plugin inside Harness, not a second application or package manager. It uses the existing Harness profile and installer, so the installed plugin remains part of Harness's normal runtime and lifecycle.

## What you get

- **Discover and search** — browse the bundled catalog, search by name or description, and inspect repository and version metadata.
- **Install with one click** — choose a catalog entry and let Harness perform the package operation; the UI shows progress and the actual operation result.
- **Installed state** — the page reads the active Harness inventory instead of treating a button click as proof that a plugin is live.
- **UI or capability plugins** — catalog metadata makes the plugin's expected role clear; a UI plugin owns its own surface, while a capability plugin is used through Harness, Agent, or its declared workflow.
- **Refresh-aware feedback** — when Harness needs a reload after installation, dsh-snapmarketing says so instead of claiming the change is already active.

## How it works

```text
Bundled Manifest
        ↓
dsh-snapmarketing 插件市场
        ↓  validated plugin id
Harness existing installer
        ↓
Harness Loader and plugin runtime
```

The catalog is shipped as `registry/plugins.json` inside `@snapmarketing/dsh-plugin-center`. The Host validates the Manifest, resolves the selected id to its approved package source, and delegates the operation to Harness. The browser cannot submit an arbitrary package URL or install source.

## Why it stays thin

dsh-snapmarketing is intentionally a surface layer around Harness. It does not:

- host plugin packages or run a marketplace backend;
- create accounts, process payments, or accept arbitrary uploads;
- inspect or sandbox third-party plugin source code;
- replace Harness's package manager, Loader, UI slots, or plugin lifecycle.

The catalog is an allowlist, not an endorsement. Install third-party plugins only when you trust their source and permissions.

## Development

```sh
pnpm install
pnpm dev
```

`pnpm dev` builds dsh-snapmarketing, links the local Plugin Center into a web profile, starts the Harness Web process, and watches the client bundle. The default local Harness home is an isolated temporary directory named `dsh-snapmarketing-dsh-home`; the default address is `http://127.0.0.1:3081`.

Useful overrides:

```sh
DSH_ROOT=/path/to/deepseek-harness-demo pnpm dev
DSH_HOME=/tmp/dsh-snapmarketing-dsh-home pnpm dev
DSH_PORT=4099 pnpm dev
DSH_SKIP_HARNESS_BUILD=1 pnpm dev
```

For the current project only:

```sh
pnpm dsh:add
pnpm dsh:remove
```

Run the release checks with:

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

Set `GITHUB_TOKEN` and run `pnpm registry:collect` to refresh the complete backup and rebuild the curated marketing catalog. Run `pnpm registry:marketing` to rebuild only `plugins.json` from the existing backup. Only the marketing catalog ships with the package; installed clients never call GitHub at runtime.

## Catalog and Manifest

The source-controlled catalog lives at [`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json). Edit it directly when adding or updating an entry, then verify the package name, repository, version, category, and install source.

The Manifest only accepts approved package specifiers. HTTP URLs, local paths, and arbitrary Git sources are rejected. See [Manifest V1](docs/manifest-v1.md) and [catalog maintenance](docs/catalog-maintenance.md).

## Contributing

Keep the Thin Layer boundary intact: reuse Harness installation and UI APIs, keep catalog validation separate from runtime behavior, and do not add a parallel package or layout system. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0
