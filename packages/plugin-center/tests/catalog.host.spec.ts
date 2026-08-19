import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CATALOG_REFRESH_INTERVAL_MS,
  createCatalogLoader,
  loadBundledCatalog,
  loadCatalog,
  resolveCatalogCachePath,
} from '../src/catalog.ts'
import type { PluginManifest } from '../src/types.ts'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function temporaryCachePath(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-snapmarketing-catalog-'))
  temporaryDirectories.push(root)
  return join(root, 'cache', 'plugins.json')
}

function catalogAt(manifest: PluginManifest, updatedAt: string): PluginManifest {
  return { ...manifest, updatedAt }
}

describe('loadBundledCatalog', () => {
  it('loads the validated catalog from the installed package without a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await loadBundledCatalog()

    expect(result.schemaVersion).toBe('1.0')
    expect(result.plugins.length).toBeGreaterThan(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('loads a newer remote catalog and persists it in the DSH cache', async () => {
    const bundled = await loadBundledCatalog()
    const remote = catalogAt(bundled, '2099-01-01T00:00:00.000Z')
    const cachePath = await temporaryCachePath()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(remote), { status: 200 }))

    await expect(loadCatalog({ cachePath, fetchImpl })).resolves.toEqual(remote)
    expect(fetchImpl).toHaveBeenCalledOnce()
    await expect(readFile(cachePath, 'utf8')).resolves.toContain(remote.updatedAt)
  })

  it('falls back to the newest valid cache when the remote catalog is unavailable', async () => {
    const bundled = await loadBundledCatalog()
    const cached = catalogAt(bundled, '2098-01-01T00:00:00.000Z')
    const cachePath = await temporaryCachePath()
    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, JSON.stringify(cached), 'utf8')

    await expect(loadCatalog({
      cachePath,
      fetchImpl: vi.fn(async () => new Response('unavailable', { status: 503 })),
    })).resolves.toEqual(cached)
  })

  it('rejects an invalid remote catalog and keeps the bundled fallback', async () => {
    const bundled = await loadBundledCatalog()
    const cachePath = await temporaryCachePath()
    const invalid = { ...bundled, schemaVersion: '2.0', updatedAt: '2099-01-01T00:00:00.000Z' }

    await expect(loadCatalog({
      cachePath,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify(invalid), { status: 200 })),
    })).resolves.toEqual(bundled)
  })

  it('shares requests and refreshes no more than once per interval', async () => {
    const bundled = await loadBundledCatalog()
    const remote = catalogAt(bundled, '2099-01-01T00:00:00.000Z')
    const cachePath = await temporaryCachePath()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(remote), { status: 200 }))
    let now = 1_000
    const load = createCatalogLoader({ cachePath, fetchImpl, now: () => now })

    await Promise.all([load(), load()])
    await load()
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    now += CATALOG_REFRESH_INTERVAL_MS
    await load()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('stores catalog data under the active DSH home', () => {
    expect(resolveCatalogCachePath('/tmp/dsh-home')).toBe(join('/tmp/dsh-home', 'cache', 'dsh-snapmarketing', 'plugins.json'))
  })
})
