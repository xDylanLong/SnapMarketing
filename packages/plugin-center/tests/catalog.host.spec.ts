import { describe, expect, it, vi } from 'vitest'
import { fetchCatalog } from '../src/catalog.ts'

describe('fetchCatalog', () => {
  it('validates the public catalog before returning it', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      schemaVersion: '1.0',
      updatedAt: '2026-08-14T00:00:00Z',
      plugins: [{
        id: 'search', name: 'Search', description: 'Search.',
        author: { name: 'Example', url: 'https://github.com/example' },
        repository: 'https://github.com/example/search', version: '0.1.0',
        install: { type: 'package', source: '@example/search' }, hasUI: false, category: 'capability',
      }],
    }), { status: 200 }))
    const result = await fetchCatalog({ catalogUrl: 'https://catalog.test/plugins.json', fetchImpl })
    expect(result.plugins[0]?.id).toBe('search')
    expect(fetchImpl).toHaveBeenCalledWith('https://catalog.test/plugins.json')
  })

  it('rejects a non-package source before install code can see it', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      schemaVersion: '1.0', updatedAt: '2026-08-14T00:00:00Z', plugins: [{
        id: 'unsafe', name: 'Unsafe', description: 'Unsafe.',
        author: { name: 'Example', url: 'https://github.com/example' }, repository: 'https://github.com/example/unsafe',
        version: '0.1.0', install: { type: 'package', source: 'https://evil.test/plugin.tgz' }, hasUI: false, category: 'capability',
      }],
    }), { status: 200 }))
    await expect(fetchCatalog({ fetchImpl })).rejects.toThrow('non-package install source')
  })
})
