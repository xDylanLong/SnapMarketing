# Catalog maintenance

The published catalog is the marketing-only Manifest at `packages/plugin-center/registry/plugins.json`. It is bundled inside `@snapmarketing/dsh-plugin-center` and is read from the installed package at runtime. The complete collected catalog is preserved separately at `packages/plugin-center/registry/plugins.full.json` as the source backup.

Refresh both files from the complete GitHub [`dsh-plugin` topic](https://github.com/topics/dsh-plugin):

```bash
GITHUB_TOKEN=... pnpm registry:collect
```

The collector first writes every installable result to `plugins.full.json`. It includes forks and archived repositories, partitions queries by creation timestamp to traverse beyond GitHub Search's 1,000-result window, and only skips entries that cannot produce a working package install. The marketing builder then selects the curated marketing ids, preserves their source metadata, adds `seoTagsZh` and `seoTagsEn`, and writes the result to `plugins.json`.

To rebuild only the marketing catalog from the existing full backup, run `pnpm registry:marketing`. The curated ids and bilingual SEO tags live in `scripts/build-marketing-manifest.mjs`; update that mapping when the marketing scope changes.

These commands are release-time maintenance tools. Only `plugins.json` is bundled into the package, so installed clients do not need a GitHub token or runtime network access to the catalog.

Each entry must describe an installable Harness package. Verify its package name, bundle patch, published version, UI classification, and repository metadata before editing the Manifest.

Before merging a catalog change:

1. Keep the root at `schemaVersion: "1.0"`.
2. Use stable kebab-case ids and unique ids.
3. Confirm the GitHub repository, author URL, version, and package source.
4. Set `hasUI` and `category` consistently.
5. Use screenshots and placement metadata only when the plugin author has explicitly confirmed them.
6. Keep `install.source` as a package specifier accepted by the Manifest policy.
7. Confirm that every listed package remains installable through the Harness package installer.
8. Confirm every published entry exists unchanged in `plugins.full.json` apart from `seoTagsZh` and `seoTagsEn`.
9. Keep both SEO tag arrays non-empty, unique, language-appropriate, and relevant to the plugin's marketing use case.

This process is intentionally separate from the Plugin Center client. The client displays confirmed data; it does not infer trust or inspect plugin source.
