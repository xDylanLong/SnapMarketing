import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { filterPlugins, type PluginMetadata } from '@snapmarketing/plugin-manifest'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InstalledPlugin, PluginOperationResult, PluginCenterSnapshot, SnapMarketingUpdateResult, SnapMarketingUpdateStatus } from '../types.ts'
import { PluginCard, type InstallProgress } from './PluginCard.tsx'
import { SNAPMARKETING_LOGO_URL } from './logo.ts'

export interface PluginCenterTabInjected {
  readonly load: () => Promise<PluginCenterSnapshot>
  readonly install: (pluginId: string) => Promise<PluginOperationResult>
  readonly uninstall: (pluginId: string) => Promise<PluginOperationResult>
  readonly updateStatus?: () => Promise<SnapMarketingUpdateStatus>
  readonly updateSelf?: () => Promise<SnapMarketingUpdateResult>
}

export type PluginCenterTabProps =
  PropsRuntime<'settings.section'>
  & InjectFace<PluginCenterTabInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly snapshot: PluginCenterSnapshot }

const PAGE_SIZE = 10
type PaginationItem = number | 'ellipsis'

interface MarketingCategoryItem {
  readonly label: string
  readonly count: number
}

function getMarketingCategoryItems(plugins: readonly PluginMetadata[]): readonly MarketingCategoryItem[] {
  const counts = new Map<string, number>()
  for (const plugin of plugins) {
    for (const category of plugin.marketingCategories ?? []) {
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'zh-Hans-CN'))
    .map(([label, count]) => ({ label, count }))
}

function getPaginationItems(currentPage: number, pageCount: number): readonly PaginationItem[] {
  const pageNumbers = new Set<number>([1, pageCount])
  for (let pageNumber = currentPage - 2; pageNumber <= currentPage + 2; pageNumber += 1) {
    if (pageNumber > 0 && pageNumber <= pageCount) pageNumbers.add(pageNumber)
  }
  const sortedPages = [...pageNumbers].sort((left, right) => left - right)
  const items: PaginationItem[] = []
  let previousPage: number | undefined
  for (const pageNumber of sortedPages) {
    if (previousPage !== undefined && pageNumber - previousPage > 1) items.push('ellipsis')
    items.push(pageNumber)
    previousPage = pageNumber
  }
  return items
}

