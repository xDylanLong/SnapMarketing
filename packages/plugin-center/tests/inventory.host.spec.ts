import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectInstalled, readProfileDependencyNames } from '../src/inventory.ts'
import type { PluginManifest } from '../src/types.ts'

const manifest: PluginManifest = {
  schemaVersion: '1.0',
  updatedAt: '2026-08-14T00:00:00Z',
  plugins: [{
    id: 'search', name: 'Search', description: 'Search.',
    author: { name: 'Example', url: 'https://github.com/example' },
    repository: 'https://github.com/example/search', version: '1.0.0',
    install: { type: 'package', source: '@example/search' }, hasUI: false, category: 'capability',
  }],
}

describe('projectInstalled', () => {
  it('materializes Cordis Loader iterators as a JSON-safe array', () => {
    function* entries() {
      yield { options: { name: '@example/search' }, disabled: false, fiber: {} }
    }

    const result = projectInstalled(entries(), manifest)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([{
      pluginId: 'search',
      packageName: '@example/search',
      moduleName: '@example/search',
      enabled: true,
      phase: 'active',
    }])
  })

  it('detects profile dependencies before the running Loader has reloaded them', () => {
    const result = projectInstalled([], manifest, ['@example/search'])
    expect(result).toEqual([{
      pluginId: 'search',
      packageName: '@example/search',
      moduleName: '@example/search',
      enabled: true,
      phase: 'unobserved',
    }])
  })

  it('reads dependency names from the active profile manifest', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-snapmarketing-inventory-'))
    try {
      const profileDir = join(dshHome, 'profiles', 'web')
      await mkdir(profileDir, { recursive: true })
      await writeFile(join(profileDir, 'package.json'), JSON.stringify({
        dependencies: { '@example/search': '^1.0.0' },
        optionalDependencies: { optional: '^1.0.0' },
      }))
      await expect(readProfileDependencyNames('web', dshHome)).resolves.toEqual(['@example/search', 'optional'])
      await expect(readFile(join(profileDir, 'package.json'), 'utf8')).resolves.toContain('@example/search')
    } finally {
      await rm(dshHome, { recursive: true, force: true })
    }
  })
})
