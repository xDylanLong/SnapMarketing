import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GRAPHQL_URL = 'https://api.github.com/graphql'
const NPM_REGISTRY_URL = 'https://registry.npmjs.org'
const DEFAULT_OUTPUT = 'packages/plugin-center/registry/plugins.full.json'
const FIRST_GITHUB_TIMESTAMP = '2008-01-01T00:00:00Z'
const GITHUB_SEARCH_LIMIT = 1000
const PAGE_SIZE = 50
const NPM_CONCURRENCY = 4
const NPM_PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

const QUERY = `
  query TopicRepositories($query: String!, $first: Int!, $after: String) {
    search(query: $query, type: REPOSITORY, first: $first, after: $after) {
      repositoryCount
      pageInfo { hasNextPage endCursor }
      nodes {
        ... on Repository {
          name
          nameWithOwner
          url
          description
          stargazerCount
          owner { login url }
          repositoryTopics(first: 30) { nodes { topic { name } } }
          packageJson: object(expression: "HEAD:package.json") { ... on Blob { text } }
        }
      }
    }
  }
`

export function parseArguments(args) {
  const options = { output: DEFAULT_OUTPUT, dryRun: false }
  for (const argument of args) {
    if (argument === '--dry-run') options.dryRun = true
    else if (argument.startsWith('--output=')) options.output = argument.slice('--output='.length)
    else throw new Error(`unknown argument: ${argument}`)
  }
  return options
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
  if (!NPM_PACKAGE_NAME.test(packageJson.name)) return { accepted: false, reason: 'invalid-package-name' }
  if (!isNonEmptyString(packageJson.dsh?.bundle?.patch)) {
    return { accepted: false, reason: 'missing-dsh-bundle' }
  }

  const metadata = isPlainObject(packageJson.dsh.pluginCenter) ? packageJson.dsh.pluginCenter : {}
  const hasUI = typeof metadata.hasUI === 'boolean' ? metadata.hasUI : packageJson.dsh.client !== undefined
  const description = firstString(metadata.description, packageJson.description, repository.description)
    ?? humanize(repository.name)
  return { accepted: true, repository, packageJson, metadata, hasUI, description }
}

export function candidateToPlugin(candidate, npmPackage) {
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
    version: npmPackage.version,
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

async function fetchRepositoryPage(token, searchQuery, after, fetchImpl, sleepImpl) {
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
        body: JSON.stringify({ query: QUERY, variables: { query: searchQuery, first: PAGE_SIZE, after } }),
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error(`GitHub GraphQL request failed with HTTP ${response.status}`)
      const payload = await response.json()
      if (payload.errors?.length) throw new Error(`GitHub GraphQL error: ${payload.errors[0].message}`)
      return payload.data.search
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleepImpl(attempt * 500)
    }
  }
  throw lastError
}

async function collectTimeRange(token, startTime, endTime, fetchImpl, sleepImpl) {
  const searchQuery = `topic:dsh-plugin fork:true created:${startTime}..${endTime}`
  const firstPage = await fetchRepositoryPage(token, searchQuery, null, fetchImpl, sleepImpl)
  if (firstPage.repositoryCount > GITHUB_SEARCH_LIMIT) {
    if (startTime === endTime) {
      throw new Error(`GitHub Search returned more than ${GITHUB_SEARCH_LIMIT} repositories created at ${startTime}`)
    }
    const midpoint = midpointTimestamp(startTime, endTime)
    const left = await collectTimeRange(token, startTime, midpoint, fetchImpl, sleepImpl)
    const right = await collectTimeRange(token, addSeconds(midpoint, 1), endTime, fetchImpl, sleepImpl)
    return [...left, ...right]
  }

  const repositories = firstPage.nodes.filter(Boolean)
  let pageInfo = firstPage.pageInfo
  while (pageInfo.hasNextPage) {
    const page = await fetchRepositoryPage(token, searchQuery, pageInfo.endCursor, fetchImpl, sleepImpl)
    repositories.push(...page.nodes.filter(Boolean))
    pageInfo = page.pageInfo
  }
  return repositories
}

