import { assertInstallable, parseManifest, type PluginManifest } from '@snapmarketing/plugin-manifest'
import type { PluginCenterConfig } from './types.ts'

export const DEFAULT_CATALOG_URL =
  'https://raw.githubusercontent.com/xDylanLong/SnapMarketing/main/packages/plugin-center/registry/plugins.json'

/** Fetch and validate a static GitHub-hosted catalog. */
export async function fetchCatalog(config: PluginCenterConfig): Promise<PluginManifest> {
  const fetchImpl = config.fetchImpl ?? fetch
  const response = await fetchImpl(config.catalogUrl ?? DEFAULT_CATALOG_URL)
  if (!response.ok) throw new Error(`catalog request failed with HTTP ${response.status}`)
  const manifest = parseManifest(await response.json() as unknown)
  for (const plugin of manifest.plugins) assertInstallable(plugin)
  return manifest
}
