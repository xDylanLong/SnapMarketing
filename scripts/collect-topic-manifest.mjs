import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GRAPHQL_URL = 'https://api.github.com/graphql'
const DEFAULT_OUTPUT = 'packages/plugin-center/registry/plugins.full.json'
const DEFAULT_STATE = 'packages/plugin-center/registry/collection-cache.json'
const PAGE_SIZE = 100
const HYDRATE_BATCH_SIZE = 50
const HYDRATE_CONCURRENCY = 3
const OVERLAP_MILLISECONDS = 48 * 60 * 60 * 1000
const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

const INDEX_QUERY = `
  query TopicRepositoryIndex($first: Int!, $after: String) {
    topic(name: "dsh-plugin") {
      repositories(first: $first, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { id nameWithOwner updatedAt pushedAt }
      }
    }
    rateLimit { cost remaining resetAt }
  }
`

const HYDRATE_QUERY = `
  query HydrateTopicRepositories($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Repository {
        id
        name
        nameWithOwner
        url
        description
        stargazerCount
        updatedAt
        pushedAt
        owner { login url }
        repositoryTopics(first: 30) { nodes { topic { name } } }
        packageJson: object(expression: "HEAD:package.json") { ... on Blob { oid text } }
      }
    }
    rateLimit { cost remaining resetAt }
  }
`

export function parseArguments(args) {
  const options = { output: DEFAULT_OUTPUT, state: DEFAULT_STATE, mode: 'incremental', dryRun: false }
  for (const argument of args) {
    if (argument === '--dry-run') options.dryRun = true
    else if (argument.startsWith('--output=')) options.output = argument.slice('--output='.length)
    else if (argument.startsWith('--state=')) options.state = argument.slice('--state='.length)
    else if (argument.startsWith('--mode=')) options.mode = parseMode(argument.slice('--mode='.length))
    else throw new Error(`unknown argument: ${argument}`)
  }
  return options
}

export function createEmptyCollectionState() {
  return { schemaVersion: 1, watermark: null, lastFullReconcileAt: null, repositories: {} }
}

export function normalizeCollectionState(value) {
  if (value?.schemaVersion !== 1 || !isPlainObject(value.repositories)) return createEmptyCollectionState()
  return {
    schemaVersion: 1,
    watermark: isTimestamp(value.watermark) ? value.watermark : null,
    lastFullReconcileAt: isTimestamp(value.lastFullReconcileAt) ? value.lastFullReconcileAt : null,
    repositories: value.repositories,
  }
}

export function repositoryToCandidate(repository) {
  if (!repository.packageJson?.text) return { accepted: false, reason: 'missing-package-json' }
  let packageJson
  try {
    packageJson = JSON.parse(repository.packageJson.text)
  } catch {
    return { accepted: false, reason: 'invalid-package-json' }
  }
  if (!isNonEmptyString(packageJson.name)) return { accepted: false, reason: 'missing-package-name' }
  if (!PACKAGE_NAME_PATTERN.test(packageJson.name)) return { accepted: false, reason: 'invalid-package-name' }
  if (!isNonEmptyString(packageJson.dsh?.bundle?.patch)) return { accepted: false, reason: 'missing-dsh-bundle' }

  const metadata = isPlainObject(packageJson.dsh.pluginCenter) ? packageJson.dsh.pluginCenter : {}
  const hasUI = typeof metadata.hasUI === 'boolean' ? metadata.hasUI : packageJson.dsh.client !== undefined
  const description = firstString(metadata.description, packageJson.description, repository.description)
    ?? humanize(repository.name)
  return { accepted: true, repository, packageJson, metadata, hasUI, description }
}

