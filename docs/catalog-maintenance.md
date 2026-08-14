# Catalog maintenance

The catalog is the source-controlled Manifest at `packages/plugin-center/registry/plugins.json`. It is published inside `@snapmarketing/dsh-plugin-center` and is read from the installed package at runtime.

Update that file directly when adding, changing, or removing a catalog entry. No GitHub token or collection script is part of the installation or maintenance flow.

Each entry must describe an installable Harness package. Verify its package name, bundle patch, published version, UI classification, and repository metadata before editing the Manifest.

Before merging a catalog change:

1. Keep the root at `schemaVersion: "1.0"`.
2. Use stable kebab-case ids and unique ids.
3. Confirm the GitHub repository, author URL, version, and package source.
4. Set `hasUI` and `category` consistently.
5. Use screenshots and placement metadata only when the plugin author has explicitly confirmed them.
6. Keep `install.source` as a package specifier accepted by the Manifest policy.
7. Confirm that every listed package remains installable through the Harness package installer.

This process is intentionally separate from the Plugin Center client. The client displays confirmed data; it does not infer trust or inspect plugin source.
