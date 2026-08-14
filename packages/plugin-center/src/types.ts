import type { PluginManifest, PluginMetadata } from '@snapmarketing/plugin-manifest'

export type { PluginManifest, PluginMetadata } from '@snapmarketing/plugin-manifest'

/** Result returned by the Harness package operation adapter. */
export interface InstallerResult {
  readonly ok: boolean
  readonly message?: string
  readonly stdout?: string
  readonly stderr?: string
}

/** Host-side adapter for the existing Harness plugin installation capability. */
export interface HarnessPluginInstaller {
  install(source: string): Promise<InstallerResult>
  uninstall(source: string): Promise<InstallerResult>
}

/** Configurable Host behavior for one Plugin Center installation. */
export interface PluginCenterConfig {
  readonly catalogUrl?: string
  readonly profile?: string
  readonly command?: string
  readonly cwd?: string
  readonly installer?: HarnessPluginInstaller
  readonly fetchImpl?: typeof fetch
}

/** Current Loader projection for one catalog plugin. */
export interface InstalledPlugin {
  readonly pluginId: string
  readonly packageName: string
  readonly moduleName: string
  readonly enabled: boolean
  readonly phase: 'active' | 'disabled' | 'unobserved'
}

/** Result of one install or uninstall request. */
export interface PluginOperationResult {
  readonly pluginId: string
  readonly status: 'installed' | 'removed' | 'failed'
  readonly needsReload: boolean
  readonly message: string
}

/** Client-safe Host Remote payload. */
export interface PluginCenterSnapshot {
  readonly manifest: PluginManifest
  readonly installed: readonly InstalledPlugin[]
}

export type CatalogPlugin = PluginMetadata
