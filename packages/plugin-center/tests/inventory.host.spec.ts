import { describe, expect, it } from 'vitest'
import { projectInstalled } from '../src/inventory.ts'
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
})
