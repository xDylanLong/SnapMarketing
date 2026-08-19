import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { assertInstallable, parseManifest, type PluginManifest } from '@snapmarketing/plugin-manifest'

const BUNDLED_CATALOG_URL = new URL('../registry/plugins.json', import.meta.url)
export const REMOTE_CATALOG_URL = 'https://raw.githubusercontent.com/xDylanLong/dsh-snapmarketing/catalog/packages/plugin-center/registry/plugins.json'
export const CATALOG_REFRESH_INTERVAL_MS = 60 * 60 * 1000
const CATALOG_REQUEST_TIMEOUT_MS = 10_000

export interface CatalogLoaderOptions {
  readonly remoteUrl?: string
  readonly cachePath?: string
  readonly fetchImpl?: typeof fetch
  readonly now?: () => number
  readonly refreshIntervalMs?: number
  readonly requestTimeoutMs?: number
}

/** Read and validate the Manifest shipped in the installed plugin package. */
export async function loadBundledCatalog(): Promise<PluginManifest> {
  const body = await readFile(BUNDLED_CATALOG_URL, 'utf8')
  return parseCatalog(body, 'bundled catalog')
}

/** Resolve the per-user cache without requiring runtime configuration. */
export function resolveCatalogCachePath(dshHome = process.env.DSH_HOME): string {
  const root = dshHome?.trim() || join(homedir(), '.dsh')
  return join(root, 'cache', 'dsh-snapmarketing', 'plugins.json')
}

/** Load the newest valid remote, cached, or bundled catalog. */
export async function loadCatalog(options: CatalogLoaderOptions = {}): Promise<PluginManifest> {
  const cachePath = options.cachePath ?? resolveCatalogCachePath()
  const bundled = await loadBundledCatalog()
  const cached = await loadCachedCatalog(cachePath)
  const fallback = newerCatalog(bundled, cached)

  try {
    const remote = await loadRemoteCatalog({
      remoteUrl: options.remoteUrl ?? REMOTE_CATALOG_URL,
      fetchImpl: options.fetchImpl ?? fetch,
      requestTimeoutMs: options.requestTimeoutMs ?? CATALOG_REQUEST_TIMEOUT_MS,
    })
    const selected = newerCatalog(fallback, remote)
    if (selected === remote) await persistCatalog(cachePath, remote).catch(() => undefined)
    return selected
  } catch {
    return fallback
  }
}

/** Share one in-flight request and avoid repeated network checks within the refresh window. */
export function createCatalogLoader(options: CatalogLoaderOptions = {}): () => Promise<PluginManifest> {
  const now = options.now ?? Date.now
  const refreshIntervalMs = options.refreshIntervalMs ?? CATALOG_REFRESH_INTERVAL_MS
  let loaded: { readonly at: number; readonly manifest: PluginManifest } | undefined
  let inFlight: Promise<PluginManifest> | undefined

  return async () => {
    const currentTime = now()
    if (loaded !== undefined && currentTime - loaded.at < refreshIntervalMs) return loaded.manifest
    if (inFlight !== undefined) return inFlight
    inFlight = loadCatalog(options).then((manifest) => {
      loaded = { at: now(), manifest }
      return manifest
    }).finally(() => {
      inFlight = undefined
    })
    return inFlight
  }
}

async function loadRemoteCatalog({
  remoteUrl,
  fetchImpl,
  requestTimeoutMs,
}: {
  readonly remoteUrl: string
  readonly fetchImpl: typeof fetch
  readonly requestTimeoutMs: number
}): Promise<PluginManifest> {
  const response = await fetchImpl(remoteUrl, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  if (!response.ok) throw new Error(`remote catalog request failed with HTTP ${response.status}`)
  return parseCatalog(await response.text(), 'remote catalog')
}

async function loadCachedCatalog(cachePath: string): Promise<PluginManifest | undefined> {
  try {
    return parseCatalog(await readFile(cachePath, 'utf8'), 'cached catalog')
  } catch {
    return undefined
  }
}

async function persistCatalog(cachePath: string, manifest: PluginManifest): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function newerCatalog(current: PluginManifest, candidate: PluginManifest | undefined): PluginManifest {
  if (candidate === undefined) return current
  return Date.parse(candidate.updatedAt) >= Date.parse(current.updatedAt) ? candidate : current
}

function parseCatalog(body: string, label: string): PluginManifest {
  let input: unknown
  try {
    input = JSON.parse(body) as unknown
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }
  const manifest = parseManifest(input)
  for (const plugin of manifest.plugins) assertInstallable(plugin)
  return manifest
}
