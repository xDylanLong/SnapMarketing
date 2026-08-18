import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { createMarketingManifest } from './build-marketing-manifest.mjs'

const fullManifest = JSON.parse(await readFile(
  new URL('../packages/plugin-center/registry/plugins.full.json', import.meta.url),
  'utf8',
))
const publishedManifest = JSON.parse(await readFile(
  new URL('../packages/plugin-center/registry/plugins.json', import.meta.url),
  'utf8',
))
const curation = JSON.parse(await readFile(
  new URL('../packages/plugin-center/registry/curation.json', import.meta.url),
  'utf8',
))

describe('marketing Manifest generation', () => {
  it('deterministically derives the current catalog from manual overrides', () => {
    expect(publishedManifest).toEqual(createMarketingManifest(fullManifest, { overrides: curation.overrides }))
  })

  it('keeps confidence metadata outside the published Manifest', () => {
    const source = fullManifest.plugins[0]
    const result = createMarketingManifest(
      { ...fullManifest, plugins: [source] },
      { classifications: { [source.id]: classification(source.id, 0.67) } },
    )
    expect(result.plugins[0]).toMatchObject({
      id: source.id,
      marketingCategories: ['内容营销'],
      seoTagsZh: expect.any(Array),
      seoTagsEn: expect.any(Array),
    })
    expect(result.plugins[0]).not.toHaveProperty('confidence')
  })

  it('lets a manual override exclude or replace an automatic classification', () => {
    const source = fullManifest.plugins[0]
    const automatic = { [source.id]: classification(source.id, 0.9) }
    expect(createMarketingManifest(
      { ...fullManifest, plugins: [source] },
      { classifications: automatic, overrides: { [source.id]: { marketingFit: false } } },
    ).plugins).toEqual([])
  })
})

function classification(id, confidence) {
  return {
    id,
    marketingFit: true,
    marketingCategories: ['内容营销'],
    seoTagsZh: ['内容营销工具', '营销文案生成', '品牌内容创作', '活动内容优化', '社交媒体文案'],
    seoTagsEn: ['content marketing tool', 'marketing copy generation', 'brand content creation', 'campaign content optimization', 'social media copy'],
    confidence,
    reason: 'Supports marketing content.',
  }
}
