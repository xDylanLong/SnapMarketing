import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { assertInstallable, parseManifest } from '@snapmarketing/plugin-manifest'

describe('published registry', () => {
  it('is a valid installable marketing Manifest with bilingual SEO tags', async () => {
    const input = JSON.parse(await readFile(
      new URL('../registry/plugins.json', import.meta.url),
      'utf8',
    )) as unknown
    const manifest = parseManifest(input)
    manifest.plugins.forEach(assertInstallable)

    expect(manifest.plugins.length).toBeGreaterThan(0)
    expect(manifest.plugins.some(plugin => plugin.hasUI)).toBe(true)
    expect(manifest.plugins.some(plugin => !plugin.hasUI)).toBe(true)
    expect(new Set(manifest.plugins.map(plugin => plugin.repository)).size).toBe(manifest.plugins.length)
    for (const plugin of manifest.plugins) {
      expect(plugin.seoTagsZh?.length).toBeGreaterThanOrEqual(5)
      expect(plugin.seoTagsEn?.length).toBeGreaterThanOrEqual(5)
    }
  })
})
