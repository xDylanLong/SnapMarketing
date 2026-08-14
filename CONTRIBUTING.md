# Contributing

Contributions should preserve the Thin Layer boundary: keep catalog data and validation separate from Harness runtime behavior, and use existing Harness installation and slot APIs instead of adding parallel package or layout systems.

Run the release checks before opening a pull request:

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

Manifest changes must include a valid `schemaVersion: "1.0"` document and keep `hasUI` consistent with `category`. Do not add arbitrary package URLs to the catalog.
