# Catalog maintenance

The dsh-snapmarketing published catalog is the marketing-only Manifest at `packages/plugin-center/registry/plugins.json`. The validated result is published to the dedicated `catalog` branch for runtime refreshes and is also bundled inside `@snapmarketing/dsh-plugin-center` as an offline fallback. The complete collected catalog is preserved separately at `packages/plugin-center/registry/plugins.full.json` as the source backup.

The catalog is refreshed every day by `.github/workflows/catalog-refresh.yml`. Daily runs collect repositories changed within a 48-hour overlap window; Sunday runs reconcile the complete GitHub [`dsh-plugin` topic](https://github.com/topics/dsh-plugin), including removals. A manual run can select either `incremental` or `full`. The workflow classifies new or changed plugins with an OpenAI-compatible Chat Completions API, validates the result, publishes the validated commit to the `catalog` branch, and creates or updates the `automation/catalog-refresh` pull request for auditability. Runtime clients use the stable raw catalog URL from the `catalog` branch and do not wait for that pull request to merge.

The workflow requires these repository Actions secrets:

- `LLM_API_KEY`
- `LLM_BASE_URL`, for example a provider's `/v1` base URL
- `LLM_MODEL`

Complete author declarations in `dsh.pluginCenter.marketingCategories`, `seoTagsZh`, and `seoTagsEn` take precedence over LLM output. Otherwise, the LLM result includes `marketingFit`, controlled marketing categories, five Chinese SEO tags, five English SEO tags, a confidence score, and a short reason. Confidence and reasoning stay in `classification-cache.json`; they are not included in the published Manifest. Unchanged inputs reuse the committed cache and do not call the LLM again.

Refresh the complete pipeline locally with the same three LLM environment variables and a GitHub token:

```bash
GITHUB_TOKEN=... LLM_API_KEY=... LLM_BASE_URL=... LLM_MODEL=... CATALOG_COLLECTION_MODE=incremental pnpm registry:collect
```

The collector uses the cursor-paginated GitHub Topic connection rather than the 1,000-result-limited Search connection. It stores repository watermarks, cached accepted entries, and structural rejection reasons in `collection-cache.json`. Incremental runs fetch a light repository index ordered by update time and hydrate only new or changed repositories. Full runs traverse the complete topic membership, remove repositories that no longer carry the topic, and still reuse unchanged hydrated records.

The collector does not contact npm and does not verify publication or installation. It maps `version` from the repository's `package.json`, using `unknown` when absent, and only requires the repository metadata needed to construct a DSH catalog entry: a valid package name and `dsh.bundle.patch`. The classifier processes only plugins whose classification input changed, then the marketing builder writes every `marketingFit: true` plugin to `plugins.json`.

To rebuild only the marketing catalog from the existing full backup, classification cache, and overrides, run `pnpm registry:marketing`.

Manual decisions live in `packages/plugin-center/registry/curation.json` and always override automatic classifications. An override may exclude a plugin with `{ "marketingFit": false }`, or replace its categories and tags. A manually included plugin must provide `marketingFit: true`, one to three supported `marketingCategories`, exactly five unique `seoTagsZh`, and exactly five unique `seoTagsEn`.

These commands are maintenance tools. Only `plugins.json` is bundled into the package. Installed clients do not need a GitHub token: the Host checks the public remote catalog at most once per hour, validates it, and caches it under `DSH_HOME/cache/dsh-snapmarketing/plugins.json`. A failed, timed-out, stale, or invalid remote response falls back to the newest valid cache or bundled catalog.

Each entry describes a repository-declared Harness package. Catalog maintenance validates Manifest structure and classification consistency; it does not assert that the package is published or installable.

Before merging a catalog change:

1. Keep the root at `schemaVersion: "1.0"`.
2. Use stable kebab-case ids and unique ids.
3. Confirm the GitHub repository, author URL, repository-declared version, and package source.
4. Set `hasUI` and `category` consistently.
5. Use screenshots and placement metadata only when the plugin author has explicitly confirmed them.
6. Keep `install.source` as a package specifier accepted by the Manifest policy.
7. Do not treat catalog inclusion as package publication, compatibility, security, or installation validation.
8. Confirm every published entry exists unchanged in `plugins.full.json` apart from `marketingCategories`, `seoTagsZh`, and `seoTagsEn`.
9. Keep both SEO tag arrays non-empty, unique, language-appropriate, and relevant to the plugin's marketing use case.

This process is intentionally separate from the Plugin Center client. The client displays generated data; it does not call the LLM, infer trust, or inspect plugin source. Automatic classification is not a security review.
