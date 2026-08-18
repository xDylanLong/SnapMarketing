import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateClassification } from './classify-marketing-plugins.mjs'

const DEFAULT_SOURCE = 'packages/plugin-center/registry/plugins.full.json'
const DEFAULT_CACHE = 'packages/plugin-center/registry/classification-cache.json'
const DEFAULT_CURATION = 'packages/plugin-center/registry/curation.json'
const DEFAULT_OUTPUT = 'packages/plugin-center/registry/plugins.json'

export function createMarketingManifest(fullManifest, { classifications = {}, overrides = {} } = {}) {
  if (fullManifest?.schemaVersion !== '1.0' || !Array.isArray(fullManifest.plugins)) {
    throw new Error('source must be a Manifest V1 document')
  }

  const plugins = []
  for (const plugin of fullManifest.plugins) {
    const automatic = classifications[plugin.id]
    const manual = overrides[plugin.id]
    if (automatic === undefined && manual === undefined) continue
    const resolved = { id: plugin.id, ...classificationFields(automatic), ...classificationFields(manual) }
    if (resolved.marketingFit === false) {
      resolved.marketingCategories = []
      resolved.seoTagsZh = []
      resolved.seoTagsEn = []
    }
    validateClassification(resolved)
    if (!resolved.marketingFit) continue
    plugins.push({
      ...plugin,
      marketingCategories: resolved.marketingCategories,
      seoTagsZh: resolved.seoTagsZh,
      seoTagsEn: resolved.seoTagsEn,
    })
  }
  return { ...fullManifest, plugins }
}

export async function buildMarketingManifest({
  source = DEFAULT_SOURCE,
  cache = DEFAULT_CACHE,
  curation = DEFAULT_CURATION,
  output = DEFAULT_OUTPUT,
} = {}) {
  const [fullManifest, classificationCache, curationConfig] = await Promise.all([
    readJson(source),
    readJson(cache, { entries: {} }),
    readJson(curation, { overrides: {} }),
  ])
  const marketingManifest = createMarketingManifest(fullManifest, {
    classifications: classificationCache.entries ?? {},
    overrides: curationConfig.overrides ?? {},
  })
  await writeFile(resolve(output), `${JSON.stringify(marketingManifest, null, 2)}\n`, 'utf8')
  return marketingManifest
}

function classificationFields(value) {
  if (value === undefined) return {}
  const result = {}
  for (const field of ['marketingFit', 'marketingCategories', 'seoTagsZh', 'seoTagsEn', 'confidence', 'reason']) {
    if (value[field] !== undefined) result[field] = value[field]
  }
  result.confidence ??= 1
  result.reason ??= 'Manual catalog override.'
  return result
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(resolve(path), 'utf8')) } catch (error) {
    if (error?.code === 'ENOENT' && fallback !== undefined) return fallback
    throw error
  }
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isEntrypoint) {
  buildMarketingManifest()
    .then(manifest => console.log(`wrote ${manifest.plugins.length} marketing plugins to ${DEFAULT_OUTPUT}`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
