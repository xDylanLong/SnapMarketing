import { describe, expect, it } from 'vitest'
import { filterPlugins, parseManifest, type PluginManifest } from '../src/index.ts'

const manifest: PluginManifest = {
  schemaVersion: '1.0',
  updatedAt: '2026-08-14T00:00:00Z',
  plugins: [
    {
      id: 'workspace',
      name: 'Workspace',
      description: 'A UI workspace.',
      author: { name: 'Example', url: 'https://github.com/example' },
      repository: 'https://github.com/example/workspace',
      version: '0.1.0',
      install: { type: 'package', source: '@example/dsh-workspace' },
      hasUI: true,
      category: 'ui',
      tags: ['workspace'],
      screenshots: ['https://example.com/workspace.png'],
      placement: { enabled: true, slots: ['conversation.view'], defaultSlot: 'conversation.view' },
    },
    {
      id: 'search',
      name: 'Search',
      description: 'A search capability.',
      author: { name: 'Example', url: 'https://github.com/example' },
      repository: 'https://github.com/example/search',
      version: '0.1.0',
      install: { type: 'package', source: '@example/dsh-search@1.0.0' },
      hasUI: false,
      category: 'capability',
      tags: ['research'],
    },
  ],
}

describe('parseManifest', () => {
  it('accepts the PRD V1 document', () => {
    expect(parseManifest(manifest)).toEqual(manifest)
  })

  it('rejects a category that disagrees with hasUI', () => {
    expect(() => parseManifest({
      ...manifest,
      plugins: [{ ...manifest.plugins[0], category: 'capability' }],
    })).toThrow('category must be "ui"')
  })

  it('rejects duplicate ids', () => {
    expect(() => parseManifest({ ...manifest, plugins: [manifest.plugins[0], manifest.plugins[0]] }))
      .toThrow('duplicate plugin id')
  })
})

describe('filterPlugins', () => {
  it('filters category, search text, tags, and installed state', () => {
    expect(filterPlugins(manifest.plugins, { category: 'ui' })).toHaveLength(1)
    expect(filterPlugins(manifest.plugins, { query: 'research' })).toHaveLength(1)
    expect(filterPlugins(manifest.plugins, { tag: 'workspace' })).toHaveLength(1)
    expect(filterPlugins(manifest.plugins, { category: 'installed' }, new Set(['search'])))
      .toEqual([manifest.plugins[1]])
  })
})
