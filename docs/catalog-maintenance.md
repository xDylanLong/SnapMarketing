# Catalog maintenance

The catalog is the source of truth for the official ecosystem allowlist. Update `packages/plugin-center/registry/plugins.json` through a reviewed GitHub change, then publish the new file with the repository's default branch.

Before merging a catalog change:

1. Keep the root at `schemaVersion: "1.0"`.
2. Use stable kebab-case ids and unique ids.
3. Confirm the GitHub repository, author URL, version, and package source.
4. Set `hasUI` and `category` consistently.
5. Use screenshots and placement metadata only when the plugin author has explicitly confirmed them.
6. Keep `install.source` as a package specifier accepted by the Manifest policy.

This process is intentionally separate from the Plugin Center client. The client displays confirmed data; it does not infer trust or inspect plugin source.
