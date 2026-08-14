import { describe, expect, it, vi } from 'vitest'
import { createDshCliInstaller } from '../src/installer.ts'

describe('createDshCliInstaller', () => {
  it('exposes the profile-aware Harness command contract', () => {
    const installer = createDshCliInstaller({ command: process.execPath, profile: 'web' })
    expect(installer.install).toBeTypeOf('function')
    expect(installer.uninstall).toBeTypeOf('function')
  })

  it('preserves a command failure as a failed operation result', async () => {
    const installer = createDshCliInstaller({ command: process.execPath, profile: 'web' })
    const result = await installer.install('--definitely-not-a-node-script')
    expect(result.ok).toBe(false)
    expect(result.message).toBeTruthy()
  })

  it('prepends fixed launcher arguments before the Harness plugin command', async () => {
    const installer = createDshCliInstaller({
      command: process.execPath,
      commandArgs: ['-e', 'process.stdout.write(process.argv.slice(1).join("|"))'],
      profile: 'web',
    })
    await expect(installer.install('@example/plugin')).resolves.toMatchObject({
      ok: true,
      stdout: 'plugin|--profile|web|add|@example/plugin',
    })
  })
})
