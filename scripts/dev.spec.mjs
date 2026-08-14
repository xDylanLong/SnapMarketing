import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildDevCommands, resolveDevConfig } from './dev.mjs'

const fixtureRepoRoot = resolve('/work/SnapMarketing')
const fixtureHarnessRoot = resolve('/work/ChatGPT/deepseek-harness-demo')

describe('resolveDevConfig', () => {
  it('locates the repository root when called without options', () => {
    expect(resolveDevConfig().repoRoot).toBe(process.cwd())
  })

  it('uses the sibling Harness checkout and project-local debug home by default', () => {
    const config = resolveDevConfig({ env: {}, repoRoot: fixtureRepoRoot })
    expect(config.harnessRoot).toBe(fixtureHarnessRoot)
    expect(config.dshHome).toBe(join(tmpdir(), 'snapmarketing-dsh-home'))
    expect(config.webPort).toBe('3081')
    expect(config.skipHarnessBuild).toBe(false)
  })

  it('allows environment overrides and the Harness build skip flag', () => {
    const config = resolveDevConfig({
      env: {
        DSH_ROOT: resolve('/tmp/harness'),
        DSH_HOME: resolve('/tmp/dsh-home'),
        DSH_PORT: '4099',
        DSH_SKIP_HARNESS_BUILD: '1',
      },
      repoRoot: fixtureRepoRoot,
    })
    expect(config.harnessRoot).toBe(resolve('/tmp/harness'))
    expect(config.dshHome).toBe(resolve('/tmp/dsh-home'))
    expect(config.webPort).toBe('4099')
    expect(config.skipHarnessBuild).toBe(true)
  })

  it('rejects an invalid Web port before starting any process', () => {
    expect(() => resolveDevConfig({ env: { DSH_PORT: '70000' }, repoRoot: fixtureRepoRoot }))
      .toThrow('Invalid DSH_PORT "70000"')
  })
})

describe('buildDevCommands', () => {
  it('prepares the linked web profile and starts both live processes', () => {
    const commands = buildDevCommands({
      repoRoot: fixtureRepoRoot,
      harnessRoot: fixtureHarnessRoot,
      dshHome: join(fixtureRepoRoot, '.dev', 'dsh-home'),
      webPort: '3081',
      skipHarnessBuild: false,
    })
    expect(commands.prepare).toEqual([
      { cwd: fixtureRepoRoot, argv: ['build'] },
      { cwd: fixtureHarnessRoot, argv: ['run', 'build'] },
      {
        cwd: fixtureHarnessRoot,
        argv: ['dsh', 'plugin', '--profile', 'web', 'add', `link:${join(fixtureRepoRoot, 'packages', 'plugin-center')}`],
      },
    ])
    expect(commands.watch).toEqual({ cwd: fixtureRepoRoot, argv: ['--filter', '@snapmarketing/dsh-plugin-center', 'exec', 'tsdown', '--watch'] })
    expect(commands.web).toEqual({ cwd: fixtureHarnessRoot, argv: ['dsh', '--profile', 'web', '--port', '3081'] })
  })

  it('does not include the Harness build when explicitly skipped', () => {
    const commands = buildDevCommands({
      repoRoot: fixtureRepoRoot,
      harnessRoot: fixtureHarnessRoot,
      dshHome: resolve('/tmp/dsh-home'),
      webPort: '3081',
      skipHarnessBuild: true,
    })
    expect(commands.prepare.map(command => command.argv)).toEqual([
      ['build'],
      ['dsh', 'plugin', '--profile', 'web', 'add', `link:${join(fixtureRepoRoot, 'packages', 'plugin-center')}`],
    ])
  })
})
