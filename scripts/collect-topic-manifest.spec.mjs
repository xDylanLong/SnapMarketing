import { describe, expect, it } from 'vitest'
import {
  buildManifest,
  candidateToPlugin,
  collectRepositories,
  createEmptyCollectionState,
  parseArguments,
  preserveUpdatedAtWhenUnchanged,
  repositoryToCandidate,
} from './collect-topic-manifest.mjs'

const repository = {
  id: 'R_plugin',
  name: 'dsh-prompt-stash',
  nameWithOwner: 'Wine-Red/dsh-prompt-stash',
  url: 'https://github.com/Wine-Red/dsh-prompt-stash',
  description: 'Local prompt stash for Harness',
  stargazerCount: 1,
  updatedAt: '2026-08-18T12:00:00Z',
  pushedAt: '2026-08-18T11:00:00Z',
  owner: { login: 'Wine-Red', url: 'https://github.com/Wine-Red' },
  repositoryTopics: { nodes: [{ topic: { name: 'dsh-plugin' } }, { topic: { name: 'local-first' } }] },
  packageJson: { oid: 'package-oid', text: JSON.stringify({
    name: 'dsh-prompt-stash',
    version: '0.2.2',
    description: 'Local prompt stash for Harness',
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web' } },
  }) },
}

function graphqlResponse(data) {
  return new Response(JSON.stringify({ data: { ...data, rateLimit: { cost: 1, remaining: 4999 } } }), { status: 200 })
}

function indexConnection(nodes, { totalCount = nodes.length, hasNextPage = false } = {}) {
  return { topic: { repositories: {
    totalCount,
    pageInfo: { hasNextPage, endCursor: hasNextPage ? 'next' : null },
    nodes,
  } } }
}

