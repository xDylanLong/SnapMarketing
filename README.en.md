<p align="center">
  <img src="packages/plugin-center/assets/snapmarketing-logo.png" width="96" alt="SnapMarketing logo">
</p>

# SnapMarketing

[中文](README.md) | English

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

The marketing plugin center for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): discover, search, install, and manage marketing-focused plugins inside Harness.

SnapMarketing is a thin layer on top of Harness. It reuses Harness profiles, the existing installer, and the plugin runtime, so marketing plugins remain part of Harness's normal lifecycle.

## Install

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

Restart `dsh web`, then open **Settings → Plugin Market**.

For the product overview and interface, visit the [SnapMarketing landing page](https://github.com/xDylanLong/SnapMarketing-Landing). This repository contains the installation and runtime code for Plugin Center.

## What you get

- **Marketing plugin catalog** — a curated, package-shipped catalog with names, descriptions, categories, versions, repositories, and install sources.
- **Search and filtering** — search by plugin name or description to find tools for a marketing workflow.
- **One-click install and uninstall** — select a catalog entry and let Harness perform the real package operation; the UI shows progress and the operation result.
- **Actual installed state** — reads the active Harness profile inventory instead of treating a button click as proof that a plugin is live.
- **UI and capability plugins** — catalog metadata clarifies the expected role; UI plugins own their surface, while capability plugins are used through Harness, Agent, or their declared workflow.
- **Clear refresh guidance** — when Harness needs a refresh after installation, the page reports the pending state explicitly.

## How it works

```text
Bundled marketing catalog
          ↓
SnapMarketing Plugin Market
          ↓  validated plugin id
Harness existing installer
          ↓
Harness Loader and plugin runtime
```

The catalog lives at [`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json) and ships with `@snapmarketing/dsh-plugin-center`. The Host validates the Manifest, resolves the selected plugin id to an approved package source, and delegates installation or removal to Harness. Installed clients do not call GitHub at runtime.

## Security and boundaries

SnapMarketing intentionally remains a surface layer around Harness. It does not:

- host plugin packages or run a separate Marketplace backend;
- create accounts, process payments, or accept arbitrary uploads;
- inspect, analyze, or sandbox third-party plugin source code;
- replace Harness's package manager, Loader, UI slots, or plugin lifecycle.

Manifest policy rejects unapproved install sources such as HTTP URLs, local paths, and arbitrary Git sources. The catalog is a curated allowlist, not an endorsement. Install third-party plugins only when you trust their source and permissions.

## Development

```sh
pnpm install
pnpm dev
```

`pnpm dev` builds SnapMarketing, links the local Plugin Center into a web profile, starts Harness Web, and watches the client bundle. The default isolated temporary home is named `dsh-snapmarketing-dsh-home`; the default address is `http://127.0.0.1:3081`.

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

Run the standard checks with:

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

## Catalog and documentation

- [Marketing plugin catalog](packages/plugin-center/registry/plugins.json)
- [Complete catalog backup](packages/plugin-center/registry/plugins.full.json)
- [Manifest V1](docs/manifest-v1.md)
- [Catalog maintenance](docs/catalog-maintenance.md)
- [Contributing guide](CONTRIBUTING.md)
- [SnapMarketing-Landing repository](https://github.com/xDylanLong/SnapMarketing-Landing)

When adding or updating an entry, verify its package name, repository, version, category, and install source. Keep the Thin Layer boundary intact: reuse Harness installation and UI APIs rather than introducing a parallel package or layout system.

## License

Apache-2.0
