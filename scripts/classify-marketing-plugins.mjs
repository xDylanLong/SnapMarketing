import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_SOURCE = 'packages/plugin-center/registry/plugins.full.json'
const DEFAULT_CACHE = 'packages/plugin-center/registry/classification-cache.json'
const DEFAULT_CURATION = 'packages/plugin-center/registry/curation.json'
const DEFAULT_BATCH_SIZE = 20
const REQUEST_TIMEOUT_MS = 60_000

export const CLASSIFIER_VERSION = 'marketing-v1'
export const MARKETING_CATEGORIES = [
  '市场调研',
  '内容营销',
  '社交媒体',
  'SEO/GEO',
  '邮件营销',
  '营销自动化',
  '视觉素材',
  '视频营销',
  '广告与投放',
  '数据分析',
]

export function classificationSourceHash(plugin) {
  const input = {
    name: plugin.name,
    description: plugin.description,
    longDescription: plugin.longDescription,
    tags: plugin.tags,
    usage: plugin.usage,
    hasUI: plugin.hasUI,
    marketingCategories: plugin.marketingCategories,
    seoTagsZh: plugin.seoTagsZh,
    seoTagsEn: plugin.seoTagsEn,
  }
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

export async function classifyManifest({
  manifest,
  cache = emptyCache(),
  overrides = {},
  apiKey,
  baseUrl,
  model,
  fetchImpl = fetch,
  now = new Date(),
  batchSize = DEFAULT_BATCH_SIZE,
}) {
  validateManifestRoot(manifest)
  validateConfig({ apiKey, baseUrl, model })
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('batchSize must be a positive integer')

  const knownIds = new Set(manifest.plugins.map(plugin => plugin.id))
  const entries = Object.fromEntries(
    Object.entries(cache.entries ?? {})
      .filter(([id]) => knownIds.has(id) && !Object.hasOwn(overrides, id)),
  )
  const changed = manifest.plugins.filter((plugin) => {
    if (Object.hasOwn(overrides, plugin.id)) return false
    const existing = entries[plugin.id]
    return cache.classifierVersion !== CLASSIFIER_VERSION
      || existing?.sourceHash !== classificationSourceHash(plugin)
  })

  const pending = []
  let authorDeclared = 0
  for (const plugin of changed) {
    const declared = authorDeclaredClassification(plugin)
    if (declared === undefined) {
      pending.push(plugin)
      continue
    }
    entries[plugin.id] = {
      sourceHash: classificationSourceHash(plugin),
      ...declared,
      source: 'author',
      classifiedAt: now.toISOString(),
    }
    authorDeclared += 1
  }

  for (let index = 0; index < pending.length; index += batchSize) {
    const plugins = pending.slice(index, index + batchSize)
    const classifications = await classifyBatch(plugins, { apiKey, baseUrl, model, fetchImpl })
    for (const classification of classifications) {
      const plugin = plugins.find(item => item.id === classification.id)
      entries[classification.id] = {
        sourceHash: classificationSourceHash(plugin),
        marketingFit: classification.marketingFit,
        marketingCategories: classification.marketingCategories,
        seoTagsZh: classification.seoTagsZh,
        seoTagsEn: classification.seoTagsEn,
        confidence: classification.confidence,
        reason: classification.reason,
        source: 'llm',
        classifiedAt: now.toISOString(),
      }
    }
  }

  return {
    cache: {
      schemaVersion: '1.0',
      classifierVersion: CLASSIFIER_VERSION,
      entries: Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right))),
    },
    summary: {
      totalPlugins: manifest.plugins.length,
      manuallyOverridden: manifest.plugins.filter(plugin => Object.hasOwn(overrides, plugin.id)).length,
      classified: changed.length,
      authorDeclared,
      llmClassified: pending.length,
      reused: manifest.plugins.length - pending.length
        - authorDeclared - manifest.plugins.filter(plugin => Object.hasOwn(overrides, plugin.id)).length,
    },
  }
}

export async function classifyBatch(plugins, { apiKey, baseUrl, model, fetchImpl = fetch }) {
  if (plugins.length === 0) return []
  const request = {
    model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: [
          'You classify DeepSeek Harness plugins for a marketing plugin catalog.',
          'Return JSON only as {"classifications":[...]}.',
          'For each input plugin return exactly one object with id, marketingFit, marketingCategories, seoTagsZh, seoTagsEn, confidence, and reason.',
          `marketingCategories may only contain: ${MARKETING_CATEGORIES.join(', ')}.`,
          'When marketingFit is true, choose one to three categories and generate exactly five unique Chinese SEO phrases and five unique English SEO phrases.',
          'When marketingFit is false, return empty arrays for categories and both SEO tag fields.',
          'confidence must be between 0 and 1. Base decisions only on supplied metadata and do not invent capabilities.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({ plugins: plugins.map(classificationInput) }),
      },
    ],
  }
  const payload = await requestClassification(request, { apiKey, baseUrl, fetchImpl })
  const content = responseContent(payload)
  const parsed = parseJsonContent(content)
  if (!Array.isArray(parsed.classifications)) {
    throw new Error('LLM response must contain a classifications array')
  }
  const expectedIds = new Set(plugins.map(plugin => plugin.id))
  const seen = new Set()
  const results = parsed.classifications.map((classification) => {
    validateClassification(classification)
    if (!expectedIds.has(classification.id)) throw new Error(`LLM returned unknown plugin id: ${classification.id}`)
    if (seen.has(classification.id)) throw new Error(`LLM returned duplicate plugin id: ${classification.id}`)
    seen.add(classification.id)
    return classification
  })
  const missing = [...expectedIds].filter(id => !seen.has(id))
  if (missing.length > 0) throw new Error(`LLM omitted plugin classifications: ${missing.join(', ')}`)
  return results
}

