import { describe, expect, it } from 'vitest'
import {
  buildManifest,
  candidateToPlugin,
  collectRepositories,
  parseArguments,
  repositoryToCandidate,
} from './collect-topic-manifest.mjs'

const repository = {
  name: 'dsh-prompt-stash',
  nameWithOwner: 'Wine-Red/dsh-prompt-stash',
  url: 'https://github.com/Wine-Red/dsh-prompt-stash',
  description: 'Local prompt stash for Harness',
  stargazerCount: 1,
  owner: { login: 'Wine-Red', url: 'https://github.com/Wine-Red' },
  repositoryTopics: { nodes: [{ topic: { name: 'dsh-plugin' } }, { topic: { name: 'local-first' } }] },
  packageJson: { text: JSON.stringify({
    name: 'dsh-prompt-stash',
    description: 'Local prompt stash for Harness',
    repository: { url: 'https://github.com/other/repository' },
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web' } },
  }) },
}

describe('full topic Manifest collection', () => {
  it('accepts every mechanically installable DSH package without reviewed metadata', () => {
    const candidate = repositoryToCandidate(repository)
    expect(candidate).toMatchObject({ accepted: true, hasUI: true })
    expect(candidateToPlugin(candidate, { version: '0.2.2' })).toMatchObject({
      id: 'dsh-prompt-stash',
      install: { type: 'package', source: 'dsh-prompt-stash' },
      hasUI: true,
      category: 'ui',
    })
  })

  it('only skips repositories that cannot produce an installable DSH package', () => {
    expect(repositoryToCandidate({ ...repository, packageJson: undefined })).toEqual({
      accepted: false,
      reason: 'missing-package-json',
    })
    expect(repositoryToCandidate({ ...repository, packageJson: { text: '{"name":"game"}' } })).toEqual({
      accepted: false,
      reason: 'missing-dsh-bundle',
    })
    expect(repositoryToCandidate({
      ...repository,
      packageJson: { text: '{"name":"{{NAME}}","dsh":{"bundle":{"patch":"./patch.yml"}}}' },
    })).toEqual({
      accepted: false,
      reason: 'invalid-package-name',
    })
  })

  it('supports dry-run and custom output options without a collection limit', () => {
    expect(parseArguments([])).toEqual({
      output: 'packages/plugin-center/registry/plugins.full.json',
      dryRun: false,
    })
    expect(parseArguments(['--dry-run', '--output=tmp/plugins.json']))
      .toEqual({ output: 'tmp/plugins.json', dryRun: true })
    expect(() => parseArguments(['--limit=50'])).toThrow(/unknown argument/)
  })

  it('splits searches that exceed GitHub Search\'s 1000-result window', async () => {
    const queries = []
    const fetchImpl = async (_url, init) => {
      const variables = JSON.parse(init.body).variables
      queries.push(variables.query)
      const whole = variables.query.includes('created:2008-01-01T00:00:00Z..2026-08-14T00:00:00Z')
      const name = variables.query.includes('created:2008-01-01T00:00:00Z..') ? 'left/plugin' : 'right/plugin'
      return new Response(JSON.stringify({ data: { search: {
        repositoryCount: whole ? 1001 : 1,
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: whole ? [] : [{ nameWithOwner: name }],
      } } }), { status: 200 })
    }
    const result = await collectRepositories(
      'token',
      fetchImpl,
      new Date('2026-08-14T00:00:00Z'),
      async () => {},
    )
    expect(result.map(item => item.nameWithOwner)).toEqual(['left/plugin', 'right/plugin'])
    expect(queries).toHaveLength(3)
  })

  it('fails instead of silently omitting packages after repeated npm errors', async () => {
    let npmAttempts = 0
    const fetchImpl = async (url) => {
      if (url === 'https://api.github.com/graphql') {
        return new Response(JSON.stringify({ data: { search: {
          repositoryCount: 1,
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [repository],
        } } }), { status: 200 })
      }
      npmAttempts += 1
      return new Response('unavailable', { status: 503 })
    }
    await expect(buildManifest({
      token: 'token',
      fetchImpl,
      today: new Date('2026-08-14T00:00:00Z'),
      sleepImpl: async () => {},
    })).rejects.toThrow('dsh-prompt-stash (npm registry request failed with HTTP 503)')
    expect(npmAttempts).toBe(5)
  })
})
