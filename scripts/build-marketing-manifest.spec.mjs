import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { createMarketingManifest, MARKETING_PLUGIN_CATEGORIES, MARKETING_PLUGIN_SEO } from './build-marketing-manifest.mjs'

const fullManifest = JSON.parse(await readFile(
  new URL('../packages/plugin-center/registry/plugins.full.json', import.meta.url),
  'utf8',
))
const publishedManifest = JSON.parse(await readFile(
  new URL('../packages/plugin-center/registry/plugins.json', import.meta.url),
  'utf8',
))

describe('marketing Manifest generation', () => {
  it('keeps the full backup and deterministically derives the published catalog', () => {
    expect(fullManifest.plugins.length).toBeGreaterThan(publishedManifest.plugins.length)
    expect(publishedManifest).toEqual(createMarketingManifest(fullManifest))
    expect(publishedManifest.plugins).toHaveLength(Object.keys(MARKETING_PLUGIN_SEO).length)
  })

  it('preserves source metadata and adds complete bilingual SEO tags to every plugin', () => {
    const sourceById = new Map(fullManifest.plugins.map(plugin => [plugin.id, plugin]))
    for (const plugin of publishedManifest.plugins) {
      const { marketingCategories, seoTagsZh, seoTagsEn, ...sourceMetadata } = plugin
      expect(sourceMetadata).toEqual(sourceById.get(plugin.id))
      expect(marketingCategories).toEqual(MARKETING_PLUGIN_CATEGORIES[plugin.id])
      expect(seoTagsZh).toHaveLength(5)
      expect(seoTagsEn).toHaveLength(5)
      expect(seoTagsZh.every(tag => /[\u3400-\u9fff]/u.test(tag))).toBe(true)
      expect(seoTagsEn.every(tag => /^[\x20-\x7e]+$/u.test(tag))).toBe(true)
    }
  })

  it('assigns every published plugin to at least one marketing workflow', () => {
    expect(publishedManifest.plugins.every(plugin => plugin.marketingCategories?.length)).toBe(true)
  })
})