export async function collectRepositories(token, fetchImpl = fetch, today = new Date(), sleepImpl = delay) {
  const repositories = await collectTimeRange(
    token,
    FIRST_GITHUB_TIMESTAMP,
    timestamp(today),
    fetchImpl,
    sleepImpl,
  )
  return [...new Map(repositories.map(repository => [repository.nameWithOwner, repository])).values()]
}

async function fetchPublishedPackage(packageName, fetchImpl, sleepImpl) {
  let lastError
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetchImpl(`${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}/latest`, {
        headers: { accept: 'application/json', 'user-agent': 'SnapMarketing-Manifest-Collector/0.1' },
        signal: AbortSignal.timeout(10_000),
      })
      if (response.status === 404) return undefined
      if (!response.ok) throw new Error(`npm registry request failed with HTTP ${response.status}`)
      const result = await response.json()
      return result.name === packageName && isNonEmptyString(result.version) ? result : undefined
    } catch (error) {
      lastError = error
      if (attempt < 5) await sleepImpl(attempt * 1000)
    }
  }
  throw lastError
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

export async function buildManifest({
  token,
  fetchImpl = fetch,
  today = new Date(),
  sleepImpl = delay,
  onProgress,
}) {
  if (!token) throw new Error('GITHUB_TOKEN is required to collect the dsh-plugin topic')
  const repositories = await collectRepositories(token, fetchImpl, today, sleepImpl)
  onProgress?.(`collected ${repositories.length} topic repositories`)

  const skipped = new Map()
  const candidates = []
  for (const repository of repositories) {
    const result = repositoryToCandidate(repository)
    if (result.accepted) candidates.push(result)
    else skipped.set(result.reason, (skipped.get(result.reason) ?? 0) + 1)
  }
  onProgress?.(`checking ${candidates.length} installable candidates on npm`)

  const checked = await mapWithConcurrency(candidates, NPM_CONCURRENCY, async (candidate) => {
    try {
      const npmPackage = await fetchPublishedPackage(candidate.packageJson.name, fetchImpl, sleepImpl)
      if (!npmPackage) return { accepted: false, reason: 'not-published-to-npm' }
      return { accepted: true, plugin: candidateToPlugin(candidate, npmPackage), stars: candidate.repository.stargazerCount }
    } catch (error) {
      return { accepted: false, reason: 'npm-check-failed', packageName: candidate.packageJson.name, error }
    }
  })
  const failedChecks = checked.filter(result => result.reason === 'npm-check-failed')
  if (failedChecks.length > 0) {
    throw new AggregateError(
      failedChecks.map(result => result.error),
      `${failedChecks.length} npm package checks failed after retries: ${failedChecks
        .map(result => `${result.packageName} (${errorMessage(result.error)})`)
        .join(', ')}; catalog was not written`,
    )
  }

  const accepted = checked.filter(result => result.accepted)
  for (const result of checked.filter(result => !result.accepted)) {
    skipped.set(result.reason, (skipped.get(result.reason) ?? 0) + 1)
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

  return {
    manifest: { schemaVersion: '1.0', updatedAt: new Date().toISOString(), plugins },
    summary: {
      topicRepositories: repositories.length,
      installableCandidates: candidates.length,
      publishedPlugins: plugins.length,
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
  const { manifest: collectedManifest, summary } = await buildManifest({
    token: process.env.GITHUB_TOKEN,
    onProgress: message => console.log(message),
  })
  let manifest = collectedManifest
  if (!options.dryRun) {
    const output = resolve(options.output)
    try {
      const existing = JSON.parse(await readFile(output, 'utf8'))
      manifest = preserveUpdatedAtWhenUnchanged(manifest, existing)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    console.log(`wrote ${manifest.plugins.length} plugins to ${options.output}`)
  }
  console.log(JSON.stringify(summary, null, 2))
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

function firstString(...values) {
  return values.find(isNonEmptyString)
}

function stringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString) ? value : undefined
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function timestamp(value) {
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function addSeconds(value, seconds) {
  return timestamp(new Date(new Date(value).getTime() + seconds * 1000))
}

function midpointTimestamp(startTime, endTime) {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  return timestamp(new Date(start + Math.floor((end - start) / 2000) * 1000))
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
