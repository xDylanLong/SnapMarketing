import { describe, expect, it, vi } from 'vitest'
import {
  CLASSIFIER_VERSION,
  authorDeclaredClassification,
  classificationSourceHash,
  classifyBatch,
  classifyManifest,
  validateClassification,
} from './classify-marketing-plugins.mjs'

const plugin = {
  id: 'dsh-content-helper',
  name: 'Content Helper',
  description: 'Create and optimize campaign content',
  author: { name: 'author', url: 'https://github.com/author' },
  repository: 'https://github.com/author/content-helper',
  version: '1.0.0',
  install: { type: 'package', source: 'dsh-content-helper' },
  hasUI: false,
  category: 'capability',
  tags: ['content', 'campaign'],
}

const result = {
  id: plugin.id,
  marketingFit: true,
  marketingCategories: ['内容营销'],
  seoTagsZh: ['内容营销工具', '营销文案生成', '品牌内容创作', '活动内容优化', '社交媒体文案'],
  seoTagsEn: ['content marketing tool', 'marketing copy generation', 'brand content creation', 'campaign content optimization', 'social media copy'],
  confidence: 0.93,
  reason: 'The plugin creates and optimizes campaign content.',
}

describe('marketing plugin classification', () => {
  it('hashes classification inputs but ignores package version changes', () => {
    expect(classificationSourceHash(plugin)).toBe(classificationSourceHash({ ...plugin, version: '2.0.0' }))
    expect(classificationSourceHash(plugin)).not.toBe(classificationSourceHash({ ...plugin, description: 'Search analytics' }))
  })

  it('validates controlled categories and bilingual tags', () => {
    expect(() => validateClassification(result)).not.toThrow()
    expect(() => validateClassification({ ...result, marketingCategories: ['Anything'] }))
      .toThrow(/unsupported category/)
  })

  it('accepts complete author-declared classification without an LLM call', async () => {
    const declaredPlugin = {
      ...plugin,
      marketingCategories: result.marketingCategories,
      seoTagsZh: result.seoTagsZh,
      seoTagsEn: result.seoTagsEn,
    }
    expect(authorDeclaredClassification(declaredPlugin)).toMatchObject({ confidence: 1 })
    const fetchImpl = vi.fn()
    const classified = await classifyManifest({
      manifest: { schemaVersion: '1.0', plugins: [declaredPlugin] },
      cache: { schemaVersion: '1.0', classifierVersion: CLASSIFIER_VERSION, entries: {} },
      overrides: {}, apiKey: 'test-key', baseUrl: 'https://llm.example/v1', model: 'test-model', fetchImpl,
    })
    expect(classified.summary).toMatchObject({ authorDeclared: 1, llmClassified: 0 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('parses one complete OpenAI-compatible batch response', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ classifications: [result] }) } }],
    }), { status: 200 }))
    await expect(classifyBatch([plugin], {
      apiKey: 'test-key',
      baseUrl: 'https://llm.example/v1',
      model: 'test-model',
      fetchImpl,
    })).resolves.toEqual([result])
    expect(fetchImpl).toHaveBeenCalledWith('https://llm.example/v1/chat/completions', expect.objectContaining({ method: 'POST' }))
  })

  it('reuses unchanged entries and never classifies manual overrides', async () => {
    const hash = classificationSourceHash(plugin)
    const fetchImpl = vi.fn()
    const { summary } = await classifyManifest({
      manifest: { schemaVersion: '1.0', plugins: [plugin] },
      cache: { schemaVersion: '1.0', classifierVersion: CLASSIFIER_VERSION, entries: {
        [plugin.id]: { ...result, sourceHash: hash },
      } },
      overrides: {},
      apiKey: 'test-key',
      baseUrl: 'https://llm.example/v1',
      model: 'test-model',
      fetchImpl,
    })
    expect(summary).toMatchObject({ classified: 0, reused: 1 })
    expect(fetchImpl).not.toHaveBeenCalled()

    const overridden = await classifyManifest({
      manifest: { schemaVersion: '1.0', plugins: [plugin] },
      cache: { schemaVersion: '1.0', classifierVersion: CLASSIFIER_VERSION, entries: {} },
      overrides: { [plugin.id]: { marketingFit: false } },
      apiKey: 'test-key',
      baseUrl: 'https://llm.example/v1',
      model: 'test-model',
      fetchImpl,
    })
    expect(overridden.summary).toMatchObject({ classified: 0, manuallyOverridden: 1 })
  })

  it('classifies independent batches with bounded concurrency', async () => {
    const plugins = Array.from({ length: 4 }, (_, index) => ({
      ...plugin,
      id: `${plugin.id}-${index}`,
      install: { ...plugin.install, source: `${plugin.install.source}-${index}` },
    }))
    let active = 0
    let peak = 0
    const fetchImpl = vi.fn(async (_url, init) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, 5))
      active -= 1
      const request = JSON.parse(init.body)
      const requestedPlugin = JSON.parse(request.messages[1].content).plugins[0]
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          classifications: [{ ...result, id: requestedPlugin.id }],
        }) } }],
      }), { status: 200 })
    })

    const classified = await classifyManifest({
      manifest: { schemaVersion: '1.0', plugins },
      cache: { schemaVersion: '1.0', classifierVersion: CLASSIFIER_VERSION, entries: {} },
      overrides: {}, apiKey: 'test-key', baseUrl: 'https://llm.example/v1', model: 'test-model', fetchImpl,
      batchSize: 1,
      batchConcurrency: 3,
    })

    expect(classified.summary.llmClassified).toBe(4)
    expect(fetchImpl).toHaveBeenCalledTimes(4)
    expect(peak).toBe(3)
  })
})