export function authorDeclaredClassification(plugin) {
  if (!Array.isArray(plugin.marketingCategories)
    || !Array.isArray(plugin.seoTagsZh)
    || !Array.isArray(plugin.seoTagsEn)) return undefined
  const classification = {
    id: plugin.id,
    marketingFit: true,
    marketingCategories: plugin.marketingCategories,
    seoTagsZh: plugin.seoTagsZh,
    seoTagsEn: plugin.seoTagsEn,
    confidence: 1,
    reason: 'The plugin author declared complete marketing catalog metadata.',
  }
  try {
    validateClassification(classification)
    return classification
  } catch {
    return undefined
  }
}

async function requestClassification(request, { apiKey, baseUrl, fetchImpl }) {
  const endpoint = chatCompletionsEndpoint(baseUrl)
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500
        const error = new Error(`LLM request failed with HTTP ${response.status}`)
        if (!retryable || attempt === 3) throw error
        lastError = error
        await delay(attempt * 1000)
        continue
      }
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt === 3 || !isRetryableError(error)) throw error
      await delay(attempt * 1000)
    }
  }
  throw lastError
}

export function validateClassification(value) {
  if (!isPlainObject(value) || !isNonEmptyString(value.id)) throw new Error('classification.id must be a non-empty string')
  if (typeof value.marketingFit !== 'boolean') throw new Error(`${value.id}.marketingFit must be boolean`)
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) {
    throw new Error(`${value.id}.confidence must be between 0 and 1`)
  }
  if (!isNonEmptyString(value.reason)) throw new Error(`${value.id}.reason must be a non-empty string`)
  for (const field of ['marketingCategories', 'seoTagsZh', 'seoTagsEn']) {
    if (!Array.isArray(value[field]) || value[field].some(item => !isNonEmptyString(item))) {
      throw new Error(`${value.id}.${field} must be a string array`)
    }
    if (new Set(value[field]).size !== value[field].length) throw new Error(`${value.id}.${field} contains duplicates`)
  }
  if (!value.marketingFit) {
    if (value.marketingCategories.length || value.seoTagsZh.length || value.seoTagsEn.length) {
      throw new Error(`${value.id} must not include categories or SEO tags when marketingFit is false`)
    }
    return
  }
  if (value.marketingCategories.length < 1 || value.marketingCategories.length > 3) {
    throw new Error(`${value.id}.marketingCategories must contain one to three categories`)
  }
  if (value.marketingCategories.some(category => !MARKETING_CATEGORIES.includes(category))) {
    throw new Error(`${value.id}.marketingCategories contains an unsupported category`)
  }
  if (value.seoTagsZh.length !== 5 || !value.seoTagsZh.every(tag => /[\u3400-\u9fff]/u.test(tag))) {
    throw new Error(`${value.id}.seoTagsZh must contain exactly five Chinese tags`)
  }
  if (value.seoTagsEn.length !== 5 || !value.seoTagsEn.every(tag => /^[\x20-\x7e]+$/u.test(tag))) {
    throw new Error(`${value.id}.seoTagsEn must contain exactly five English tags`)
  }
}

function classificationInput(plugin) {
  return {
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    longDescription: plugin.longDescription,
    tags: plugin.tags,
    usage: plugin.usage,
    hasUI: plugin.hasUI,
    authorMarketingCategories: plugin.marketingCategories,
    authorSeoTagsZh: plugin.seoTagsZh,
    authorSeoTagsEn: plugin.seoTagsEn,
  }
}

function responseContent(payload) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const text = content.map(part => typeof part?.text === 'string' ? part.text : '').join('')
    if (text) return text
  }
  throw new Error('LLM response did not contain message content')
}

function parseJsonContent(content) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    throw new Error('LLM response was not valid JSON')
  }
}

function chatCompletionsEndpoint(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, '')
  return normalized.endsWith('/chat/completions') ? normalized : `${normalized}/chat/completions`
}

function validateConfig({ apiKey, baseUrl, model }) {
  if (!isNonEmptyString(apiKey)) throw new Error('LLM_API_KEY is required')
  if (!isNonEmptyString(baseUrl)) throw new Error('LLM_BASE_URL is required')
  if (!isNonEmptyString(model)) throw new Error('LLM_MODEL is required')
  let url
  try { url = new URL(baseUrl) } catch { throw new Error('LLM_BASE_URL must be a valid URL') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('LLM_BASE_URL must use HTTP or HTTPS')
}

function validateManifestRoot(manifest) {
  if (manifest?.schemaVersion !== '1.0' || !Array.isArray(manifest.plugins)) {
    throw new Error('source must be a Manifest V1 document')
  }
}

function emptyCache() {
  return { schemaVersion: '1.0', classifierVersion: CLASSIFIER_VERSION, entries: {} }
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(resolve(path), 'utf8')) } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    throw error
  }
}

function isRetryableError(error) {
  return error?.name === 'AbortError' || error?.name === 'TimeoutError' || error instanceof TypeError
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function main() {
  const manifest = await readJson(DEFAULT_SOURCE)
  const cache = await readJson(DEFAULT_CACHE, emptyCache())
  const curation = await readJson(DEFAULT_CURATION, { overrides: {} })
  const result = await classifyManifest({
    manifest,
    cache,
    overrides: curation.overrides ?? {},
    apiKey: process.env.LLM_API_KEY,
    baseUrl: process.env.LLM_BASE_URL,
    model: process.env.LLM_MODEL,
  })
  await writeFile(resolve(DEFAULT_CACHE), `${JSON.stringify(result.cache, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(result.summary))
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
