import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { filterPlugins, type PluginCategory, type PluginMetadata } from '@snapmarketing/plugin-manifest'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InstalledPlugin, PluginOperationResult, PluginCenterSnapshot } from '../types.ts'
import { PluginCard } from './PluginCard.tsx'

export interface PluginCenterTabInjected {
  readonly load: () => Promise<PluginCenterSnapshot>
  readonly install: (pluginId: string) => Promise<PluginOperationResult>
  readonly uninstall: (pluginId: string) => Promise<PluginOperationResult>
}

export type PluginCenterTabProps =
  PropsRuntime<'settings.plugins.tab'>
  & InjectFace<PluginCenterTabInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly snapshot: PluginCenterSnapshot }

const CATEGORIES: readonly { key: 'all' | PluginCategory | 'installed'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'ui', label: 'UI 插件' },
  { key: 'capability', label: '能力插件' },
  { key: 'installed', label: '已安装' },
]

/** Render the discovery and management surface inside Harness Settings. */
export function PluginCenterTab({ load, install, uninstall }: PluginCenterTabProps): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key']>('all')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  const [messages, setMessages] = useState<ReadonlyMap<string, string>>(new Map())

  const refresh = (): void => {
    setState({ status: 'loading' })
    void load().then(
      snapshot => setState({ status: 'ready', snapshot }),
      error => setState({ status: 'error', message: error instanceof Error ? error.message : String(error) }),
    )
  }

  useEffect(() => { refresh() }, [load])

  const installedIds = useMemo(() => new Set(
    state.status === 'ready' ? state.snapshot.installed.map(plugin => plugin.pluginId) : [],
  ), [state])
  const plugins = useMemo(
    () => state.status === 'ready'
      ? filterPlugins(state.snapshot.manifest.plugins, { category, query }, installedIds)
      : [],
    [category, installedIds, query, state],
  )

  const operate = (pluginId: string, action: 'install' | 'uninstall'): void => {
    if (busy.has(pluginId)) return
    setBusy(new Set([...busy, pluginId]))
    const operation = action === 'install' ? install(pluginId) : uninstall(pluginId)
    void operation.then((result) => {
      setBusy(current => new Set([...current].filter(id => id !== pluginId)))
      setMessages(current => new Map(current).set(
        pluginId,
        result.status === 'failed' ? result.message : `${result.message}${result.needsReload ? '（需要刷新 Harness）' : ''}`,
      ))
      if (result.status !== 'failed') refresh()
    }, (error) => {
      setBusy(current => new Set([...current].filter(id => id !== pluginId)))
      setMessages(current => new Map(current).set(pluginId, error instanceof Error ? error.message : String(error)))
    })
  }

  if (state.status === 'loading') return <p aria-busy="true">正在加载插件目录…</p>
  if (state.status === 'error') return <div><p role="alert">加载插件目录失败：{state.message}</p><button type="button" onClick={refresh}>重试</button></div>

  return (
    <section aria-label="Snap Plugin Marketing">
      <header>
        <h2>Snap Plugin Marketing</h2>
        <p>发现并安装 DeepSeek Harness 官方生态插件。</p>
      </header>
      <nav aria-label="插件分类">
        {CATEGORIES.map(item => (
          <button key={item.key} type="button" aria-pressed={category === item.key} onClick={() => { setCategory(item.key) }}>
            {item.label}
          </button>
        ))}
      </nav>
      <label>
        搜索插件
        <input type="search" value={query} onChange={event => { setQuery(event.currentTarget.value) }} />
      </label>
      <p>{plugins.length} 个插件</p>
      {plugins.length === 0 ? <p>没有匹配的插件。</p> : (
        <div>
          {plugins.map(plugin => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              installed={installedIds.has(plugin.id)}
              busy={busy.has(plugin.id)}
              message={messages.get(plugin.id)}
              onInstall={() => { operate(plugin.id, 'install') }}
              onUninstall={() => { operate(plugin.id, 'uninstall') }}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export type { InstalledPlugin, PluginMetadata }
