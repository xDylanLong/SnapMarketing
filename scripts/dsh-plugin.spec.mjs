import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPluginCommand, resolvePluginConfig, validateHarnessRoot } from './dsh-plugin.mjs'

const fixtureRepoRoot = resolve('/work/dsh-snapmarketing')
const fixtureHarnessRoot = resolve('/work/ChatGPT/deepseek-harness-demo')

describe('resolvePluginConfig', () => {
  it('uses the sibling Harness checkout and current plugin root by default', () => {
    const config = resolvePluginConfig({ env: {}, repoRoot: fixtureRepoRoot })

    expect(config.repoRoot).toBe(fixtureRepoRoot)
    expect(config.harnessRoot).toBe(fixtureHarnessRoot)
    expect(config.pluginRoot).toBe(join(fixtureRepoRoot, 'packages', 'plugin-center'))
    expect(config.env.DSH_HOME).toBe(join(tmpdir(), 'dsh-snapmarketing-dsh-home'))
  })

  it('allows the Harness checkout to be overridden', () => {
    const config = resolvePluginConfig({
      env: { DSH_ROOT: '/tmp/harness', DSH_HOME: '/tmp/dsh-home' },
      repoRoot: fixtureRepoRoot,
    })

    expect(config.harnessRoot).toBe(resolve('/tmp/harness'))
    expect(config.env.DSH_HOME).toBe(resolve('/tmp/dsh-home'))
  })
})

describe('buildPluginCommand', () => {
  it('adds the current project plugin without a package-name argument', () => {
    expect(buildPluginCommand('add', {
      repoRoot: fixtureRepoRoot,
      harnessRoot: fixtureHarnessRoot,
      pluginRoot: join(fixtureRepoRoot, 'packages', 'plugin-center'),
    })).toEqual({
      cwd: fixtureHarnessRoot,
      argv: [
        'dsh', 'plugin', '--profile', 'web', 'add',
        `link:${join(fixtureRepoRoot, 'packages', 'plugin-center')}`,
      ],
    })
  })

  it('removes the fixed current project plugin without a package-name argument', () => {
    expect(buildPluginCommand('remove', {
      repoRoot: fixtureRepoRoot,
      harnessRoot: fixtureHarnessRoot,
      pluginRoot: join(fixtureRepoRoot, 'packages', 'plugin-center'),
    })).toEqual({
      cwd: fixtureHarnessRoot,
      argv: ['dsh', 'plugin', '--profile', 'web', 'remove', '@snapmarketing/dsh-plugin-center'],
    })
  })

  it('rejects an unknown action', () => {
    expect(() => buildPluginCommand('update', {
      repoRoot: fixtureRepoRoot,
      harnessRoot: fixtureHarnessRoot,
      pluginRoot: join(fixtureRepoRoot, 'packages', 'plugin-center'),
    })).toThrow('Unsupported DSH plugin action "update"')
  })
})

describe('validateHarnessRoot', () => {
  it('accepts a Harness checkout with the required CLI files', () => {
    const harnessRoot = mkdtempSync(join(tmpdir(), 'dsh-snapmarketing-dsh-plugin-'))
    mkdirSync(join(harnessRoot, 'apps', 'cli', 'src'), { recursive: true })
    writeFileSync(join(harnessRoot, 'package.json'), '{}')
    writeFileSync(join(harnessRoot, 'apps', 'cli', 'src', 'bin.ts'), '')

    expect(() => validateHarnessRoot(harnessRoot)).not.toThrow()
  })

  it('rejects a missing checkout with DSH_ROOT guidance', () => {
    expect(() => validateHarnessRoot('/tmp/not-a-dsh-checkout')).toThrow(
      /Harness checkout not found.*Set DSH_ROOT to the deepseek-harness checkout\./,
    )
  })
})
