# Manifest V1

The Plugin Center consumes a static JSON document with this root:

```json
{
  "schemaVersion": "1.0",
  "updatedAt": "2026-08-14T00:00:00Z",
  "plugins": []
}
```

Each plugin has `id`, `name`, `description`, `author`, `repository`, `version`, `install`, `hasUI`, and `category`. `longDescription`, `tags`, `seoTagsZh`, `seoTagsEn`, `icon`, `screenshots`, `usage`, and `placement` are optional. The published marketing catalog fills both SEO tag arrays for every entry: `seoTagsZh` contains Chinese search phrases and `seoTagsEn` contains English search phrases.

`hasUI: true` requires `category: "ui"`; `hasUI: false` requires `category: "capability"`. Placement metadata is only valid for UI plugins. The current installer accepts only npm package specifiers in `install.source`; HTTP URLs, local paths, and arbitrary Git sources are rejected.

The Manifest is an allowlist. If a plugin is not present in the document, the Plugin Center cannot install it.
