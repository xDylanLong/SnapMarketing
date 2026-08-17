import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PluginMetadata } from '@snapmarketing/plugin-manifest'
import { apply, inject } from '../src/client/index.ts'
import { PluginCenterTab } from '../src/client/PluginCenterTab.tsx'
import type { PluginCenterTabInjected } from '../src/client/PluginCenterTab.tsx'
import { TYPERT_REMOTE } from '../src/remote.ts'
import type { PluginCenterSnapshot, PluginOperationResult } from '../src/types.ts'

afterEach(() => { cleanup() })

function makePlugin(index: number, overrides: Partial<PluginMetadata> = {}): PluginMetadata {
  return {
    id: `plugin-${index}`,
    name: `Plugin ${index}`,
    description: `Description ${index}`,
    author: { name: 'Example', url: 'https://github.com/example' },
    repository: `https://github.com/example/plugin-${index}`,
    version: '0.1.0',
    install: { type: 'package', source: `@example/plugin-${index}` },
    hasUI: false,
    category: 'capability',
    ...overrides,
  }
}

const snapshot: PluginCenterSnapshot = {
  manifest: {
    schemaVersion: '1.0',
    updatedAt: '2026-08-14T00:00:00Z',
    plugins: [
      ...Array.from({ length: 10 }, (_, index) => makePlugin(index + 1)),
      makePlugin(11, { marketingCategories: ['内容营销'] }),
      makePlugin(12, {
        id: 'ui-plugin',
        name: 'UI Plugin',
        hasUI: true,
        category: 'ui',
        marketingCategories: ['营销自动化'],
        placement: { enabled: true, slots: ['settings.sidebar', 'conversation.view'], defaultSlot: 'settings.sidebar' },
      }),
    ],
  },
  installed: [{
    pluginId: 'ui-plugin',
    packageName: '@example/plugin-12',
    moduleName: '@example/plugin-12@0.1.0',
    enabled: true,
    phase: 'active',
  }],
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
  it('renders a compact list and opens each repository from 查看', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

    expect(screen.getByRole('heading', { name: 'dsh-snapmarketing' })).toBeTruthy()
    const logo = screen.getByAltText('dsh-snapmarketing 产品 logo')
    expect(logo).toBeTruthy()
    expect(logo.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
    expect(screen.getByText('发现最好的营销插件')).toBeTruthy()
    expect(screen.getByText('12 个插件')).toBeTruthy()
    expect(document.querySelectorAll('[data-plugin-id]')).toHaveLength(10)
    expect(screen.queryByText('UI 插件')).toBeNull()
    expect(screen.queryByText('工具插件')).toBeNull()
    expect(screen.queryByText(/slot/i)).toBeNull()
    expect(screen.queryByText(/显示位置/)).toBeNull()

    const viewLink = screen.getAllByRole('link', { name: '查看' })[0]
    expect(viewLink?.getAttribute('href')).toBe('https://github.com/example/plugin-1')
    expect(viewLink?.getAttribute('target')).toBe('_blank')
  })

  it('submits search explicitly and paginates filtered results', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

    const searchbox = screen.getByRole('searchbox')
    fireEvent.change(searchbox, { target: { value: 'Plugin 11' } })
    expect(screen.getByText('Plugin 1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '搜索' }))
    expect(screen.getByText('Plugin 11')).toBeTruthy()
    expect(screen.queryByText('Plugin 1')).toBeNull()

    fireEvent.change(searchbox, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '搜索' }))
    fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))
    expect(screen.getByText('Plugin 11')).toBeTruthy()
    expect(screen.queryByText('Plugin 1')).toBeNull()
  })

  it('filters plugins by a clickable marketing category', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

    expect(screen.getByRole('button', { name: '内容营销 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '内容营销 1' }))

    expect(screen.getByText('Plugin 11')).toBeTruthy()
    expect(screen.queryByText('Plugin 1')).toBeNull()
    expect(screen.getByText('1 个插件')).toBeTruthy()
  })

  it('does not expose installed plugin category or slot metadata', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))
    expect(screen.getByText('UI Plugin')).toBeTruthy()
    expect(screen.getByRole('button', { name: '已安装' })).toBeTruthy()
    expect(screen.queryByText(/slot/i)).toBeNull()
    expect(screen.queryByText(/显示位置/)).toBeNull()
  })

  it('shows simulated progress while an install request is pending', async () => {
    let resolveInstall: ((value: PluginOperationResult) => void) | undefined
    const install = vi.fn(() => new Promise<PluginOperationResult>(resolve => { resolveInstall = resolve }))
    renderTab({ install })
    await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

    const installButton = screen.getAllByRole('button', { name: '安装' })[0]
    if (installButton === undefined) throw new Error('install button not found')
    fireEvent.click(installButton)
    expect(await screen.findByRole('progressbar', { name: 'Plugin 1 安装进度' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '安装中…' })).toBeTruthy()

    resolveInstall?.({ pluginId: 'plugin-1', status: 'failed', needsReload: false, message: '安装失败' })
    expect(await screen.findByText('安装失败')).toBeTruthy()
  })

  it('changes the install action to 已安装 after a successful refresh', async () => {
    const installedSnapshot: PluginCenterSnapshot = {
      ...snapshot,
      installed: [...snapshot.installed, {
        pluginId: 'plugin-1',
        packageName: '@example/plugin-1',
        moduleName: '@example/plugin-1@0.1.0',
        enabled: true,
        phase: 'active',
      }],
    }
    const props = renderTab({
      load: vi.fn().mockResolvedValueOnce(snapshot).mockResolvedValue(installedSnapshot),
    })
    await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

    const installButton = screen.getAllByRole('button', { name: '安装' })[0]
    expect(installButton).toBeTruthy()
    if (installButton === undefined) throw new Error('install button not found')
    fireEvent.click(installButton)
    await waitFor(() => expect(props.install).toHaveBeenCalledWith('plugin-1'))
    expect(await screen.findByRole('button', { name: '已安装' })).toBeTruthy()
  })

  it('keeps pagination compact for a large catalog', async () => {
    const largeSnapshot: PluginCenterSnapshot = {
      ...snapshot,
      manifest: {
        ...snapshot.manifest,
        plugins: Array.from({ length: 253 }, (_, index) => makePlugin(index + 1)),
      },
      installed: [],
    }
    renderTab({ load: vi.fn().mockResolvedValue(largeSnapshot) })
    await waitFor(() => expect(screen.getByText('Plugin 1')).toBeTruthy())

    expect(screen.getAllByRole('button', { name: /^第 \d+ 页$/ })).toHaveLength(4)
    expect(screen.getByText('…')).toBeTruthy()
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
    expect(injectSlot).toHaveBeenCalledWith('settings.section', expect.any(Function))
    expect(injectSlot).not.toHaveBeenCalledWith('settings.plugins.tab', expect.anything())
    const style = document.querySelector('style[data-snapmarketing-plugin-center]')
    expect(style).toBeTruthy()
    expect(style?.textContent).toContain('--dsw-alias-label-primary')
    expect(style?.textContent).toContain('display: flex')
    expect(style?.textContent).toContain('width: min(360px, 100%)')
    expect(style?.textContent).toContain('border-radius: 18px')
    expect(style?.textContent).toContain('.sm-plugin-center__brand')
    expect(style?.textContent).toContain('--dsw-alias-button-primary-fill')
    expect(style?.textContent).toContain('background: var(--dsw-alias-bg-layer-1)')
    expect(style?.textContent).not.toContain('--dsh-text')
    await dispose?.()
    expect(disposeRemote).toHaveBeenCalledOnce()
    expect(document.querySelector('style[data-snapmarketing-plugin-center]')).toBeNull()
  })

  it('registers the plugin market as a top-level settings section', async () => {
    const disposeRemote = vi.fn().mockResolvedValue(undefined)
    const register = vi.fn()
    const registrations: Array<{ name: string; callback: () => unknown }> = []
    const injectSlot = vi.fn((name: string, callback: () => unknown) => {
      registrations.push({ name, callback })
      return undefined
    })
    const ctx = {
      remote: { $mount: vi.fn().mockResolvedValue(disposeRemote) },
      get: vi.fn().mockReturnValue({
        catalog: vi.fn(),
        installed: vi.fn(),
        installPlugin: vi.fn(),
        uninstallPlugin: vi.fn(),
      }),
      slots: { inject: injectSlot, register },
    } as never

    await apply(ctx)
    registrations.find(entry => entry.name === 'settings.section')?.callback()

    expect(register).toHaveBeenCalledWith(expect.objectContaining({
      name: 'settings.section',
      id: 'plugin-market',
      order: 21,
      label: '插件市场',
    }), expect.anything())
    expect(disposeRemote).not.toHaveBeenCalled()
  })
})
