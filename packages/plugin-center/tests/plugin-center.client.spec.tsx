import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { PluginCenterTab } from '../src/client/PluginCenterTab.tsx'
import type { PluginCenterTabInjected } from '../src/client/PluginCenterTab.tsx'
import { TYPERT_REMOTE } from '../src/remote.ts'
import type { PluginCenterSnapshot } from '../src/types.ts'

const snapshot: PluginCenterSnapshot = {
  manifest: {
    schemaVersion: '1.0', updatedAt: '2026-08-14T00:00:00Z', plugins: [{
      id: 'search', name: 'Search', description: 'Search capability.',
      longDescription: 'Adds search tools.', author: { name: 'Example', url: 'https://github.com/example' },
      repository: 'https://github.com/example/search', version: '0.1.0',
      install: { type: 'package', source: '@example/search' }, hasUI: false, category: 'capability', tags: ['research'],
    }],
  },
  installed: [],
}

function renderTab(overrides: Partial<PluginCenterTabInjected> = {}) {
  const props = {
    load: vi.fn().mockResolvedValue(snapshot),
    install: vi.fn().mockResolvedValue({ pluginId: 'search', status: 'installed', needsReload: true, message: 'installed' }),
    uninstall: vi.fn().mockResolvedValue({ pluginId: 'search', status: 'removed', needsReload: true, message: 'removed' }),
    ...overrides,
  } as unknown as ComponentProps<typeof PluginCenterTab>
  render(<PluginCenterTab {...props} />)
  return props
}

describe('PluginCenterTab', () => {
  it('loads, categorizes, searches, and installs catalog entries', async () => {
    const props = renderTab()
    await waitFor(() => expect(screen.getByText('Search')).toBeTruthy())
    expect(screen.getByRole('heading', { name: 'Snap Plugin Marketing' })).toBeTruthy()
    expect(screen.getByText('能力插件 · v0.1.0')).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } })
    expect(screen.getByText('没有匹配的插件。')).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'search' } })
    fireEvent.click(screen.getByRole('button', { name: '安装' }))
    await waitFor(() => expect(props.install).toHaveBeenCalledWith('search'))
    expect(await screen.findByText(/需要刷新 Harness/)).toBeTruthy()
  })
})

describe('plugin center client entry', () => {
  it('mounts its own Remote contribution before publishing the settings slot', async () => {
    const disposeRemote = vi.fn().mockResolvedValue(undefined)
    const mount = vi.fn().mockResolvedValue(disposeRemote)
    const injectSlot = vi.fn()
    const ctx = {
      remote: { $mount: mount },
      get: vi.fn().mockReturnValue({
        catalog: vi.fn(),
        installed: vi.fn(),
        installPlugin: vi.fn(),
        uninstallPlugin: vi.fn(),
      }),
      slots: { inject: injectSlot },
    } as never

    const dispose = await apply(ctx)

    expect(inject).toEqual(['slots', 'remote'])
    expect(mount).toHaveBeenCalledWith(TYPERT_REMOTE)
    expect(injectSlot).toHaveBeenCalledWith('settings.plugins.tab', expect.any(Function))
    await dispose?.()
    expect(disposeRemote).toHaveBeenCalledOnce()
  })
})
