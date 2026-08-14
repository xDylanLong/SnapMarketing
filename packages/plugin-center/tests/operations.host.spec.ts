import { describe, expect, it, vi } from 'vitest'
import { PluginOperationCoordinator } from '../src/operations.ts'
import type { HarnessPluginInstaller, PluginManifest } from '../src/types.ts'

const manifest: PluginManifest = {
  schemaVersion: '1.0',
  updatedAt: '2026-08-14T00:00:00Z',
  plugins: [
    {
      id: 'ui-plugin', name: 'UI Plugin', description: 'UI.',
      author: { name: 'Example', url: 'https://github.com/example' },
      repository: 'https://github.com/example/ui-plugin', version: '1.0.0',
      install: { type: 'package', source: '@example/ui-plugin' }, hasUI: true, category: 'ui',
    },
    {
      id: 'capability-plugin', name: 'Capability Plugin', description: 'Capability.',
      author: { name: 'Example', url: 'https://github.com/example' },
      repository: 'https://github.com/example/capability-plugin', version: '1.0.0',
      install: { type: 'package', source: '@example/capability-plugin' }, hasUI: false, category: 'capability',
    },
  ],
}

function setup() {
  const installer: HarnessPluginInstaller = {
    install: vi.fn(async () => ({ ok: true })),
    uninstall: vi.fn(async () => ({ ok: true })),
  }
  return { installer, coordinator: new PluginOperationCoordinator(async () => manifest, installer) }
}

describe('PluginOperationCoordinator', () => {
  it('never passes an unknown browser id to the installer', async () => {
    const { coordinator, installer } = setup()
    await expect(coordinator.install('unknown')).resolves.toMatchObject({ status: 'failed' })
    expect(installer.install).not.toHaveBeenCalled()
  })

  it('passes only the exact allowlisted package source', async () => {
    const { coordinator, installer } = setup()
    await coordinator.install('ui-plugin')
    expect(installer.install).toHaveBeenCalledWith('@example/ui-plugin')
  })

  it('deduplicates concurrent operations for one plugin', async () => {
    const { coordinator, installer } = setup()
    await Promise.all([coordinator.install('ui-plugin'), coordinator.install('ui-plugin')])
    expect(installer.install).toHaveBeenCalledTimes(1)
  })

  it('preserves installer failures and explains capability activation', async () => {
    const { coordinator, installer } = setup()
    vi.mocked(installer.install).mockResolvedValueOnce({ ok: false, message: 'registry unavailable' })
    await expect(coordinator.install('ui-plugin')).resolves.toMatchObject({
      status: 'failed', message: 'registry unavailable', needsReload: false,
    })
    await expect(coordinator.install('capability-plugin')).resolves.toMatchObject({
      status: 'installed', needsReload: true, message: expect.stringContaining('没有独立界面'),
    })
  })

  it('turns an adapter exception into a failed operation result', async () => {
    const { coordinator, installer } = setup()
    vi.mocked(installer.install).mockRejectedValueOnce(new Error('adapter crashed'))
    await expect(coordinator.install('ui-plugin')).resolves.toMatchObject({
      status: 'failed', needsReload: false, message: 'adapter crashed',
    })
  })
})