describe('full topic Manifest collection', () => {
  it('maps repository metadata without contacting npm', () => {
    const candidate = repositoryToCandidate(repository)
    expect(candidate).toMatchObject({ accepted: true, hasUI: true })
    expect(candidateToPlugin(candidate)).toMatchObject({
      id: 'dsh-prompt-stash',
      version: '0.2.2',
      install: { type: 'package', source: 'dsh-prompt-stash' },
      hasUI: true,
      category: 'ui',
    })
    const packageJson = JSON.parse(repository.packageJson.text)
    delete packageJson.version
    const withoutVersion = repositoryToCandidate({ ...repository, packageJson: { oid: 'without-version', text: JSON.stringify(packageJson) } })
    expect(candidateToPlugin(withoutVersion).version).toBe('unknown')
  })

  it('preserves author-declared marketing classification metadata', () => {
    const declared = {
      ...repository,
      packageJson: { oid: 'declared', text: JSON.stringify({
        name: 'dsh-prompt-stash',
        dsh: {
          bundle: { patch: './cordis.patch.yml' },
          pluginCenter: {
            marketingCategories: ['内容营销'],
            seoTagsZh: ['内容营销工具'],
            seoTagsEn: ['content marketing tool'],
          },
        },
      }) },
    }
    expect(candidateToPlugin(repositoryToCandidate(declared))).toMatchObject({
      marketingCategories: ['内容营销'],
      seoTagsZh: ['内容营销工具'],
      seoTagsEn: ['content marketing tool'],
    })
  })

  it('only skips repositories without the required DSH package structure', () => {
    expect(repositoryToCandidate({ ...repository, packageJson: undefined })).toEqual({ accepted: false, reason: 'missing-package-json' })
    expect(repositoryToCandidate({ ...repository, packageJson: { text: '{"name":"game"}' } }))
      .toEqual({ accepted: false, reason: 'missing-dsh-bundle' })
    expect(repositoryToCandidate({
      ...repository,
      packageJson: { text: '{"name":"{{NAME}}","dsh":{"bundle":{"patch":"./patch.yml"}}}' },
    })).toEqual({ accepted: false, reason: 'invalid-package-name' })
  })

  it('supports collection mode, state path, dry-run, and custom output options', () => {
    expect(parseArguments([])).toEqual({
      output: 'packages/plugin-center/registry/plugins.full.json',
      state: 'packages/plugin-center/registry/collection-cache.json',
      mode: 'incremental',
      dryRun: false,
    })
    expect(parseArguments(['--dry-run', '--mode=full', '--state=tmp/state.json', '--output=tmp/plugins.json']))
      .toEqual({ output: 'tmp/plugins.json', state: 'tmp/state.json', mode: 'full', dryRun: true })
    expect(() => parseArguments(['--mode=weekly'])).toThrow(/collection mode/)
  })

  it('does not create a catalog change when only the collection time changed', () => {
    const existing = { schemaVersion: '1.0', updatedAt: '2026-08-17T00:00:00Z', plugins: [{ id: 'same' }] }
    const next = { ...existing, updatedAt: '2026-08-18T00:00:00Z' }
    expect(preserveUpdatedAtWhenUnchanged(next, existing).updatedAt).toBe(existing.updatedAt)
    expect(preserveUpdatedAtWhenUnchanged({ ...next, plugins: [{ id: 'changed' }] }, existing).updatedAt).toBe(next.updatedAt)
  })

  it('uses topic pagination and stops incremental discovery at the cutoff', async () => {
    const cursors = []
    const fetchImpl = async (_url, init) => {
      const { query, variables } = JSON.parse(init.body)
      expect(query).toContain('TopicRepositoryIndex')
      cursors.push(variables.after)
      if (variables.after === null) return graphqlResponse(indexConnection([
        { id: 'new', nameWithOwner: 'o/new', updatedAt: '2026-08-19T00:00:00Z', pushedAt: null },
      ], { totalCount: 3, hasNextPage: true }))
      return graphqlResponse(indexConnection([
        { id: 'old', nameWithOwner: 'o/old', updatedAt: '2026-08-15T00:00:00Z', pushedAt: null },
      ], { totalCount: 3, hasNextPage: true }))
    }
    const result = await collectRepositories({
      token: 'token', mode: 'incremental', cutoff: '2026-08-17T00:00:00Z', fetchImpl, sleepImpl: async () => {},
    })
    expect(result.repositories.map(item => item.id)).toEqual(['new'])
    expect(cursors).toEqual([null, 'next'])
  })

  it('hydrates only changed repositories and never sends an npm request', async () => {
    const existingPlugin = candidateToPlugin(repositoryToCandidate(repository))
    const previousState = {
      schemaVersion: 1,
      watermark: '2026-08-18T00:00:00Z',
      lastFullReconcileAt: '2026-08-17T00:00:00Z',
      repositories: {
        R_plugin: {
          nameWithOwner: repository.nameWithOwner,
          updatedAt: repository.updatedAt,
          pushedAt: repository.pushedAt,
          packageJsonOid: 'package-oid',
          status: 'accepted',
          stars: 1,
          plugin: existingPlugin,
        },
      },
    }
    const changed = { ...repository, id: 'R_new', name: 'dsh-new', nameWithOwner: 'Wine-Red/dsh-new' }
    changed.packageJson = { oid: 'new-oid', text: repository.packageJson.text.replaceAll('dsh-prompt-stash', 'dsh-new') }
    const hydratedIds = []
    const fetchImpl = async (url, init) => {
      expect(url).toBe('https://api.github.com/graphql')
      const { query, variables } = JSON.parse(init.body)
      if (query.includes('TopicRepositoryIndex')) return graphqlResponse(indexConnection([
        { id: repository.id, nameWithOwner: repository.nameWithOwner, updatedAt: repository.updatedAt, pushedAt: repository.pushedAt },
        { id: changed.id, nameWithOwner: changed.nameWithOwner, updatedAt: changed.updatedAt, pushedAt: changed.pushedAt },
      ], { totalCount: 2 }))
      hydratedIds.push(...variables.ids)
      return graphqlResponse({ nodes: [changed] })
    }
    const result = await buildManifest({
      token: 'token', mode: 'incremental', previousState, fetchImpl,
      today: new Date('2026-08-19T00:00:00Z'), sleepImpl: async () => {},
    })
    expect(hydratedIds).toEqual(['R_new'])
    expect(result.manifest.plugins.map(plugin => plugin.id)).toEqual(['dsh-new', 'dsh-prompt-stash'])
    expect(result.summary).toMatchObject({ effectiveMode: 'incremental', hydratedRepositories: 1, catalogPlugins: 2 })
  })

  it('bootstraps with a full scan and removes repositories missing during full reconciliation', async () => {
    const staleState = createEmptyCollectionState()
    staleState.watermark = '2026-08-18T00:00:00Z'
    staleState.repositories.R_stale = {
      nameWithOwner: 'o/stale', updatedAt: '2026-08-10T00:00:00Z', pushedAt: null,
      status: 'skipped', reason: 'missing-package-json',
    }
    const fetchImpl = async (_url, init) => {
      const { query } = JSON.parse(init.body)
      if (query.includes('TopicRepositoryIndex')) return graphqlResponse(indexConnection([
        { id: repository.id, nameWithOwner: repository.nameWithOwner, updatedAt: repository.updatedAt, pushedAt: repository.pushedAt },
      ]))
      return graphqlResponse({ nodes: [repository] })
    }
    const result = await buildManifest({
      token: 'token', mode: 'full', previousState: staleState, fetchImpl,
      today: new Date('2026-08-19T00:00:00Z'), sleepImpl: async () => {},
    })
    expect(result.collectionState.repositories).not.toHaveProperty('R_stale')
    expect(result.collectionState.repositories).toHaveProperty('R_plugin')
    expect(result.collectionState.lastFullReconcileAt).toBe('2026-08-19T00:00:00Z')
  })
})
