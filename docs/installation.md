# Installation

Install the published bundle through the existing Harness profile command:

```sh
dsh plugin --profile web add @snapmarketing/dsh-plugin-center
```

The bundle inserts the Host plugin and its browser half. The browser half contributes a `Snap Plugin Marketing` tab to the existing Plugins settings section.

The default Host adapter runs the existing CLI installation path with the configured profile:

```text
dsh plugin --profile web add <Manifest install.source>
dsh plugin --profile web remove <Manifest install.source>
```

Successful operations return `needsReload: true` because the running Harness process may need a reload before the newly composed plugin becomes live. Snap Plugin Marketing does not claim that a plugin is active until the Loader inventory reports it.

The Manifest is installed as `registry/plugins.json` inside the Plugin Center package and read from disk by the Host. Installation does not require a GitHub token or a catalog URL, and it does not download the Manifest at runtime.

The Host accepts a `commandTimeoutMs` override; the default CLI operation limit is 120 seconds. Source checkouts can set `command` plus `commandArgs` to launch their local Harness CLI entry point instead of a globally installed `dsh` binary.
