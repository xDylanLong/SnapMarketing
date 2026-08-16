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

/** Configurable Host behavior for one dsh-snapmarketing installation. */
export interface PluginCenterConfig {
  readonly profile?: string
  readonly command?: string
  readonly commandArgs?: readonly string[]
  readonly commandTimeoutMs?: number
  readonly cwd?: string
  readonly installer?: HarnessPluginInstaller
}

/** Version of the installed dsh-snapmarketing package. */
export interface SnapMarketingVersion {
  readonly currentVersion: string
}

/** Result of checking the published dsh-snapmarketing package version. */
export interface SnapMarketingUpdateStatus extends SnapMarketingVersion {
  readonly latestVersion: string
  readonly updateAvailable: boolean
}

/** Result of updating dsh-snapmarketing through the active DSH profile. */
export interface SnapMarketingUpdateResult {
  readonly status: 'updated' | 'failed'
  readonly needsReload: boolean
  readonly message: string
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
  readonly selfVersion?: SnapMarketingVersion
}

export type CatalogPlugin = PluginMetadata