export function candidateToPlugin(candidate) {
  const { repository, packageJson, metadata, hasUI, description } = candidate
  const topics = repository.repositoryTopics.nodes.map(node => node.topic.name)
  const tags = stringArray(metadata.tags) ?? topics
    .filter(topic => !['dsh-plugin', 'dsh-plugins', 'dsh', 'deepseek-harness', 'plugin'].includes(topic))
    .slice(0, 8)
  const plugin = {
    id: pluginId(packageJson.name),
    name: firstString(metadata.name, humanize(repository.name)),
    description,
    author: { name: repository.owner.login, url: repository.owner.url },
    repository: repository.url,
    version: firstString(packageJson.version) ?? 'unknown',
    install: { type: 'package', source: packageJson.name },
    hasUI,
    category: hasUI ? 'ui' : 'capability',
  }
  const longDescription = firstString(metadata.longDescription)
  if (longDescription) plugin.longDescription = longDescription
  if (tags.length > 0) plugin.tags = tags
  const marketingCategories = stringArray(metadata.marketingCategories)
  if (marketingCategories?.length) plugin.marketingCategories = marketingCategories
  const seoTagsZh = stringArray(metadata.seoTagsZh)
  if (seoTagsZh?.length) plugin.seoTagsZh = seoTagsZh
  const seoTagsEn = stringArray(metadata.seoTagsEn)
  if (seoTagsEn?.length) plugin.seoTagsEn = seoTagsEn
  if (isHttpsUrl(metadata.icon)) plugin.icon = metadata.icon
  const screenshots = stringArray(metadata.screenshots)?.filter(isHttpsUrl)
  if (screenshots?.length) plugin.screenshots = screenshots
  const usage = normalizeUsage(metadata.usage)
  if (usage) plugin.usage = usage
  const placement = hasUI ? normalizePlacement(metadata.placement) : undefined
  if (placement) plugin.placement = placement
  return plugin
}

async function fetchGraphql(token, query, variables, fetchImpl, sleepImpl, metrics) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': 'SnapMarketing-Manifest-Collector/0.1',
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`GitHub GraphQL request failed with HTTP ${response.status}`)
      const payload = await response.json()
      if (payload.errors?.length) throw new Error(`GitHub GraphQL error: ${payload.errors[0].message}`)
      metrics.requests += 1
      metrics.cost += payload.data.rateLimit?.cost ?? 0
      metrics.remaining = payload.data.rateLimit?.remaining ?? metrics.remaining
      return payload.data
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleepImpl(attempt * 500)
    }
  }
  throw lastError
}

export async function collectRepositories({ token, mode, cutoff, fetchImpl = fetch, sleepImpl = delay, metrics = createMetrics() }) {
  const repositories = []
  let after = null
  let totalCount = 0
  let pages = 0
  while (true) {
    const data = await fetchGraphql(token, INDEX_QUERY, { first: PAGE_SIZE, after }, fetchImpl, sleepImpl, metrics)
    if (!data.topic) throw new Error('GitHub topic "dsh-plugin" was not found')
    const connection = data.topic.repositories
    const nodes = connection.nodes.filter(Boolean)
    totalCount = connection.totalCount
    pages += 1
    if (mode === 'incremental') {
      const current = nodes.filter(repository => !isTimestamp(repository.updatedAt)
        || new Date(repository.updatedAt).getTime() >= new Date(cutoff).getTime())
      repositories.push(...current)
      if (current.length < nodes.length) break
    } else {
      repositories.push(...nodes)
    }
    if (!connection.pageInfo.hasNextPage) break
    after = connection.pageInfo.endCursor
  }
  return { repositories, totalCount, pages }
}

