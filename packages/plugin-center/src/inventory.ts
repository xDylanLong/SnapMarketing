import { packageNameFromSource, type PluginManifest } from '@snapmarketing/plugin-manifest'
import type { InstalledPlugin } from './types.ts'

interface LoaderEntry {
  readonly options: { readonly name?: string }
  readonly disabled?: boolean
  readonly fiber?: unknown
}

/** Project current Loader entries onto known catalog plugins. */
export function projectInstalled(
  entries: readonly LoaderEntry[],
  manifest: PluginManifest,
): readonly InstalledPlugin[] {
  const byPackage = new Map(manifest.plugins.map(plugin => [packageNameFromSource(plugin.install.source), plugin]))
  return entries.flatMap((entry) => {
    const moduleName = entry.options.name
    if (moduleName === undefined) return []
    const packageName = packageNameFromModuleName(moduleName)
    const plugin = byPackage.get(packageName)
    if (plugin === undefined) return []
    return [{
      pluginId: plugin.id,
      packageName,
      moduleName,
      enabled: entry.disabled !== true,
      phase: entry.disabled === true ? 'disabled' : entry.fiber === undefined ? 'unobserved' : 'active',
    }]
  })
}

function packageNameFromModuleName(moduleName: string): string {
  if (!moduleName.startsWith('@')) return moduleName.split('@', 1)[0] ?? moduleName
  const slash = moduleName.indexOf('/')
  const versionAt = moduleName.indexOf('@', slash + 1)
  return moduleName.slice(0, versionAt === -1 ? moduleName.length : versionAt)
}
