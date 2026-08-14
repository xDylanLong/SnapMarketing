import { describe, expect, it } from 'vitest'
import { buildDevCommands, resolveDevConfig } from './dev.mjs'

describe('resolveDevConfig', () => {
  it('uses the sibling Harness checkout and project-local debug home by default', () => {
    const config = resolveDevConfig({ env: {}, repoRoot: '/work/SnapMarketing' })
    expect(config.harnessRoot).toBe('/work/ChatGPT/deepseek-harness-demo')
    expect(config.dshHome).toBe('/work/SnapMarketing/.dev/dsh-home')
    expect(config.skipHarnessBuild).toBe(false)
  })

  it('allows environment overrides and the Harness build skip flag', () => {
    const config = resolveDevConfig({
      env: {
        DSH_ROOT: '/tmp/harness',
        DSH_HOME: '/tmp/dsh-home',
        DSH_SKIP_HARNESS_BUILD: '1',
      },
      repoRoot: '/work/SnapMarketing',
    })
    expect(config.harnessRoot).toBe('/tmp/harness')
    expect(config.dshHome).toBe('/tmp/dsh-home')
    expect(config.skipHarnessBuild).toBe(true)
  })
})

describe('buildDevCommands', () => {
  it('prepares the linked web profile and starts both live processes', () => {
    const commands = buildDevCommands({
      repoRoot: '/work/SnapMarketing',
      harnessRoot: '/work/ChatGPT/deepseek-harness-demo',
      dshHome: '/work/SnapMarketing/.dev/dsh-home',
      skipHarnessBuild: false,
    })
    expect(commands.prepare).toEqual([
      { cwd: '/work/SnapMarketing', argv: ['build'] },
      { cwd: '/work/ChatGPT/deepseek-harness-demo', argv: ['run', 'build'] },
      {
        cwd: '/work/ChatGPT/deepseek-harness-demo',
        argv: ['dsh', 'plugin', '--profile', 'web', 'add', 'link:/work/SnapMarketing'],
      },
    ])
    expect(commands.watch).toEqual({ cwd: '/work/SnapMarketing', argv: ['--filter', '@snapmarketing/dsh-plugin-center', 'exec', 'tsdown', '--watch'] })
    expect(commands.web).toEqual({ cwd: '/work/ChatGPT/deepseek-harness-demo', argv: ['dsh', '--profile', 'web'] })
  })

  it('does not include the Harness build when explicitly skipped', () => {
    const commands = buildDevCommands({
      repoRoot: '/work/SnapMarketing',
      harnessRoot: '/work/ChatGPT/deepseek-harness-demo',
      dshHome: '/tmp/dsh-home',
      skipHarnessBuild: true,
    })
    expect(commands.prepare.map(command => command.argv)).toEqual([
      ['build'],
      ['dsh', 'plugin', '--profile', 'web', 'add', 'link:/work/SnapMarketing'],
    ])
  })
})
