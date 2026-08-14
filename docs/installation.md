# Installation

Install the published bundle through the existing Harness profile command:

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

The bundle inserts the Host plugin and its browser half. The browser half contributes a `Plugin Center` tab to the existing Plugins settings section.

The default Host adapter runs the existing CLI installation path with the configured profile:

```text
dsh plugin --profile web add <Manifest install.source>
dsh plugin --profile web remove <Manifest install.source>
```

Successful operations return `needsReload: true` because the running Harness process may need a reload before the newly composed plugin becomes live. The Plugin Center does not claim that a plugin is active until the Loader inventory reports it.

For a deployment-specific catalog, replace `catalogUrl` in the profile patch with a public static JSON URL that follows Manifest V1.
