import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMarketingManifest } from './build-marketing-manifest.mjs'
import { classificationSourceHash, validateClassification } from './classify-marketing-plugins.mjs'

const execFileAsync = promisify(execFile)
const FULL_PATH = 'packages/plugin-center/registry/plugins.full.json'
const PUBLISHED_PATH = 'packages/plugin-center/registry/plugins.json'
const CACHE_PATH = 'packages/plugin-center/registry/classification-cache.json'
const CURATION_PATH = 'packages/plugin-center/registry/curation.json'

export function validateCatalogUpdate({ full, published, cache, curation, previousFull }) {
  validateManifestRoot(full, 'full catalog')
  validateManifestRoot(published, 'published catalog')
  if (published.plugins.length === 0) throw new Error('published catalog must not be empty')
  if (previousFull?.plugins?.length && full.plugins.length < previousFull.plugins.length * 0.9) {
    throw new Error(`full catalog dropped by more than 10%: ${previousFull.plugins.length} -> ${full.plugins.length}`)
  }

  const fullById = new Map(full.plugins.map(plugin => [plugin.id, plugin]))
  const overrides = curation.overrides ?? {}
  const classifications = cache.entries ?? {}
  const unclassified = full.plugins
    .filter(plugin => !Object.hasOwn(overrides, plugin.id) && !Object.hasOwn(classifications, plugin.id))
    .map(plugin => plugin.id)
  if (unclassified.length) throw new Error(`plugins missing classification: ${unclassified.join(', ')}`)

  for (const [id, classification] of Object.entries(classifications)) {
    const plugin = fullById.get(id)
    if (plugin === undefined) throw new Error(`classification cache contains missing plugin: ${id}`)
    validateClassification({ id, ...classification })
    if (classification.sourceHash !== classificationSourceHash(plugin)) {
      throw new Error(`classification cache is stale for plugin: ${id}`)
    }
  }

  const expected = createMarketingManifest(full, { classifications, overrides })
  if (JSON.stringify(expected) !== JSON.stringify(published)) {
    throw new Error('published catalog does not match classifications and manual overrides')
  }
  return {
    fullPlugins: full.plugins.length,
    publishedPlugins: published.plugins.length,
    automaticClassifications: Object.keys(classifications).length,
    manualOverrides: Object.keys(overrides).length,
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'))
}

async function readPreviousFull() {
  try {
    const { stdout } = await execFileAsync('git', ['show', `HEAD:${FULL_PATH}`], { maxBuffer: 10 * 1024 * 1024 })
    return JSON.parse(stdout)
  } catch {
    return undefined
  }
}

function validateManifestRoot(value, label) {
  if (value?.schemaVersion !== '1.0' || !Array.isArray(value.plugins)) {
    throw new Error(`${label} must be a Manifest V1 document`)
  }
  const ids = value.plugins.map(plugin => plugin.id)
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicate plugin ids`)
}

async function main() {
  const [full, published, cache, curation, previousFull] = await Promise.all([
    readJson(FULL_PATH),
    readJson(PUBLISHED_PATH),
    readJson(CACHE_PATH),
    readJson(CURATION_PATH),
    readPreviousFull(),
  ])
  console.log(JSON.stringify(validateCatalogUpdate({ full, published, cache, curation, previousFull })))
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
