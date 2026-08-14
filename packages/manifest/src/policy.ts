import type { PluginMetadata } from './index.ts'

const PACKAGE_SPECIFIER = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:@[0-9][a-z0-9._+~-]*)?$/i

/** Assert that a Manifest entry is safe to pass to the Harness package installer. */
export function assertInstallable(plugin: PluginMetadata): void {
  if (plugin.install.type !== 'package') {
    throw new Error(`plugin "${plugin.id}" uses unsupported install type "${plugin.install.type}"`)
  }
  if (!PACKAGE_SPECIFIER.test(plugin.install.source)) {
    throw new Error(`plugin "${plugin.id}" has a non-package install source`)
  }
}

/** Extract the package name from a validated npm package specifier. */
export function packageNameFromSource(source: string): string {
  const versionAt = source.startsWith('@') ? source.indexOf('@', 1) : source.indexOf('@')
  const name = source.slice(0, versionAt === -1 ? source.length : versionAt)
  if (name.length === 0) throw new Error('package source has no package name')
  return name
}
