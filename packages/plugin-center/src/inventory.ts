import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { packageNameFromSource, type PluginManifest } from '@snapmarketing/plugin-manifest'
import type { InstalledPlugin } from './types.ts'

interface LoaderEntry {
  readonly options: { readonly name?: string }
  readonly disabled?: boolean
  readonly fiber?: unknown
}

/** Project current Loader entries onto known catalog plugins. */
export function projectInstalled(
  entries: Iterable<LoaderEntry>,
  manifest: PluginManifest,
  profileDependencies: Iterable<string> = [],
): readonly InstalledPlugin[] {
  const byPackage = new Map(manifest.plugins.map(plugin => [packageNameFromSource(plugin.install.source), plugin]))
  const projected: InstalledPlugin[] = Array.from(entries).flatMap((entry) => {
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
  const projectedIds = new Set(projected.map(plugin => plugin.pluginId))
  for (const packageName of profileDependencies) {
    const plugin = byPackage.get(packageName)
    if (plugin === undefined || projectedIds.has(plugin.id)) continue
    projected.push({
      pluginId: plugin.id,
      packageName,
      moduleName: packageName,
      enabled: true,
      phase: 'unobserved',
    })
    projectedIds.add(plugin.id)
  }
  return projected
}

/** Read dependency names from the active DSH profile before Loader reloads them. */
export async function readProfileDependencyNames(
  profile: string,
  dshHome = process.env.DSH_HOME,
): Promise<readonly string[]> {
  if (dshHome === undefined || dshHome.trim() === '') return []
  try {
    const body = await readFile(join(dshHome, 'profiles', profile, 'package.json'), 'utf8')
    const packageJson = JSON.parse(body) as {
      dependencies?: Record<string, unknown>
      optionalDependencies?: Record<string, unknown>
      devDependencies?: Record<string, unknown>
    }
    return [...new Set([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.optionalDependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ])]
  } catch {
    return []
  }
}

function packageNameFromModuleName(moduleName: string): string {
  if (!moduleName.startsWith('@')) return moduleName.split('@', 1)[0] ?? moduleName
  const slash = moduleName.indexOf('/')
  const versionAt = moduleName.indexOf('@', slash + 1)
  return moduleName.slice(0, versionAt === -1 ? moduleName.length : versionAt)
}
