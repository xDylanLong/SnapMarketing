import { readFile } from 'node:fs/promises'
import { assertInstallable, parseManifest, type PluginManifest } from '@snapmarketing/plugin-manifest'

const BUNDLED_CATALOG_URL = new URL('../registry/plugins.json', import.meta.url)

/** Read and validate the Manifest shipped in the installed plugin package. */
export async function loadBundledCatalog(): Promise<PluginManifest> {
  const body = await readFile(BUNDLED_CATALOG_URL, 'utf8')
  let input: unknown
  try {
    input = JSON.parse(body) as unknown
  } catch {
    throw new Error('bundled catalog is not valid JSON')
  }
  const manifest = parseManifest(input)
  for (const plugin of manifest.plugins) assertInstallable(plugin)
  return manifest
}
