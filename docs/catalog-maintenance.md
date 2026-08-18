# Catalog maintenance

The dsh-snapmarketing published catalog is the marketing-only Manifest at `packages/plugin-center/registry/plugins.json`. It is bundled inside `@snapmarketing/dsh-plugin-center` and is read from the installed package at runtime. The complete collected catalog is preserved separately at `packages/plugin-center/registry/plugins.full.json` as the source backup.

The catalog is refreshed every day by `.github/workflows/catalog-refresh.yml`. The workflow can also be started manually. It collects the complete GitHub [`dsh-plugin` topic](https://github.com/topics/dsh-plugin), classifies new or changed plugins with an OpenAI-compatible Chat Completions API, validates the result, and creates or updates the `automation/catalog-refresh` pull request.

The workflow requires these repository Actions secrets:

- `LLM_API_KEY`
- `LLM_BASE_URL`, for example a provider's `/v1` base URL
- `LLM_MODEL`

Complete author declarations in `dsh.pluginCenter.marketingCategories`, `seoTagsZh`, and `seoTagsEn` take precedence over LLM output. Otherwise, the LLM result includes `marketingFit`, controlled marketing categories, five Chinese SEO tags, five English SEO tags, a confidence score, and a short reason. Confidence and reasoning stay in `classification-cache.json`; they are not included in the published Manifest. Unchanged inputs reuse the committed cache and do not call the LLM again.

Refresh the complete pipeline locally with the same three LLM environment variables and a GitHub token:

```bash
GITHUB_TOKEN=... LLM_API_KEY=... LLM_BASE_URL=... LLM_MODEL=... pnpm registry:collect
```

The collector first writes every installable result to `plugins.full.json`. It includes forks and archived repositories, partitions queries by creation timestamp to traverse beyond GitHub Search's 1,000-result window, and only skips entries that cannot produce a working package install. The classifier processes only plugins whose classification input changed, then the marketing builder writes every `marketingFit: true` plugin to `plugins.json`.

To rebuild only the marketing catalog from the existing full backup, classification cache, and overrides, run `pnpm registry:marketing`.

Manual decisions live in `packages/plugin-center/registry/curation.json` and always override automatic classifications. An override may exclude a plugin with `{ "marketingFit": false }`, or replace its categories and tags. A manually included plugin must provide `marketingFit: true`, one to three supported `marketingCategories`, exactly five unique `seoTagsZh`, and exactly five unique `seoTagsEn`.

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
8. Confirm every published entry exists unchanged in `plugins.full.json` apart from `marketingCategories`, `seoTagsZh`, and `seoTagsEn`.
9. Keep both SEO tag arrays non-empty, unique, language-appropriate, and relevant to the plugin's marketing use case.

This process is intentionally separate from the Plugin Center client. The client displays generated data; it does not call the LLM, infer trust, or inspect plugin source. Automatic classification is not a security review.
