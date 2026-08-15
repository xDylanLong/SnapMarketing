# SnapMarketing

SnapMarketing is a thin Apache-2.0 Snap Plugin Marketing surface for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

It adds one discovery and management entry point:

`bundled Manifest → Snap Plugin Marketing → Harness install capability → Harness plugin runtime`

The project intentionally does not become a Marketplace backend. It does not host plugin packages, create accounts, process payments, accept arbitrary uploads, inspect plugin source, or replace Harness's plugin and UI slot systems.

## What is included

- `@snapmarketing/plugin-manifest`: Manifest V1 schema, category checks, catalog filters, and install-source policy.
- `@snapmarketing/dsh-plugin-center`: DSH Host and Client plugin with catalog, detail preview, install, uninstall, and installed-state views.
- A marketing-only static catalog at [`packages/plugin-center/registry/plugins.json`](packages/plugin-center/registry/plugins.json), with bilingual SEO tags and a complete source backup at [`plugins.full.json`](packages/plugin-center/registry/plugins.full.json).

## Install into a DSH profile

After publishing the package, install it with the existing Harness plugin path:

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

The bundle adds a `Snap Plugin Marketing` tab to Harness's existing Plugins settings section. The default Host adapter delegates package operations to `dsh plugin --profile web add/remove`, so SnapMarketing does not implement another package manager.

The Host reads the Manifest directly from the installed package. No GitHub token or runtime catalog download is required. The browser can only request plugin ids that exist in that validated Manifest; it cannot send an arbitrary package source.

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

Set `GITHUB_TOKEN` and run `pnpm registry:collect` to refresh the complete backup and rebuild the curated marketing catalog. Run `pnpm registry:marketing` to rebuild only `plugins.json` from the existing backup. Only the marketing catalog ships with the package; installed clients never call GitHub at runtime.

See [Manifest V1](docs/manifest-v1.md), [installation](docs/installation.md), and [catalog maintenance](docs/catalog-maintenance.md).