/** Render the discovery and management surface inside Harness Settings. */
export function PluginCenterTab({ load, install, uninstall, updateStatus, updateSelf: updateSelfRequest }: PluginCenterTabProps): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [marketingCategory, setMarketingCategory] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  const [messages, setMessages] = useState<ReadonlyMap<string, string>>(new Map())
  const [progresses, setProgresses] = useState<ReadonlyMap<string, InstallProgress>>(new Map())
  const [selfUpdate, setSelfUpdate] = useState<{
    readonly status: 'idle' | 'checking' | 'ready' | 'updating' | 'done' | 'error'
    readonly latestVersion?: string
    readonly updateAvailable?: boolean
    readonly message?: string
  }>({ status: 'idle' })
  const progressTimers = useRef(new Map<string, ReturnType<typeof setInterval>>())

  useEffect(() => () => {
    for (const timer of progressTimers.current.values()) clearInterval(timer)
    progressTimers.current.clear()
  }, [])

  const refresh = (): void => {
    setPage(1)
    setState(current => current.status === 'ready' ? current : { status: 'loading' })
    void load().then(
      snapshot => setState({ status: 'ready', snapshot }),
      error => setState({ status: 'error', message: error instanceof Error ? error.message : String(error) }),
    )
  }

  useEffect(() => { refresh() }, [load])

  const installedIds = useMemo(() => new Set(
    state.status === 'ready' ? state.snapshot.installed.map(plugin => plugin.pluginId) : [],
  ), [state])
  const marketingCategories = useMemo(
    () => state.status === 'ready' ? getMarketingCategoryItems(state.snapshot.manifest.plugins) : [],
    [state],
  )
  const plugins = useMemo(
    () => state.status === 'ready'
      ? filterPlugins(
        state.snapshot.manifest.plugins,
        { query, ...(marketingCategory === undefined ? {} : { marketingCategory }) },
        installedIds,
      )
      : [],
    [installedIds, marketingCategory, query, state],
  )
  const pageCount = Math.max(1, Math.ceil(plugins.length / PAGE_SIZE))
  const visiblePlugins = plugins.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const paginationItems = useMemo(() => getPaginationItems(page, pageCount), [page, pageCount])

  useEffect(() => {
    setPage(current => Math.min(current, pageCount))
  }, [pageCount])

  const submitSearch = (): void => {
    setQuery(queryDraft.trim())
    setPage(1)
  }

  const updateProgress = (pluginId: string, progress: InstallProgress): void => {
    setProgresses(current => new Map(current).set(pluginId, progress))
  }

  const operate = (pluginId: string): void => {
    if (busy.has(pluginId)) return
    setBusy(new Set([...busy, pluginId]))
    updateProgress(pluginId, { percent: 8, label: '准备安装…' })
    const timer = setInterval(() => {
      setProgresses(current => {
        const previous = current.get(pluginId)
        if (previous === undefined || previous.percent >= 92) return current
        const percent = Math.min(92, previous.percent + 8)
        return new Map(current).set(pluginId, {
          percent,
          label: percent < 35 ? '解析安装源…' : percent < 70 ? '下载并安装依赖…' : '注册插件…',
        })
      })
    }, 220)
    progressTimers.current.set(pluginId, timer)
    void install(pluginId).then((result) => {
      const activeTimer = progressTimers.current.get(pluginId)
      if (activeTimer !== undefined) clearInterval(activeTimer)
      progressTimers.current.delete(pluginId)
      setBusy(current => new Set([...current].filter(id => id !== pluginId)))
      setProgresses(current => new Map(current).set(pluginId, { percent: 100, label: result.status === 'failed' ? '安装失败' : '安装完成' }))
      setMessages(current => new Map(current).set(
        pluginId,
        result.status === 'failed' ? result.message : `${result.message}${result.needsReload ? '（需要刷新 Harness）' : ''}`,
      ))
      if (result.status !== 'failed') refresh()
      window.setTimeout(() => setProgresses(current => {
        const next = new Map(current)
        next.delete(pluginId)
        return next
      }), 500)
    }, (error) => {
      const activeTimer = progressTimers.current.get(pluginId)
      if (activeTimer !== undefined) clearInterval(activeTimer)
      progressTimers.current.delete(pluginId)
      setBusy(current => new Set([...current].filter(id => id !== pluginId)))
      setProgresses(current => new Map(current).set(pluginId, { percent: 100, label: '安装失败' }))
      setMessages(current => new Map(current).set(pluginId, error instanceof Error ? error.message : String(error)))
      window.setTimeout(() => setProgresses(current => {
        const next = new Map(current)
        next.delete(pluginId)
        return next
      }), 500)
    })
  }

  const checkSelfUpdate = (): void => {
    if (updateStatus === undefined || selfUpdate.status === 'checking' || selfUpdate.status === 'updating') return
    setSelfUpdate({ status: 'checking' })
    void updateStatus().then(
      result => setSelfUpdate({
        status: 'ready',
        latestVersion: result.latestVersion,
        updateAvailable: result.updateAvailable,
        message: result.updateAvailable ? `发现新版本 v${result.latestVersion}` : `当前已是最新版本 v${result.latestVersion}`,
      }),
      error => setSelfUpdate({ status: 'error', message: getUpdateErrorMessage(error) }),
    )
  }

  const runSelfUpdate = (): void => {
    if (updateSelfRequest === undefined || selfUpdate.status === 'updating') return
    setSelfUpdate({ status: 'updating' })
    void updateSelfRequest().then(
      result => setSelfUpdate({ status: result.status === 'updated' ? 'done' : 'error', updateAvailable: false, message: result.message }),
      error => setSelfUpdate({ status: 'error', message: getUpdateErrorMessage(error) }),
    )
  }

  if (state.status === 'loading') return <p aria-busy="true">正在加载插件目录…</p>
  if (state.status === 'error') return <div><p role="alert">加载插件目录失败：{state.message}</p><button type="button" onClick={refresh}>重试</button></div>

  return (
    <section className="sm-plugin-center" aria-label="插件市场">
      <header className="sm-plugin-center__brand">
        <img src={SNAPMARKETING_LOGO_URL} alt="dsh-snapmarketing 产品 logo" />
        <div className="sm-plugin-center__brand-copy">
          <h1>dsh-snapmarketing</h1>
        </div>
        {updateStatus !== undefined && updateSelfRequest !== undefined ? (
          <div className="sm-plugin-center__update">
            {selfUpdate.updateAvailable ? (
              <button className="sm-button sm-button--sm sm-button--primary" type="button" onClick={runSelfUpdate} disabled={selfUpdate.status === 'updating'}>
                {selfUpdate.status === 'updating' ? '更新中…' : `更新到 v${selfUpdate.latestVersion}`}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>
      {selfUpdate.message ? <p className={`sm-plugin-center__update-message sm-plugin-center__update-message--${selfUpdate.status}`} role={selfUpdate.status === 'error' ? 'alert' : undefined}>{selfUpdate.message}</p> : null}
      <form className="sm-plugin-center__toolbar" onSubmit={event => { event.preventDefault(); submitSearch() }}>
        <div className="sm-plugin-center__intro">
          <p>发现最好的营销插件</p>
          <span className="sm-plugin-center__count">{plugins.length} 个插件</span>
        </div>
        <div className="sm-plugin-center__search">
          <span className="sm-input">
            <input
              aria-label="搜索插件"
              type="search"
              value={queryDraft}
              onChange={event => { setQueryDraft(event.currentTarget.value) }}
            />
          </span>
          <button className="sm-button sm-button--md sm-button--primary" type="submit">搜索</button>
        </div>
      </form>
      {marketingCategories.length > 0 ? (
        <nav className="sm-plugin-center__categories" aria-label="营销场景分类">
          <button
            className="sm-filter-button"
            type="button"
            aria-pressed={marketingCategory === undefined}
            onClick={() => { setMarketingCategory(undefined); setPage(1) }}
          >
            全部 <span>{state.snapshot.manifest.plugins.length}</span>
          </button>
          {marketingCategories.map(item => (
            <button
              className="sm-filter-button"
              key={item.label}
              type="button"
              aria-label={`${item.label} ${item.count}`}
              aria-pressed={marketingCategory === item.label}
              onClick={() => { setMarketingCategory(item.label); setPage(1) }}
            >
              {item.label} <span>{item.count}</span>
            </button>
          ))}
        </nav>
      ) : null}
      {plugins.length === 0 ? <p className="sm-plugin-center__state">没有匹配的插件。</p> : (
        <>
          <div className="sm-plugin-center__grid">
            {visiblePlugins.map(plugin => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                installed={installedIds.has(plugin.id)}
                busy={busy.has(plugin.id)}
                progress={progresses.get(plugin.id)}
                message={messages.get(plugin.id)}
                onInstall={() => { operate(plugin.id) }}
              />
            ))}
          </div>
          {pageCount > 1 ? (
            <nav className="sm-plugin-center__pagination" aria-label="插件分页">
              <button className="sm-button sm-button--sm" type="button" onClick={() => { setPage(current => current - 1) }} disabled={page === 1}>上一页</button>
              {paginationItems.map((item, index) => item === 'ellipsis' ? (
                <span className="sm-plugin-center__pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
              ) : (
                  <button
                    className="sm-button sm-button--sm"
                    key={item}
                    type="button"
                    aria-current={item === page ? 'page' : undefined}
                    aria-label={`第 ${item} 页`}
                    onClick={() => { setPage(item) }}
                  >
                    {item}
                  </button>
              ))}
              <button className="sm-button sm-button--sm" type="button" onClick={() => { setPage(current => current + 1) }} disabled={page === pageCount}>下一页</button>
            </nav>
          ) : null}
        </>
      )}
    </section>
  )
}

function getUpdateErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('HTTP 404') && message.includes('/api/pluginCenter/')) {
    return '当前 Harness 尚未加载新版 dsh-snapmarketing，请重启 Harness 后重试'
  }
  return message
}

export type { InstalledPlugin, PluginMetadata }