async function hydrateRepositories(token, ids, fetchImpl, sleepImpl, metrics) {
  const batches = []
  for (let index = 0; index < ids.length; index += HYDRATE_BATCH_SIZE) batches.push(ids.slice(index, index + HYDRATE_BATCH_SIZE))
  const results = await mapWithConcurrency(batches, HYDRATE_CONCURRENCY, async (batch) => {
    const data = await fetchGraphql(token, HYDRATE_QUERY, { ids: batch }, fetchImpl, sleepImpl, metrics)
    return data.nodes.filter(Boolean)
  })
  return results.flat()
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await mapper(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

export async function buildManifest({ token, mode = 'incremental', previousState = createEmptyCollectionState(), fetchImpl = fetch, today = new Date(), sleepImpl = delay, onProgress }) {
  if (!token) throw new Error('GITHUB_TOKEN is required to collect the dsh-plugin topic')
  const requestedMode = parseMode(mode)
  const state = normalizeCollectionState(previousState)
  const cachedRecords = Object.values(state.repositories)
  const hasIncrementalBase = state.watermark !== null
    && cachedRecords.length > 0
    && cachedRecords.every(isReusableRecord)
  const effectiveMode = requestedMode === 'full' || !hasIncrementalBase ? 'full' : 'incremental'
  const startedAt = timestamp(today)
  const cutoff = effectiveMode === 'incremental'
    ? timestamp(new Date(new Date(state.watermark).getTime() - OVERLAP_MILLISECONDS))
    : null
  const metrics = createMetrics()
  const discovery = await collectRepositories({ token, mode: effectiveMode, cutoff, fetchImpl, sleepImpl, metrics })
  onProgress?.(`discovery: mode=${effectiveMode}, pages=${discovery.pages}, repositories=${discovery.repositories.length}, topicTotal=${discovery.totalCount}`)

  const nextRecords = effectiveMode === 'full' ? {} : { ...state.repositories }
  const changed = discovery.repositories.filter((repository) => {
    const previous = state.repositories[repository.id]
    return !isReusableRecord(previous)
      || previous.nameWithOwner !== repository.nameWithOwner
      || previous.updatedAt !== repository.updatedAt
      || previous.pushedAt !== repository.pushedAt
  })
  const changedIds = new Set(changed.map(repository => repository.id))
  onProgress?.(`hydration: changed=${changed.length}, reused=${discovery.repositories.length - changed.length}`)
  if (effectiveMode === 'full') {
    for (const repository of discovery.repositories) {
      const previous = state.repositories[repository.id]
      if (isReusableRecord(previous) && !changedIds.has(repository.id)) nextRecords[repository.id] = previous
    }
  }

  const hydrated = await hydrateRepositories(token, changed.map(repository => repository.id), fetchImpl, sleepImpl, metrics)
  const hydratedById = new Map(hydrated.map(repository => [repository.id, repository]))
  for (const lightRepository of changed) {
    const repository = hydratedById.get(lightRepository.id)
    if (!repository) {
      delete nextRecords[lightRepository.id]
      continue
    }
    const result = repositoryToCandidate(repository)
    const base = {
      nameWithOwner: repository.nameWithOwner,
      updatedAt: repository.updatedAt,
      pushedAt: repository.pushedAt,
      packageJsonOid: repository.packageJson?.oid ?? null,
    }
    nextRecords[repository.id] = result.accepted
      ? { ...base, status: 'accepted', stars: repository.stargazerCount, plugin: candidateToPlugin(result) }
      : { ...base, status: 'skipped', reason: result.reason }
  }

  const skipped = new Map()
  const accepted = []
  for (const record of Object.values(nextRecords)) {
    if (record.status === 'accepted') accepted.push({ plugin: record.plugin, stars: record.stars })
    else if (record.status === 'skipped') skipped.set(record.reason, (skipped.get(record.reason) ?? 0) + 1)
  }
  const seen = new Set()
  const plugins = accepted
    .sort((left, right) => right.stars - left.stars || left.plugin.id.localeCompare(right.plugin.id))
    .map(result => result.plugin)
    .filter((plugin) => {
      if (seen.has(plugin.id)) {
        skipped.set('duplicate-plugin-id', (skipped.get('duplicate-plugin-id') ?? 0) + 1)
        return false
      }
      seen.add(plugin.id)
      return true
    })

  const collectionState = {
    schemaVersion: 1,
    watermark: startedAt,
    lastFullReconcileAt: effectiveMode === 'full' ? startedAt : state.lastFullReconcileAt,
    repositories: Object.fromEntries(Object.entries(nextRecords).sort(([left], [right]) => left.localeCompare(right))),
  }
  return {
    manifest: { schemaVersion: '1.0', updatedAt: new Date().toISOString(), plugins },
    collectionState,
    summary: {
      requestedMode,
      effectiveMode,
      topicRepositories: discovery.totalCount,
      discoveredRepositories: discovery.repositories.length,
      hydratedRepositories: hydrated.length,
      cachedRepositories: Object.keys(nextRecords).length,
      catalogPlugins: plugins.length,
      graphqlRequests: metrics.requests,
      graphqlCost: metrics.cost,
      graphqlRemaining: metrics.remaining,
      skipped: Object.fromEntries([...skipped].sort(([left], [right]) => left.localeCompare(right))),
    },
  }
}

export function preserveUpdatedAtWhenUnchanged(nextManifest, existingManifest) {
  if (existingManifest?.schemaVersion === nextManifest.schemaVersion
    && isNonEmptyString(existingManifest.updatedAt)
    && Array.isArray(existingManifest.plugins)
    && JSON.stringify(existingManifest.plugins) === JSON.stringify(nextManifest.plugins)) {
    return { ...nextManifest, updatedAt: existingManifest.updatedAt }
  }
  return nextManifest
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const mode = process.env.CATALOG_COLLECTION_MODE ? parseMode(process.env.CATALOG_COLLECTION_MODE) : options.mode
  const previousState = await readJson(options.state, createEmptyCollectionState())
  const { manifest: collectedManifest, collectionState, summary } = await buildManifest({
    token: process.env.GITHUB_TOKEN,
    mode,
    previousState,
    onProgress: message => console.log(message),
  })
  let manifest = collectedManifest
  if (!options.dryRun) {
    const output = resolve(options.output)
    const stateOutput = resolve(options.state)
    const existing = await readJson(output)
    if (existing) manifest = preserveUpdatedAtWhenUnchanged(manifest, existing)
    await Promise.all([mkdir(dirname(output), { recursive: true }), mkdir(dirname(stateOutput), { recursive: true })])
    await Promise.all([
      writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
      writeFile(stateOutput, `${JSON.stringify(collectionState, null, 2)}\n`, 'utf8'),
    ])
    console.log(`wrote ${manifest.plugins.length} plugins to ${options.output}`)
    console.log(`wrote ${Object.keys(collectionState.repositories).length} repository states to ${options.state}`)
  }
  console.log(JSON.stringify(summary, null, 2))
}

function isReusableRecord(value) {
  return isPlainObject(value)
    && ((value.status === 'accepted' && isPlainObject(value.plugin) && typeof value.stars === 'number')
      || (value.status === 'skipped' && isNonEmptyString(value.reason)))
}

function createMetrics() { return { requests: 0, cost: 0, remaining: null } }

function parseMode(value) {
  if (value === 'incremental' || value === 'full') return value
  throw new Error(`collection mode must be "incremental" or "full", received: ${value}`)
}

function pluginId(packageName) {
  return packageName.replace(/^@/, '').replace('/', '-').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')
}

function humanize(value) {
  return value.split(/[-_]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
}

function normalizeUsage(value) {
  if (!isPlainObject(value) || !isNonEmptyString(value.summary)) return undefined
  const usage = { summary: value.summary }
  const examples = stringArray(value.examples)
  if (examples?.length) usage.examples = examples
  return usage
}

function normalizePlacement(value) {
  if (!isPlainObject(value) || typeof value.enabled !== 'boolean') return undefined
  if (!value.enabled) return { enabled: false }
  const slots = stringArray(value.slots)
  if (!slots?.length || !isNonEmptyString(value.defaultSlot) || !slots.includes(value.defaultSlot)) return undefined
  return { enabled: true, slots, defaultSlot: value.defaultSlot }
}

function firstString(...values) { return values.find(isNonEmptyString) }
function stringArray(value) { return Array.isArray(value) && value.every(isNonEmptyString) ? value : undefined }
function isNonEmptyString(value) { return typeof value === 'string' && value.trim().length > 0 }
function isPlainObject(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) }

function isHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function isTimestamp(value) { return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime()) }
function timestamp(value) { return value.toISOString().replace(/\.\d{3}Z$/, 'Z') }

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(resolve(path), 'utf8')) } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    throw error
  }
}

function delay(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)) }

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
