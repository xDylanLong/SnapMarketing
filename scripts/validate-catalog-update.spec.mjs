import { describe, expect, it } from 'vitest'
import { classificationSourceHash } from './classify-marketing-plugins.mjs'
import { createMarketingManifest } from './build-marketing-manifest.mjs'
import { validateCatalogUpdate } from './validate-catalog-update.mjs'

const plugin = {
  id: 'dsh-email', name: 'Email', description: 'Send email campaigns',
  author: { name: 'author', url: 'https://github.com/author' },
  repository: 'https://github.com/author/email', version: '1.0.0',
  install: { type: 'package', source: 'dsh-email' }, hasUI: false, category: 'capability',
}
const classification = {
  sourceHash: classificationSourceHash(plugin), marketingFit: true,
  marketingCategories: ['邮件营销'],
  seoTagsZh: ['邮件营销工具', '营销邮件发送', '客户邮件触达', '邮件活动管理', '潜客邮件培育'],
  seoTagsEn: ['email marketing tool', 'marketing email delivery', 'customer email outreach', 'email campaign management', 'lead nurturing emails'],
  confidence: 0.9, reason: 'Supports email campaigns.', source: 'llm', classifiedAt: '2026-08-18T00:00:00.000Z',
}

describe('catalog update validation', () => {
  it('accepts a complete derived catalog', () => {
    const full = { schemaVersion: '1.0', updatedAt: '2026-08-18T00:00:00.000Z', plugins: [plugin] }
    const cache = { entries: { [plugin.id]: classification } }
    const published = createMarketingManifest(full, { classifications: cache.entries })
    expect(validateCatalogUpdate({ full, published, cache, curation: { overrides: {} }, previousFull: full }))
      .toMatchObject({ fullPlugins: 1, publishedPlugins: 1 })
  })

  it('blocks an unexpected source catalog collapse', () => {
    const full = { schemaVersion: '1.0', updatedAt: '2026-08-18T00:00:00.000Z', plugins: [plugin] }
    expect(() => validateCatalogUpdate({
      full,
      published: full,
      cache: { entries: { [plugin.id]: classification } },
      curation: { overrides: {} },
      previousFull: { ...full, plugins: Array.from({ length: 20 }, (_, index) => ({ id: `plugin-${index}` })) },
    })).toThrow(/dropped by more than 10%/)
  })
})
